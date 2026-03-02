"""
Real-Time Collaborative Code Editor - Flask Backend
Uses Flask-SocketIO for WebSocket communication and SQLite for persistence

Static file serving:
  In production (after `npm run build`), Flask serves the React app from
  client/dist. All unknown routes return index.html so React Router handles
  client-side navigation without 404s.

  In development, run the Vite dev server separately (npm run dev) and let
  its proxy forward /api calls to Flask on port 5000.
"""

import os
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from database import init_db, get_db

# ─── App Setup ────────────────────────────────────────────────────────────────
# Point static_folder at the React production build output.
# static_url_path="/" means Flask serves those files at the root URL.
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'client', 'dist'),
    static_url_path='/',
)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')

# Allow all origins in dev; restrict in production via env
CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))

socketio = SocketIO(
    app,
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# ─── In-Memory State (augments DB for speed) ──────────────────────────────────
# room_id -> { user_id: { username, color, cursor, sid } }
active_rooms: dict[str, dict] = {}

# sid -> { user_id, username, room_id }
connected_users: dict[str, dict] = {}

# Assign a unique color per user per room
USER_COLORS = [
    '#00ffcc', '#bf5fff', '#ff6b6b', '#ffd93d',
    '#6bcb77', '#4d96ff', '#ff922b', '#f06595',
    '#74c0fc', '#a9e34b',
]


def get_user_color(room_id: str) -> str:
    """Pick a color not already used in the room."""
    used = {u['color'] for u in active_rooms.get(room_id, {}).values()}
    for c in USER_COLORS:
        if c not in used:
            return c
    return USER_COLORS[len(active_rooms.get(room_id, {})) % len(USER_COLORS)]


# ─── REST Endpoints ───────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'time': datetime.utcnow().isoformat()})


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Register or retrieve a user by username."""
    data = request.get_json()
    username = (data.get('username') or '').strip()
    if not username or len(username) < 2:
        return jsonify({'error': 'Username must be at least 2 characters'}), 400
    if len(username) > 32:
        return jsonify({'error': 'Username too long (max 32)'}), 400

    with get_db() as db:
        # Upsert user
        existing = db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
        if existing:
            user_id = existing['id']
        else:
            user_id = str(uuid.uuid4())
            db.execute('INSERT INTO users (id, username) VALUES (?, ?)', (user_id, username))
            db.commit()

    return jsonify({'userId': user_id, 'username': username})


@app.route('/api/rooms/create', methods=['POST'])
def create_room():
    """Create a new room and return its ID."""
    data = request.get_json()
    user_id = data.get('userId')
    if not user_id:
        return jsonify({'error': 'userId required'}), 400

    room_id = str(uuid.uuid4())[:8].upper()  # Short, shareable ID

    with get_db() as db:
        # Verify user exists
        user = db.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        db.execute('INSERT INTO rooms (id, room_id, created_at) VALUES (?, ?, ?)',
                   (str(uuid.uuid4()), room_id, datetime.utcnow().isoformat()))
        db.commit()

    return jsonify({'roomId': room_id})


@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    """Get room info and last saved content."""
    with get_db() as db:
        room = db.execute('SELECT * FROM rooms WHERE room_id = ?', (room_id,)).fetchone()
        if not room:
            return jsonify({'error': 'Room not found'}), 404

        session = db.execute(
            'SELECT content FROM saved_sessions WHERE room_id = ? ORDER BY updated_at DESC LIMIT 1',
            (room_id,)
        ).fetchone()

        participants = active_rooms.get(room_id, {})
        return jsonify({
            'roomId': room_id,
            'createdAt': room['created_at'],
            'activeUsers': [
                {'userId': uid, 'username': u['username'], 'color': u['color']}
                for uid, u in participants.items()
            ],
            'lastContent': session['content'] if session else '',
        })


@app.route('/api/rooms/<room_id>/save', methods=['POST'])
def save_session(room_id):
    """Auto-save editor content (called by client every 5s)."""
    data = request.get_json()
    content = data.get('content', '')

    with get_db() as db:
        room = db.execute('SELECT id FROM rooms WHERE room_id = ?', (room_id,)).fetchone()
        if not room:
            return jsonify({'error': 'Room not found'}), 404

        existing = db.execute('SELECT id FROM saved_sessions WHERE room_id = ?', (room_id,)).fetchone()
        now = datetime.utcnow().isoformat()
        if existing:
            db.execute('UPDATE saved_sessions SET content = ?, updated_at = ? WHERE room_id = ?',
                       (content, now, room_id))
        else:
            db.execute('INSERT INTO saved_sessions (id, room_id, content, updated_at) VALUES (?, ?, ?, ?)',
                       (str(uuid.uuid4()), room_id, content, now))
        db.commit()

    return jsonify({'saved': True})


# ─── SocketIO Events ──────────────────────────────────────────────────────────

@socketio.on('connect')
def on_connect():
    print(f'[WS] Client connected: {request.sid}')


@socketio.on('disconnect')
def on_disconnect():
    sid = request.sid
    user_info = connected_users.pop(sid, None)
    if not user_info:
        return

    room_id = user_info['room_id']
    user_id = user_info['user_id']

    # Remove from active room
    if room_id in active_rooms:
        active_rooms[room_id].pop(user_id, None)
        if not active_rooms[room_id]:
            del active_rooms[room_id]

    # Notify others
    emit('user_left', {
        'userId': user_id,
        'username': user_info['username'],
        'activeUsers': [
            {'userId': uid, 'username': u['username'], 'color': u['color']}
            for uid, u in active_rooms.get(room_id, {}).items()
        ]
    }, room=room_id)

    print(f'[WS] {user_info["username"]} left room {room_id}')


@socketio.on('join_room')
def on_join_room(data):
    """User joins a coding room."""
    sid = request.sid
    room_id = data.get('roomId', '').strip().upper()
    user_id = data.get('userId')
    username = data.get('username', 'Anonymous')

    if not room_id or not user_id:
        emit('error', {'message': 'roomId and userId required'})
        return

    # Validate room exists
    with get_db() as db:
        room = db.execute('SELECT id FROM rooms WHERE room_id = ?', (room_id,)).fetchone()
        if not room:
            emit('error', {'message': 'Room not found'})
            return
        # Load last saved content
        session = db.execute(
            'SELECT content FROM saved_sessions WHERE room_id = ? ORDER BY updated_at DESC LIMIT 1',
            (room_id,)
        ).fetchone()
        last_content = session['content'] if session else ''

    # Register in active rooms
    color = get_user_color(room_id)
    if room_id not in active_rooms:
        active_rooms[room_id] = {}
    active_rooms[room_id][user_id] = {'username': username, 'color': color, 'sid': sid}

    # Track connection
    connected_users[sid] = {'user_id': user_id, 'username': username, 'room_id': room_id}

    join_room(room_id)

    # Send current state to the joining user
    emit('room_joined', {
        'roomId': room_id,
        'userId': user_id,
        'color': color,
        'initialContent': last_content,
        'activeUsers': [
            {'userId': uid, 'username': u['username'], 'color': u['color']}
            for uid, u in active_rooms[room_id].items()
        ]
    })

    # Notify others that someone joined
    emit('user_joined', {
        'userId': user_id,
        'username': username,
        'color': color,
        'activeUsers': [
            {'userId': uid, 'username': u['username'], 'color': u['color']}
            for uid, u in active_rooms[room_id].items()
        ]
    }, room=room_id, include_self=False)

    print(f'[WS] {username} joined room {room_id}')


@socketio.on('code_change')
def on_code_change(data):
    """Broadcast code changes to all room participants except sender."""
    sid = request.sid
    user_info = connected_users.get(sid)
    if not user_info:
        return

    room_id = user_info['room_id']
    # Broadcast to room excluding sender to prevent echo loop
    emit('code_update', {
        'content': data.get('content', ''),
        'userId': user_info['user_id'],
    }, room=room_id, include_self=False)


@socketio.on('cursor_change')
def on_cursor_change(data):
    """Broadcast cursor position to room."""
    sid = request.sid
    user_info = connected_users.get(sid)
    if not user_info:
        return

    room_id = user_info['room_id']
    emit('cursor_update', {
        'userId': user_info['user_id'],
        'username': user_info['username'],
        'position': data.get('position'),
        'color': active_rooms.get(room_id, {}).get(user_info['user_id'], {}).get('color', '#00ffcc'),
    }, room=room_id, include_self=False)


@socketio.on('typing_start')
def on_typing_start(data):
    sid = request.sid
    user_info = connected_users.get(sid)
    if not user_info:
        return
    emit('user_typing', {
        'userId': user_info['user_id'],
        'username': user_info['username'],
        'isTyping': True,
    }, room=user_info['room_id'], include_self=False)


@socketio.on('typing_stop')
def on_typing_stop(data):
    sid = request.sid
    user_info = connected_users.get(sid)
    if not user_info:
        return
    emit('user_typing', {
        'userId': user_info['user_id'],
        'username': user_info['username'],
        'isTyping': False,
    }, room=user_info['room_id'], include_self=False)

init_db()

# ─── SPA Fallback — must come AFTER all /api routes ───────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    """
    Serve the React SPA for every non-API route.

    1. If 'path' matches a real file in client/dist (e.g. assets/index-abc.js),
       send that file directly so hashed JS/CSS bundles load correctly.
    2. Otherwise fall back to index.html and let React Router take over.
    """
    static_dir = app.static_folder
    if path and os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, 'index.html')


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port)
