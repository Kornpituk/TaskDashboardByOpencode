# Approved Architecture

## Non-Negotiable Decisions
- Stack: Next.js (App Router, TypeScript) + Go (Gin) + PostgreSQL (pgx driver)
- Auth: Login via email/password only, **no role selection UI/API parameter** – role is fetched from `users` table after successful auth
- Sessions: Server-side PostgreSQL storage, 24h expiry; frontend stores only session ID in localStorage
- Data Types:
  - `due_date`: PostgreSQL `DATE` (frontend formats to "May 10" display string)
  - `labels`: PostgreSQL `JSONB` (native JSON support)
- Prototype Setup: `docker-compose.yml` for one-command PostgreSQL launch (reduces local setup complexity)
- Visual Design: All UI except login page matches `task-dashboard.html` verbatim; login page removes role selector (approved exception)

## Orchestration Architecture
- **Orchestrator**: Integrated into Go backend as `internal/orchestrator/` package (not separate service)
- **Agent State**: Tracked in PostgreSQL `agent_state` table; all agents report status to this table
- **Workflow**: Dynamic rule-based (not static sequential); Orchestrator reads `agent_state` to determine next phase
- **Agent Dashboard**: Separate developer tool (not part of TaskFlow app); reads from `GET /api/orchestrator/agent-state`

## Architecture Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Next.js Frontend │────│  Go (Gin) API   │────│  PostgreSQL     │
│  (TypeScript)    │    │  (pgx driver)   │    │  (16-alpine)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     │  Stores session ID       │  Enforces RBAC               │  Stores users/tasks/sessions
     │  in localStorage         │  Orchestrator Layer           │  agent_state table
     │                         │  Validates sessions           │  JSONB for labels, DATE for due_date
     
┌─────────────────┐
│ Agent Dashboard │──── GET /api/orchestrator/agent-state
│ (Developer Tool)│
└─────────────────┘
```

## Component Responsibilities
- **Frontend**: Extracts 100% of CSS from `task-dashboard.html` to `styles/globals.css`; no Tailwind/custom styles. Auth state managed via React Context.
- **Backend**: Gin router, RBAC middleware checks user role from session before serving manager-only endpoints. Orchestrator package manages dynamic workflow.
- **Database**: Single PostgreSQL instance via Docker Compose for prototype scope. Stores `agent_state` table for orchestration.
- **Orchestrator**: Rule-based workflow engine in Go backend. Reads/writes `agent_state` table to track agent progress and determine next phase.

## Revised API Contract
All endpoints require `X-Session-Id` header (except login). No role parameters in requests:

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/login` | No | Any | Request: `{email, password}` (no role). Response: `{user: {id, name, role, ...}, session_id}` or 401. |
| GET | `/api/auth/me` | Yes | Any | Return current session user (includes role from DB). 401 if invalid/expired. |
| POST | `/api/auth/logout` | Yes | Any | Invalidate session. 204 response. |
| GET | `/api/tasks` | Yes | Any | Query params: `?status=in-progress`. Employees see own tasks only, managers see all. |
| GET | `/api/tasks/:id` | Yes | Any | Return single task. 404 if access denied. |
| POST | `/api/tasks` | Yes | Manager | Create task. 201 response. |
| PUT | `/api/tasks/:id` | Yes | Manager | Update task fields. 200 response. |
| GET | `/api/team` | Yes | Manager | Return team members with task counts. |
| GET | `/api/team/stats` | Yes | Manager | Return aggregate task stats. |

## Orchestrator API Contract
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orchestrator/agent-state` | No* | Return all agent states from `agent_state` table. *For prototype, no auth required for developer dashboard. |
| PUT | `/api/orchestrator/agent-state/:id` | No* | Update agent status (idle/working/done/error). Body: `{status, last_action}` |
| GET | `/api/orchestrator/workflow` | No* | Return current workflow status and next phase to execute. |
