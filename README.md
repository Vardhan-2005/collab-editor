# CodeSync — Real-Time Collaborative Code Editor

A full-stack, real-time collaborative code editor built with React + Monaco Editor on the frontend and Flask + SocketIO on the backend.

```
collab-editor/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx      # Username + room create/join
│   │   │   └── EditorPage.jsx     # Full-screen editor with sidebar
│   │   ├── components/
│   │   │   ├── UserList.jsx       # Active collaborators sidebar
│   │   │   └── Notifications.jsx  # Join/leave toasts
│   │   ├── hooks/
│   │   │   ├── useSocket.js       # SocketIO room management
│   │   │   └── useAutoSave.js     # 5-second auto-save
│   │   ├── utils/
│   │   │   ├── socket.js          # Socket singleton
│   │   │   └── api.js             # REST API helpers
│   │   ├── App.jsx                # Top-level router
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                  # Flask + SocketIO backend
    ├── app.py               # Main server, REST routes, WS events
    ├── database.py          # SQLite setup + connection helpers
    ├── requirements.txt
    └── .env.example
```

---

## Features

- **Real-time sync** — Code changes broadcast instantly via WebSockets
- **User presence** — See who's in the room with unique color-coded avatars
- **Typing indicators** — Animated dots when collaborators are typing
- **Join/leave notifications** — Smooth toast animations
- **Auto-save** — Editor content persisted to SQLite every 5 seconds
- **Session restore** — Returning users get last saved content
- **Multi-language** — Monaco supports JS, TS, Python, Rust, Go, C++, and more
- **Echo prevention** — Remote updates don't re-broadcast back (no infinite loops)
- **Glassmorphism UI** — Deep slate dark theme with neon cyan/violet accents

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- pip

---

## Quick Start

### 1. Clone / unzip the project

```bash
cd collab-editor
```

### 2. Set up the Backend

```bash
cd server

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit env vars (optional for dev)
cp .env.example .env

# Run the server
python app.py
```

The server starts at **http://localhost:5000**  
SQLite database is auto-created at `server/collab_editor.db`

### 3. Set up the Frontend (new terminal)

```bash
cd client

# Install dependencies
npm install

# Copy env vars
cp .env.example .env

# Start dev server
npm run dev
```

The app opens at **http://localhost:5173**

---

## Usage

1. Open **http://localhost:5173** in multiple browser tabs
2. Enter a username in each tab
3. In one tab, click **Create New Room** — copy the 8-character Room ID
4. In other tabs, paste the Room ID and click **Join**
5. Start coding — changes sync instantly across all connected clients

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Register/retrieve user by username |
| POST | `/api/rooms/create` | Create a new room |
| GET | `/api/rooms/:roomId` | Get room info + active users |
| POST | `/api/rooms/:roomId/save` | Save editor content |
| GET | `/api/health` | Health check |

## WebSocket Events

| Event (Client → Server) | Payload | Description |
|--------------------------|---------|-------------|
| `join_room` | `{ roomId, userId, username }` | Join a coding room |
| `code_change` | `{ content }` | Broadcast code update |
| `cursor_change` | `{ position }` | Share cursor position |
| `typing_start` | `{}` | User started typing |
| `typing_stop` | `{}` | User stopped typing |

| Event (Server → Client) | Description |
|--------------------------|-------------|
| `room_joined` | Initial room state + content |
| `user_joined` | Another user entered |
| `user_left` | User disconnected |
| `code_update` | Remote code change |
| `user_typing` | Typing indicator update |
| `cursor_update` | Remote cursor position |

---

## Database Schema

```sql
users             (id, username, created_at)
rooms             (id, room_id, created_at)
room_participants (id, room_id, user_id, joined_at)
saved_sessions    (id, room_id, content, updated_at)
```

---

## Production Build

```bash
# Build frontend
cd client && npm run build

# Serve with gunicorn (install separately)
cd server
pip install gunicorn
gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
         --workers 1 --bind 0.0.0.0:5000 app:app
```

---

## Environment Variables

### Server (`server/.env`)
```
FLASK_ENV=production
SECRET_KEY=your-secret-key
PORT=5000
DB_PATH=./collab_editor.db
ALLOWED_ORIGINS=https://yourdomain.com
```

### Client (`client/.env`)
```
VITE_SERVER_URL=https://your-api-domain.com
```

---

## Roadmap / Future Additions

- [ ] WebRTC peer-to-peer voice chat
- [ ] Real cursor position tracking in Monaco
- [ ] Operational Transform or CRDT for conflict-free editing
- [ ] Password-protected rooms
- [ ] File tree / multiple files per room
- [ ] Git integration
