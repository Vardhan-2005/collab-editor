"""
Database module - SQLite3 setup and connection management
"""

import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'collab_editor.db'))

SCHEMA = """
-- Users table: stores authenticated users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Rooms table: tracks created rooms
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

-- Room participants: historical join records
CREATE TABLE IF NOT EXISTS room_participants (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Saved sessions: persists editor content per room
CREATE TABLE IF NOT EXISTS saved_sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);
"""


def init_db():
    """Create tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
    print(f'[DB] Initialized at {DB_PATH}')


@contextmanager
def get_db():
    """Yield a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')  # Better concurrent read performance
    try:
        yield conn
    finally:
        conn.close()
