'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { api, Task, TeamMember, TeamStats } from '@/lib/api';
import TaskPanel from '@/components/TaskPanel';

export default function Home() {
  const { user, sessionId, loading, logout } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && sessionId) {
      loadTasks();
      if (user.role === 'manager') {
        loadTeamData();
      }
    }
  }, [user, sessionId, activeFilter]);

  async function loadTasks() {
    if (!sessionId) return;
    try {
      const statusFilter = activeFilter === 'all' ? undefined :
        activeFilter === 'in-progress' ? 'In Progress' :
        activeFilter === 'todo' ? 'Todo' :
        activeFilter === 'done' ? 'Done' :
        activeFilter === 'backlog' ? 'Backlog' : undefined;
      const data = await api.getTasks(sessionId, statusFilter);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }

  async function loadTeamData() {
    if (!sessionId) return;
    try {
      const [teamData, statsData] = await Promise.all([
        api.getTeam(sessionId),
        api.getTeamStats(sessionId),
      ]);
      setTeam(teamData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load team data:', err);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  function openTask(task: Task) {
    setSelectedTask(task);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setSelectedTask(null);
  }

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && panelOpen) {
        closePanel();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [panelOpen]);

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const myTasks = tasks.filter(t => t.owner_id === user.id || t.owner === user.name);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="logo">TaskFlow</div>
          <div className="project-badge">
            <span className="project-dot"></span>
            <span className="project-name">Project Alpha</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.5">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
        <div className="header-right">
          <div className="user-menu">
            <div className={`user-avatar ${user.avatar_class}`}>
              {user.initials}
            </div>
            <span>{user.name}</span>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M5 8h10" />
            </svg>
          </button>
        </div>
      </header>

      {user.role === 'manager' ? (
        <ManagerView
          tasks={tasks}
          team={team}
          stats={stats}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onTaskClick={openTask}
        />
      ) : (
        <EmployeeView
          tasks={myTasks}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onTaskClick={openTask}
        />
      )}

      {panelOpen && selectedTask && (
        <>
          <div className="panel-overlay open" onClick={closePanel}></div>
          <TaskPanel task={selectedTask} onClose={closePanel} />
        </>
      )}
    </>
  );
}

function EmployeeView({
  tasks,
  activeFilter,
  setActiveFilter,
  onTaskClick,
}: {
  tasks: Task[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  onTaskClick: (task: Task) => void;
}) {
  const filters = [
    { key: 'all', label: 'My Tasks', count: tasks.length },
    { key: 'in-progress', label: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length },
    { key: 'done', label: 'Done', count: tasks.filter(t => t.status === 'Done').length },
    { key: 'todo', label: 'Todo', count: tasks.filter(t => t.status === 'Todo').length },
  ];

  return (
    <div id="employeeView">
      <nav className="filters">
        {filters.map(f => (
          <div
            key={f.key}
            className={`filter-tab ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label} <span className="filter-count">{f.count}</span>
          </div>
        ))}
      </nav>

      <main className="content">
        <div className="content-header">
          <h1 className="content-title">My Tasks</h1>
          <p className="content-subtitle">You have {tasks.length} active tasks</p>
        </div>

        <div className="table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>ID</th>
                <th>Task</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '90px' }}>Priority</th>
                <th style={{ width: '100px' }}>Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} onClick={() => onTaskClick(task)}>
                  <td className="task-id">{task.id}</td>
                  <td className="task-title">{task.title}</td>
                  <td>
                    <StatusBadge status={task.status} />
                  </td>
                  <td>
                    <PriorityDisplay priority={task.priority} />
                  </td>
                  <td className={`due-date ${getDueDateClass(task.due_date)}`}>
                    {formatDate(task.due_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function ManagerView({
  tasks,
  team,
  stats,
  activeFilter,
  setActiveFilter,
  onTaskClick,
}: {
  tasks: Task[];
  team: TeamMember[];
  stats: TeamStats | null;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  onTaskClick: (task: Task) => void;
}) {
  const filters = [
    { key: 'all', label: 'Team', count: tasks.length },
    { key: 'in-progress', label: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length },
    { key: 'done', label: 'Done', count: tasks.filter(t => t.status === 'Done').length },
    { key: 'overdue', label: 'Overdue', count: tasks.filter(t => new Date(t.due_date) < new Date()).length },
  ];

  return (
    <div id="managerView">
      <nav className="filters">
        {filters.map(f => (
          <div
            key={f.key}
            className={`filter-tab ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label} <span className="filter-count">{f.count}</span>
          </div>
        ))}
      </nav>

      <main className="content">
        <div className="content-header">
          <h1 className="content-title">Team Overview</h1>
          <p className="content-subtitle">{team.length} team members • {tasks.length} total tasks</p>
        </div>

        {stats && (
          <div className="stats-grid">
            <StatCard label="Total Tasks" value={stats.total_tasks} change="+3 this week" changeType="positive" />
            <StatCard label="In Progress" value={stats.in_progress} change="Active now" />
            <StatCard label="Completed" value={stats.done} change="+5 this week" changeType="positive" />
            <StatCard label="Backlog" value={stats.backlog} change="Pending" />
          </div>
        )}

        <div className="content-header">
          <h2 className="content-title" style={{ fontSize: '20px' }}>Team Members</h2>
        </div>

        <div className="team-grid">
          {team.map(member => (
            <EmployeeCard key={member.id} member={member} onTaskClick={onTaskClick} />
          ))}
        </div>

        <div className="content-header">
          <h2 className="content-title" style={{ fontSize: '20px' }}>All Tasks</h2>
        </div>

        <div className="table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>ID</th>
                <th>Task</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '90px' }}>Priority</th>
                <th style={{ width: '90px' }}>Owner</th>
                <th style={{ width: '100px' }}>Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} onClick={() => onTaskClick(task)}>
                  <td className="task-id">{task.id}</td>
                  <td className="task-title">{task.title}</td>
                  <td>
                    <StatusBadge status={task.status} />
                  </td>
                  <td>
                    <PriorityDisplay priority={task.priority} />
                  </td>
                  <td>
                    <div className={`avatar ${task.owner ? getAvatarClass(task.owner) : 'avatar-1'}`}>
                      {task.owner ? getInitials(task.owner) : '??'}
                    </div>
                  </td>
                  <td className={`due-date ${getDueDateClass(task.due_date)}`}>
                    {formatDate(task.due_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function EmployeeCard({ member, onTaskClick }: { member: TeamMember; onTaskClick: (task: Task) => void }) {
  const inProgress = member.tasks.filter(t => t.status === 'In Progress').length;
  const done = member.tasks.filter(t => t.status === 'Done').length;

  return (
    <div className="employee-card">
      <div className="employee-header">
        <div className={`employee-avatar ${member.avatar_class}`}>{member.initials}</div>
        <div className="employee-info">
          <h3>{member.name}</h3>
          <p>{member.tasks.length} tasks • {inProgress} in progress • {done} done</p>
        </div>
      </div>
      <table className="task-mini-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {member.tasks.slice(0, 3).map(task => (
            <tr key={task.id} onClick={() => onTaskClick(task)}>
              <td className="task-title" style={{ fontWeight: 500 }}>
                {task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title}
              </td>
              <td>
                <StatusBadge status={task.status} mini />
              </td>
              <td className={`due-date ${getDueDateClass(task.due_date)}`} style={{ fontSize: '12px' }}>
                {formatDate(task.due_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, change, changeType }: {
  label: string;
  value: number;
  change: string;
  changeType?: 'positive' | 'negative';
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-change ${changeType || ''}`}>{change}</div>
    </div>
  );
}

function StatusBadge({ status, mini }: { status: string; mini?: boolean }) {
  const statusClass = status.toLowerCase().replace(' ', '-');
  return (
    <span className={`status-badge status-${statusClass}`} style={mini ? { padding: '2px 8px', fontSize: '11px' } : {}}>
      <span className="status-dot" style={mini ? { width: '4px', height: '4px' } : {}}></span>
      {status}
    </span>
  );
}

function PriorityDisplay({ priority }: { priority: string }) {
  const priorityClass = priority.toLowerCase();
  return (
    <div className="priority">
      <span className={`priority-bar priority-${priorityClass}`}></span>
      {priority}
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDueDateClass(dateStr: string): string {
  if (!dateStr) return '';
  const due = new Date(dateStr);
  const now = new Date();
  if (due < now) return 'overdue';
  const diff = due.getTime() - now.getTime();
  if (diff < 3 * 24 * 60 * 60 * 1000) return 'soon';
  return '';
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function getAvatarClass(name: string): string {
  const map: Record<string, string> = {
    'Alex Kim': 'avatar-1',
    'Maria Jensen': 'avatar-2',
    'Ryan Lee': 'avatar-3',
    'Sam Hill': 'avatar-4',
    'Jordan Chen': 'avatar-1',
  };
  return map[name] || 'avatar-1';
}
