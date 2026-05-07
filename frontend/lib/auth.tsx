'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, User } from './api';

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'session_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_KEY);
    if (storedSessionId) {
      checkSession(storedSessionId);
    } else {
      setLoading(false);
    }
  }, []);

  async function checkSession(sid: string) {
    try {
      const data = await api.getMe(sid);
      setUser(data.user);
      setSessionId(sid);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      setSessionId(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await api.login({ email, password });
    localStorage.setItem(SESSION_KEY, data.session_id);
    setUser(data.user);
    setSessionId(data.session_id);
  }

  async function logout() {
    if (sessionId) {
      try {
        await api.logout(sessionId);
      } catch {
        // Ignore errors on logout
      }
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setSessionId(null);
  }

  return (
    <AuthContext.Provider value={{ user, sessionId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
