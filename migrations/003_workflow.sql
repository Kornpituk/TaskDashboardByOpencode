-- Tracks each execution of an agent within a workflow
CREATE TABLE agent_runs (
  run_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'running', 'success', 'failed', 'skipped', 'cancelled')) NOT NULL DEFAULT 'pending',
  input JSONB,
  output JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Structured logs from agent execution
CREATE TABLE agent_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(run_id),
  agent_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'debug', 'success')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Stores input/output artifacts from agent runs
CREATE TABLE agent_artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(run_id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_agent_runs_workflow ON agent_runs(workflow_id);
CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_logs_run ON agent_logs(run_id);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at);
CREATE INDEX idx_agent_artifacts_run ON agent_artifacts(run_id);
