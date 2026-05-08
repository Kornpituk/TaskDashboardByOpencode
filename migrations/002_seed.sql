-- Precomputed bcrypt hash for password "password" (cost 12)
-- Generated: $2b$12$kv5TNz6TSA97P9IulvIjdu8ARCNvRJAX6Bssf0rBxxyw/u.UjA01O

-- Seed users from docs/seed-data.json
INSERT INTO users (id, email, name, initials, role, avatar_class, team_leader, password_hash) VALUES
  ('U001', 'alex@company.com', 'Alex Kim', 'AK', 'employee', 'avatar-1', FALSE, '$2b$12$kv5TNz6TSA97P9IulvIjdu8ARCNvRJAX6Bssf0rBxxyw/u.UjA01O'),
  ('U002', 'maria@company.com', 'Maria Jensen', 'MJ', 'employee', 'avatar-2', FALSE, '$2b$12$kv5TNz6TSA97P9IulvIjdu8ARCNvRJAX6Bssf0rBxxyw/u.UjA01O'),
  ('U003', 'ryan@company.com', 'Ryan Lee', 'RL', 'employee', 'avatar-3', FALSE, '$2b$12$kv5TNz6TSA97P9IulvIjdu8ARCNvRJAX6Bssf0rBxxyw/u.UjA01O'),
  ('U004', 'sam@company.com', 'Sam Hill', 'SH', 'employee', 'avatar-4', FALSE, '$2b$12$kv5TNz6TSA97P9IulvIjdu8ARCNvRJAX6Bssf0rBxxyw/u.UjA01O'),
  ('M001', 'manager@company.com', 'Jordan Chen', 'JC', 'manager', 'avatar-1', TRUE, '$2b$12$kv5TNz6TSA97P9IulvIjdu8ARCNvRJAX6Bssf0rBxxyw/u.UjA01O')
ON CONFLICT (id) DO NOTHING;

-- Seed tasks from docs/seed-data.json
INSERT INTO tasks (id, title, description, status, priority, owner_id, due_date, labels, comments_count, created_at, updated_at) VALUES
  ('TASK-101', 'Implement user authentication flow', 'Implement OAuth 2.0 authentication flow with support for Google and GitHub providers.', 'In Progress', 'High', 'U001', '2026-05-10', '["authentication", "security"]'::jsonb, 3, '2026-05-01', '2026-05-06'),
  ('TASK-100', 'Design system color tokens', 'Define complete color token system including semantic colors.', 'Done', 'Medium', 'U002', '2026-05-08', '["design"]'::jsonb, 1, '2026-04-28', '2026-05-08'),
  ('TASK-99', 'API rate limiting middleware', 'Create middleware for API rate limiting.', 'Todo', 'High', 'U003', '2026-05-15', '["backend"]'::jsonb, 0, '2026-05-03', '2026-05-03'),
  ('TASK-98', 'Update documentation for v2 API', 'Update API documentation to reflect v2 changes.', 'Todo', 'Low', 'U004', '2026-05-20', '["docs"]'::jsonb, 0, '2026-05-02', '2026-05-02'),
  ('TASK-97', 'Performance optimization for dashboard', 'Optimize dashboard rendering performance.', 'In Progress', 'High', 'U001', '2026-05-05', '["performance"]'::jsonb, 5, '2026-04-25', '2026-05-05'),
  ('TASK-96', 'Mobile responsive fixes', 'Fix layout issues on mobile devices.', 'Backlog', 'Medium', 'U002', '2026-05-25', '["mobile"]'::jsonb, 2, '2026-04-30', '2026-04-30'),
  ('TASK-95', 'Add unit tests for auth module', 'Write comprehensive unit tests for auth module.', 'Done', 'Medium', 'U003', '2026-05-06', '["testing"]'::jsonb, 0, '2026-04-29', '2026-05-06'),
  ('TASK-94', 'Investigate memory leak in worker', 'Debug and fix memory leak in worker.', 'In Progress', 'High', 'U004', '2026-05-12', '["backend"]'::jsonb, 4, '2026-05-01', '2026-05-07'),
  ('TASK-93', 'Review pull request #247', 'Code review for PR #247.', 'Todo', 'Low', 'U001', '2026-05-18', '["review"]'::jsonb, 0, '2026-05-05', '2026-05-05'),
  ('TASK-92', 'Refactor database queries', 'Refactor N+1 queries.', 'Backlog', 'Medium', 'U002', '2026-06-01', '["backend"]'::jsonb, 1, '2026-05-04', '2026-05-04'),
  ('TASK-91', 'Setup CI/CD pipeline for staging', 'Set up continuous deployment pipeline.', 'Done', 'High', 'U003', '2026-05-03', '["devops"]'::jsonb, 2, '2026-04-27', '2026-05-03'),
  ('TASK-90', 'Fix broken links in help center', 'Audit and fix broken links.', 'Done', 'Low', 'U004', '2026-05-07', '["docs"]'::jsonb, 0, '2026-05-02', '2026-05-07')
ON CONFLICT (id) DO NOTHING;

-- Seed agent states for Orchestration
INSERT INTO agent_state (agent_id, current_phase, status, last_action, updated_at) VALUES
  ('audit-agent', 'phase-1', 'done', 'Completed full codebase audit and documented architecture.', NOW()),
  ('db-agent', 'phase-2', 'done', 'Schema migrations and seed data applied successfully.', NOW()),
  ('api-agent', 'phase-3', 'done', 'Backend API endpoints for Auth, Tasks, and Team implemented.', NOW()),
  ('ui-agent', 'phase-4', 'working', 'Implementing core layout and dashboard views.', NOW()),
  ('component-agent', 'phase-5', 'idle', 'Waiting for core layout completion.', NOW()),
  ('orch-agent', 'phase-6', 'idle', 'Orchestrator logic pending integration.', NOW())
ON CONFLICT (agent_id) DO UPDATE SET
  current_phase = EXCLUDED.current_phase,
  status = EXCLUDED.status,
  last_action = EXCLUDED.last_action,
  updated_at = EXCLUDED.updated_at;
