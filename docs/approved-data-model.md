# Approved Data Model

## PostgreSQL Schema
Exact field mapping to prototype data, using approved data types:

```sql
-- Users (role comes from this table, not user input)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT CHECK(role IN ('employee', 'manager')) NOT NULL,
  avatar_class TEXT NOT NULL,
  team_leader BOOLEAN DEFAULT FALSE,
  password_hash TEXT NOT NULL, -- bcrypt hash of "password" for prototype
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (due_date is DATE, labels is JSONB)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('Backlog', 'Todo', 'In Progress', 'Done')) NOT NULL,
  priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  due_date DATE, -- Native date type, frontend formats to "May 10"
  labels JSONB, -- e.g., '["auth", "security"]'
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (server-side persistence)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL, -- CURRENT_TIMESTAMP + 24h
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_owner ON tasks(owner_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- Agent State (for Orchestration)
CREATE TABLE agent_state (
  agent_id TEXT PRIMARY KEY, -- e.g., 'database-agent', 'backend-agent', 'frontend-agent'
  current_phase TEXT NOT NULL,
  status TEXT CHECK(status IN ('idle', 'working', 'done', 'error')) NOT NULL,
  last_action TEXT,
  error_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## Data Type Notes
- `due_date`: Stored as PostgreSQL `DATE`, frontend converts to "Mon DD" format (e.g., "May 10") for display
- `labels`: Stored as `JSONB` for native JSON querying, matches prototype array format
- `password_hash`: Bcrypt hash of "password" for prototype scope, no real password complexity required
- `comments_count`: Integer matching prototype's `comments` field
- `created_at`/`updated_at`: TIMESTAMPTZ, maps to prototype's `created`/`updated` display strings
