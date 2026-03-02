"""
Database module - SQLite3 setup and connection management
Production-safe configuration for Render deployment
"""

import os
import sqlite3
from contextlib import contextmanager

# ─────────────────────────────────────────────────────────────
# Database Path
# ─────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Allows overriding in Render via environment variable
DB_PATH = os.environ.get(
    'DB_PATH',
    os.path.join(BASE_DIR, 'collab_editor.db')
)

# Ensure directory exists (important for some deployment setups)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# ─────────────────────────────────────────────────────────────
# Database Schema
# ─────────────────────────────────────────────────────────────

SCHEMA = """
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

-- Room participants
CREATE TABLE IF NOT EXISTS room_participants (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Saved sessions
CREATE TABLE IF NOT EXISTS saved_sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);
"""

# ─────────────────────────────────────────────────────────────
# Initialization
# ─────────────────────────────────────────────────────────────

def init_db():
    """Initialize database and create tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
    print(f'[DB] Initialized successfully at {DB_PATH}')


# ─────────────────────────────────────────────────────────────
# Connection Context Manager
# ─────────────────────────────────────────────────────────────

@contextmanager
def get_db():
    """
    Yield a SQLite connection with:
    - Row factory
    - Foreign keys enabled
    - WAL journal mode
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Enforce foreign key constraints
    conn.execute('PRAGMA foreign_keys = ON')

    # Enable WAL for better concurrency
    conn.execute('PRAGMA journal_mode = WAL')

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()