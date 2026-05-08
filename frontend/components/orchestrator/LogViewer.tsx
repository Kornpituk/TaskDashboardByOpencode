'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface AgentLog {
  id: number;
  run_id: string;
  agent_id: string;
  level: string;
  message: string;
  created_at: string;
}

interface LogViewerProps {
  logs: AgentLog[];
  filterAgent?: string;
  filterLevel?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  info: '#60a5fa',
  warn: '#fbbf24',
  error: '#ef4444',
  success: '#4ade80',
  debug: '#a78bfa',
};

const MAX_VISIBLE_LINES = 500;

export default function LogViewer({ logs }: LogViewerProps) {
  const [agentFilter, setAgentFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agents = [...new Set(logs.map(l => l.agent_id))];

  const filtered = logs
    .filter(l => {
      if (agentFilter !== 'all' && l.agent_id !== agentFilter) return false;
      if (levelFilter !== 'all' && l.level !== levelFilter) return false;
      return true;
    })
    .slice(-MAX_VISIBLE_LINES);

  const getViewport = () =>
    scrollRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');

  useEffect(() => {
    if (!isAutoScroll) return;
    const viewport = getViewport();
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [filtered, isAutoScroll]);

  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    const handler = () => {
      setIsAutoScroll(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 30);
    };
    viewport.addEventListener('scroll', handler);
    return () => viewport.removeEventListener('scroll', handler);
  }, []);

  const scrollToBottom = () => {
    const viewport = getViewport();
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
    setIsAutoScroll(true);
  };

  const levels = ['info', 'warn', 'error', 'success', 'debug'];

  return (
    <Card className="bg-slate-900/40 border border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <span className="w-2 h-6 bg-green-500 rounded-full" />
          Agent Logs
          <span className="text-xs font-normal text-slate-500">({logs.length} entries)</span>
        </CardTitle>
        {!isAutoScroll && (
          <CardAction>
            <button
              onClick={scrollToBottom}
              className="px-3 py-1 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              ↓ Scroll to Bottom
            </button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-4">
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger size="sm" className="bg-slate-800 border-slate-700 text-slate-300 text-xs">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger size="sm" className="bg-slate-800 border-slate-700 text-slate-300 text-xs">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map(l => (
                <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div ref={scrollRef}>
          <ScrollArea className="h-80 rounded-2xl border border-slate-800 bg-black/60">
            <div className="p-4 font-mono text-xs leading-relaxed">
              {filtered.length === 0 ? (
                <div className="text-slate-600 text-center py-8">No log entries</div>
              ) : (
                filtered.map(log => (
                  <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded">
                    <span className="text-slate-700 w-8 text-right shrink-0 select-none">{log.id}</span>
                    <span className="text-slate-600 w-16 shrink-0 select-none">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span className="w-16 shrink-0 select-none" style={{ color: LEVEL_COLORS[log.level] || '#94a3b8' }}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-slate-500 w-20 shrink-0 truncate">{log.agent_id}</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
