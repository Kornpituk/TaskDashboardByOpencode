# Agent Orchestration Engine — Build Plan

> อ่านก่อนเริ่มทำงาน! ไฟล์นี้เป็น log สำหรับ AI ครั้งต่อไปที่มาแก้โปรเจคนี้
> ว่าเรากำลังทำอะไร ตอนนี้ค้างไว้ตรงไหน ต้องทำอะไรต่อ

---

## 🎯 เป้าหมาย

เปลี่ยน Agent Orchestration จาก **"Read-only Status Dashboard"** 
เป็น **"Full Orchestration Engine"** ที่:
- มี Agent Runtime จริง (execute agent ใน Go goroutine)
- Workflow Engine แบบ DAG (dependency graph, parallel execution)
- Artifact Store (เก็บ input/output ของ agent)
- Real-time UI via WebSocket (push แทน polling)
- Interactive Controls (Start/Stop/Retry agent จาก UI)

## 🧱 Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Next.js Frontend                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ DAG View │ │ Log View │ │ Control Panel ││
│  └─────▲────┘ └────▲─────┘ └──────▲───────┘│
│        │            │              │        │
│        └────────────┴──────────────┘        │
│                   │ WebSocket               │
└───────────────────┼─────────────────────────┘
                    │
┌───────────────────┼─────────────────────────┐
│         Go Backend (Gin)                    │
│  ┌────────────────┴─────────────────────┐   │
│  │         Orchestrator Engine           │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────┐  │   │
│  │  │Workflow │  │  Agent   │  │Job   │  │   │
│  │  │Engine   │──│  Runner  │──│Queue │  │   │
│  │  └────┬────┘  └────┬─────┘  └─────┘  │   │
│  │       │            │                  │   │
│  │  ┌────▼────────────▼─────┐            │   │
│  │  │   Artifact Store      │            │   │
│  │  └───────────────────────┘            │   │
│  └────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐                    │
│  │WebSocket │ │  REST    │                    │
│  │ Hub      │ │  API     │                    │
│  └──────────┘ └──────────┘                    │
└───────────────────┼───────────────────────────┘
                    │
┌───────────────────┼───────────────────────────┐
│            PostgreSQL                         │
│  ┌──────────────┐ ┌──────────────┐            │
│  │ agent_state  │ │ agent_logs   │            │
│  ├──────────────┤ ├──────────────┤            │
│  │ agent_runs   │ │ agent_artifacts│           │
│  └──────────────┘ └──────────────┘            │
└───────────────────────────────────────────────┘
```

---

## 📦 สิ่งที่ต้องสร้าง (Files)

### Backend — Go (`internal/orchestrator/`)

| File | Status | Description |
|------|--------|-------------|
| `agent.go` | 🟡 Building | Agent interface + types + registry |
| `artifact.go` | 🟡 Building | Artifact store (PostgreSQL) |
| `workflow.go` | 🟡 Building | Workflow engine (DAG, dependency resolution) |
| `runner.go` | 🟡 Building | Job runner (worker pool, retry, queue) |
| `websocket.go` | 🟡 Building | WebSocket hub (broadcast, channels) |
| `store.go` | 🟢 Exists | Existing agent state CRUD |
| `agents/` (dir) | 🟡 Building | Built-in agent implementations |

### Backend — Migrations

| File | Status | Description |
|------|--------|-------------|
| `001_init.sql` | 🟢 Exists | users, tasks, sessions, agent_state |
| `002_seed.sql` | 🟢 Exists | Seed data |
| `003_workflow.sql` | 🟡 Building | agent_runs, agent_logs, agent_artifacts |

### Frontend — Next.js

| File | Status | Description |
|------|--------|-------------|
| `lib/websocket.ts` | 🟡 Building | WebSocket hook + connection manager |
| `components/orchestrator/WorkflowDAG.tsx` | 🟡 Building | DAG visualization |
| `components/orchestrator/AgentControls.tsx` | 🟡 Building | Start/Stop/Retry buttons |
| `components/orchestrator/LogViewer.tsx` | 🟡 Building | Real-time log viewer |
| `components/orchestrator/ArtifactInspector.tsx` | 🟡 Building | View agent I/O |
| `components/orchestrator/RunHistory.tsx` | 🟡 Building | Execution history |
| `app/orchestrator/page.tsx` | 🔄 Updating | Integrate new components |

---

## 📋 สถานะปัจจุบัน (Current Status)

**Started:** May 8, 2026
**Phase:** Initial implementation (all files being built in parallel)
**Remaining:** All files listed above + integration + testing

### ✅ เสร็จแล้ว (Completed)
- Existing agent state CRUD (store.go, handlers, routes)
- Read-only orchestrator dashboard (polling every 3s)

### 🟡 กำลังทำ (In Progress)
- All files above marked as Building

### ⬜ ยังไม่เริ่ม (Not Started)

---

## 📝 ข้อควรรู้สำหรับ AI คนต่อไป

### Code Conventions
- **Go:** Gin framework, pgx v5 for PostgreSQL, standard project layout
- **Frontend:** Next.js 16.2.5 (⚠️ มี breaking changes!), React 19, Tailwind CSS v4
- **Read `frontend/AGENTS.md`** ก่อนเขียน Frontend — มี Next.js migration notes
- Module path: `github.com/anomalyco/taskdashboard`

### Key Decisions
1. **Agent Runtime:** In-process goroutines (not separate microservices) — simpler for prototype
2. **WebSocket:** `github.com/gorilla/websocket` — standard Go WebSocket library (add to go.mod)
3. **No auth on Orchestrator** — developer tool, prototype scope
4. **Artifacts as JSONB** — stored in PostgreSQL, not S3/file system (prototype scope)
5. **6 sample agents** matching existing seed data: audit-agent, db-agent, api-agent, ui-agent, component-agent, orch-agent

### How to Run & Verify
```bash
# Start PostgreSQL
docker compose up -d

# Run migrations
# (connect to pg and run migration files)

# Start Go backend
DATABASE_URL=postgres://postgres:password@localhost:5434/taskflow go run ./cmd/server

# Start frontend
cd frontend && npm run dev

# Access
# Main dashboard: http://localhost:3000
# Orchestrator:  http://localhost:3000/orchestrator
```

---

## 🔄 งานต่อจากนี้ (Next Steps for Next AI)

1. ✅ Verify Go build passes (`go build ./...`)
2. ✅ Verify Frontend build passes (`cd frontend && npm run build`)
3. ✅ Fix any compilation errors
4. ⬜ Start PostgreSQL, run new migration 003
5. ⬜ Test end-to-end: backend → DB → frontend
6. ⬜ Add tests for Workflow Engine (critical path)
7. ⬜ Add more built-in agents
8. ⬜ Add authentication to orchestrator (optional)
9. ⬜ Replace polling with WebSocket in main page (optional)
