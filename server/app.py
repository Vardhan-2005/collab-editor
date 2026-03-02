"""
Real-Time Collaborative Code Editor - Flask Backend
Uses Flask-SocketIO for WebSocket communication and SQLite for persistence
"""

import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from database import init_db, get_db

# ─── App Setup ─────────────────────────────────────────────

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'client', 'dist'),
    static_url_path='/',
)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')
CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))

socketio = SocketIO(
    app,
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# ✅ IMPORTANT: Initialize DB on startup
with app.app_context():
    init_db()

# ─── In-Memory State ───────────────────────────────────────

active_rooms: dict[str, dict] = {}
connected_users: dict[str, dict] = {}
edit_locks: dict[str, str | None] = {}

USER_COLORS = [
    '#00ffcc', '#bf5fff', '#ff6b6b', '#ffd93d',
    '#6bcb77', '#4d96ff', '#ff922b', '#f06595',
    '#74c0fc', '#a9e34b',
]


def get_user_color(room_id: str) -> str:
    used = {u['color'] for u in active_rooms.get(room_id, {}).values()}
    for c in USER_COLORS:
        if c not in used:
            return c
    return USER_COLORS[len(active_rooms.get(room_id, {})) % len(USER_COLORS)]


# ─── REST Endpoints ────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'time': datetime.utcnow().isoformat()})


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = (data.get('username') or '').strip()

    if not username or len(username) < 2:
        return jsonify({'error': 'Username must be at least 2 characters'}), 400

    with get_db() as db:
        existing = db.execute(
            'SELECT id FROM users WHERE username = ?',
            (username,)
        ).fetchone()

        if existing:
            user_id = existing['id']
        else:
            user_id = str(uuid.uuid4())
            db.execute(
                'INSERT INTO users (id, username) VALUES (?, ?)',
                (user_id, username)
            )
            db.commit()

    return jsonify({'userId': user_id, 'username': username})


@app.route('/api/rooms/create', methods=['POST'])
def create_room():
    data = request.get_json()
    user_id = data.get('userId')

    room_id = str(uuid.uuid4())[:8].upper()

    with get_db() as db:
        db.execute(
            'INSERT INTO rooms (id, room_id, created_at) VALUES (?, ?, ?)',
            (str(uuid.uuid4()), room_id, datetime.utcnow().isoformat())
        )
        db.commit()

    return jsonify({'roomId': room_id})


@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    with get_db() as db:
        room = db.execute(
            'SELECT * FROM rooms WHERE room_id = ?',
            (room_id,)
        ).fetchone()

        if not room:
            return jsonify({'error': 'Room not found'}), 404

        session = db.execute(
            '''
            SELECT content FROM saved_sessions
            WHERE room_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
            ''',
            (room_id,)
        ).fetchone()

    return jsonify({
        'roomId': room_id,
        'createdAt': room['created_at'],
        'lastContent': session['content'] if session else '',
    })


# ─── SocketIO Events ───────────────────────────────────────

@socketio.on('connect')
def on_connect():
    print(f'[WS] Connected: {request.sid}')


@socketio.on('disconnect')
def on_disconnect():
    sid = request.sid
    user_info = connected_users.pop(sid, None)
    if not user_info:
        return

    room_id = user_info['room_id']
    user_id = user_info['user_id']

    if room_id in active_rooms:
        active_rooms[room_id].pop(user_id, None)

    if edit_locks.get(room_id) == user_id:
        edit_locks[room_id] = None
        emit('edit_access_changed', {'userId': None}, room=room_id)

    emit('user_left', {'userId': user_id}, room=room_id)


@socketio.on('join_room')
def on_join_room(data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    username = data.get('username')

    join_room(room_id)

    if room_id not in active_rooms:
        active_rooms[room_id] = {}

    active_rooms[room_id][user_id] = {
        'username': username,
        'color': get_user_color(room_id),
        'sid': request.sid
    }

    connected_users[request.sid] = {
        'user_id': user_id,
        'username': username,
        'room_id': room_id
    }

    emit('room_joined', {'roomId': room_id})
    emit('edit_access_changed', {'userId': edit_locks.get(room_id)})


@socketio.on('code_change')
def on_code_change(data):
    sid = request.sid
    user_info = connected_users.get(sid)
    if not user_info:
        return

    emit('code_update', {
        'content': data.get('content'),
        'userId': user_info['user_id']
    }, room=user_info['room_id'], include_self=False)


@socketio.on('request_edit_access')
def handle_request_edit_access():
    sid = request.sid
    user_info = connected_users.get(sid)
    if not user_info:
        return

    room_id = user_info['room_id']
    user_id = user_info['user_id']

    if not edit_locks.get(room_id):
        edit_locks[room_id] = user_id
        emit('edit_access_changed', {'userId': user_id}, room=room_id)


@socketio.on('release_edit_access')
def handle_release_edit_access():
    sid = request.sid
    user_info = connected_users.get(sid)
    if not user_info:
        return

    room_id = user_info['room_id']
    user_id = user_info['user_id']

    if edit_locks.get(room_id) == user_id:
        edit_locks[room_id] = None
        emit('edit_access_changed', {'userId': None}, room=room_id)


# ─── SPA Fallback ─────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    static_dir = app.static_folder
    if path and os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, 'index.html')


# ─── Entry Point ──────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port)