'use client';

import { Task } from '@/lib/api';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function TaskPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="panel open">
      <div className="panel-header">
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Task details</span>
        <button className="panel-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <div className="panel-content">
        <div className="panel-task-id">{task.id}</div>
        <h2 className="panel-task-title">{task.title}</h2>

        <div className="panel-section">
          <div className="panel-label">Status</div>
          <div className="panel-row">
            <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
              <span className="status-dot"></span>
              {task.status}
            </span>
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-label">Properties</div>
          <div className="panel-row">
            <span style={{ color: 'var(--muted)', width: '80px' }}>Priority</span>
            <div className="priority">
              <span className={`priority-bar priority-${task.priority.toLowerCase()}`}></span>
              <span className="panel-value">{task.priority}</span>
            </div>
          </div>
          <div className="panel-row">
            <span style={{ color: 'var(--muted)', width: '80px' }}>Owner</span>
            <div className="panel-value">{task.owner || 'Unassigned'}</div>
          </div>
          <div className="panel-row">
            <span style={{ color: 'var(--muted)', width: '80px' }}>Due date</span>
            <span className={`panel-value due-date ${getDueDateClass(task.due_date)}`}>
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>

        {task.labels && task.labels.length > 0 && (
          <div className="panel-section">
            <div className="panel-label">Labels</div>
            <div style={{ marginTop: '8px' }}>
              {task.labels.map((label: string) => (
                <span
                  key={label}
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    background: 'var(--bg)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    marginRight: '6px',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="panel-divider"></div>

        <div className="panel-section">
          <div className="panel-label">Description</div>
          <p className="panel-description">{task.description || 'No description provided.'}</p>
        </div>

        <div className="panel-section">
          <div className="panel-label">Activity</div>
          <div className="panel-row">
            <span style={{ color: 'var(--muted)', width: '80px' }}>Created</span>
            <span className="panel-value">{formatDate(task.created_at)}</span>
          </div>
          <div className="panel-row">
            <span style={{ color: 'var(--muted)', width: '80px' }}>Updated</span>
            <span className="panel-value">{formatDate(task.updated_at)}</span>
          </div>
          <div className="panel-row">
            <span style={{ color: 'var(--muted)', width: '80px' }}>Comments</span>
            <span className="panel-value">{task.comments_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
