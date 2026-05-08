'use client';

import { AgentRun } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RunHistoryProps {
  runs: AgentRun[];
  onSelectRun: (runId: string) => void;
}

function formatDuration(started?: string, completed?: string): string {
  if (!started) return '-';
  const start = new Date(started);
  const end = completed ? new Date(completed) : new Date();
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return '<1s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'running':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'success':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'failed':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'pending':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'skipped':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'cancelled':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export default function RunHistory({ runs, onSelectRun }: RunHistoryProps) {
  const sorted = [...runs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card className="bg-slate-900/40 border border-slate-800 rounded-3xl ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <span className="w-2 h-6 bg-purple-500 rounded-full" />
          Run History
          <span className="text-xs font-normal text-slate-500">({runs.length} runs)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-500 font-medium">Agent</TableHead>
              <TableHead className="text-slate-500 font-medium">Status</TableHead>
              <TableHead className="text-slate-500 font-medium">Phase</TableHead>
              <TableHead className="text-center text-slate-500 font-medium">Retries</TableHead>
              <TableHead className="text-slate-500 font-medium">Started</TableHead>
              <TableHead className="text-slate-500 font-medium">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-600">
                  No runs yet
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(run => (
                <TableRow
                  key={run.run_id}
                  onClick={() => onSelectRun(run.run_id)}
                  className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                >
                  <TableCell className="text-slate-200 font-medium">{run.agent_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusBadgeClass(run.status)} text-[10px] font-bold uppercase tracking-wider`}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">{run.phase_id}</TableCell>
                  <TableCell className="text-center text-slate-400">{run.retry_count}/{run.max_retries}</TableCell>
                  <TableCell className="text-slate-400">
                    {run.started_at ? new Date(run.started_at).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {formatDuration(run.started_at, run.completed_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
