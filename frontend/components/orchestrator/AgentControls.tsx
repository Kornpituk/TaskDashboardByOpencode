'use client';

import { AgentState } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AgentControlsProps {
  agents: AgentState[];
  onStartWorkflow: () => void;
  onStartAgent: (agentId: string) => void;
  onStopAgent: (agentId: string) => void;
  onRetryAgent: (agentId: string) => void;
  isRunning: boolean;
}

export default function AgentControls({
  agents,
  onStartWorkflow,
  onStartAgent,
  onStopAgent,
  onRetryAgent,
  isRunning,
}: AgentControlsProps) {
  return (
    <Card className="bg-slate-900/40 border-slate-800 rounded-3xl">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <span className="w-2 h-6 bg-blue-500 rounded-full" />
          Agent Controls
        </CardTitle>
        <Button
          onClick={onStartWorkflow}
          disabled={isRunning}
          className={cn(
            isRunning
              ? 'bg-slate-800 text-slate-600'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
          )}
        >
          {isRunning ? 'Workflow Running...' : '▶ Start Workflow'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {agents.length === 0 && (
          <p className="text-slate-600 text-sm">No agents configured</p>
        )}
        {agents.map(agent => (
          <AgentButton
            key={agent.agent_id}
            agent={agent}
            onStart={onStartAgent}
            onStop={onStopAgent}
            onRetry={onRetryAgent}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AgentButton({
  agent,
  onStart,
  onStop,
  onRetry,
}: {
  agent: AgentState;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (agent.status === 'done') {
    return (
      <Badge
        variant="outline"
        className="text-green-400 border-green-500/20 bg-green-500/10 opacity-60 px-4 py-2 rounded-xl"
      >
        {agent.agent_id} ✓ Done
      </Badge>
    );
  }

  const config =
    agent.status === 'working'
      ? {
          label: 'Stop',
          onClick: () => onStop(agent.agent_id),
          className:
            'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
        }
      : agent.status === 'error'
        ? {
            label: 'Retry',
            onClick: () => onRetry(agent.agent_id),
            className:
              'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
          }
        : {
            label: 'Start',
            onClick: () => onStart(agent.agent_id),
            className:
              'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
          };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={config.onClick}
      className={config.className}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          agent.status === 'working'
            ? 'bg-blue-400 animate-ping'
            : agent.status === 'error'
              ? 'bg-yellow-400'
              : 'bg-slate-500'
        )}
      />
      {agent.agent_id} — {config.label}
    </Button>
  );
}
