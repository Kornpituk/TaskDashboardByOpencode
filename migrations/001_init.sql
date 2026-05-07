-- Users table (role comes from this table, not user input)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT CHECK(role IN ('employee', 'manager')) NOT NULL,
  avatar_class TEXT NOT NULL,
  team_leader BOOLEAN DEFAULT FALSE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (due_date is DATE, labels is JSONB)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('Backlog', 'Todo', 'In Progress', 'Done')) NOT NULL,
  priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  due_date DATE,
  labels JSONB,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (server-side persistence)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_owner ON tasks(owner_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
