const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  sessionId?: string | null;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, sessionId } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (sessionId) {
    requestHeaders['X-Session-Id'] = sessionId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    initials: string;
    role: string;
    avatar_class: string;
    team_leader: boolean;
  };
  session_id: string;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatar_class: string;
  team_leader: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  owner_id: string;
  owner?: string;
  due_date: string;
  labels: string[];
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  avatar_class: string;
  tasks: Task[];
}

export interface TeamStats {
  total_tasks: number;
  backlog: number;
  todo: number;
  in_progress: number;
  done: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

export const api = {
  login: (data: LoginRequest) =>
    apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: data,
    }),

  logout: (sessionId: string) =>
    apiRequest<void>('/api/auth/logout', {
      method: 'POST',
      sessionId,
    }),

  getMe: (sessionId: string) =>
    apiRequest<{ user: User }>('/api/auth/me', {
      sessionId,
    }),

  getTasks: (sessionId: string, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return apiRequest<Task[]>('/api/tasks' + query, {
      sessionId,
    });
  },

  getTask: (sessionId: string, id: string) =>
    apiRequest<Task>(`/api/tasks/${id}`, {
      sessionId,
    }),

  getTeam: (sessionId: string) =>
    apiRequest<TeamMember[]>('/api/team', {
      sessionId,
    }),

  getTeamStats: (sessionId: string) =>
    apiRequest<TeamStats>('/api/team/stats', {
      sessionId,
    }),
};
