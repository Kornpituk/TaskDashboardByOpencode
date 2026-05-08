'use client';

import { AgentState } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface WorkflowDAGProps {
  phases: string[];
  phaseNames: Record<string, string>;
  agents: AgentState[];
  onPhaseClick?: (phaseId: string) => void;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const GAP = 40;

function getStatusForPhase(phase: string, agents: AgentState[]): string {
  const agent = agents.find(a => a.current_phase === phase);
  return agent?.status || 'idle';
}

function nodeColors(status: string) {
  switch (status) {
    case 'done':
      return { fill: 'rgba(34,197,94,0.15)', stroke: '#22c55e', text: '#4ade80', sub: '#4ade80', label: '#475569' };
    case 'working':
      return { fill: 'rgba(59,130,246,0.15)', stroke: '#3b82f6', text: '#60a5fa', sub: '#60a5fa', label: '#475569' };
    case 'error':
      return { fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', text: '#f87171', sub: '#f87171', label: '#475569' };
    default:
      return { fill: 'rgba(51,65,85,0.3)', stroke: '#334155', text: '#64748b', sub: '#64748b', label: '#475569' };
  }
}

export default function WorkflowDAG({ phases, phaseNames, agents, onPhaseClick }: WorkflowDAGProps) {
  const totalWidth = phases.length * (NODE_WIDTH + GAP);
  const svgWidth = Math.max(totalWidth, 600);
  const svgHeight = 200;

  if (phases.length === 0) {
    return (
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            Workflow Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm">No phases defined</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/40 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
          Workflow Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minWidth: totalWidth }}>
        {phases.map((_, idx) => {
          if (idx === phases.length - 1) return null;
          const x1 = (idx + 1) * (NODE_WIDTH + GAP) - GAP + 20;
          const y1 = svgHeight / 2;
          const x2 = (idx + 1) * (NODE_WIDTH + GAP) - 20;
          const y2 = svgHeight / 2;
          const status1 = getStatusForPhase(phases[idx], agents);
          const isDone = status1 === 'done';
          return (
            <g key={`line-${idx}`}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isDone ? '#22c55e' : '#334155'}
                strokeWidth={2}
                strokeDasharray={isDone ? 'none' : '6,4'}
              />
              {isDone && (
                <polygon
                  points={`${x2 - 6},${y1 - 5} ${x2},${y1} ${x2 - 6},${y1 + 5}`}
                  fill="#22c55e"
                />
              )}
            </g>
          );
        })}
        {phases.map((phase, idx) => {
          const x = idx * (NODE_WIDTH + GAP);
          const y = svgHeight / 2 - NODE_HEIGHT / 2;
          const status = getStatusForPhase(phase, agents);
          const isActive = status === 'working';
          const colors = nodeColors(status);
          const agent = agents.find(a => a.current_phase === phase);
          return (
            <g
              key={phase}
              className="cursor-pointer"
              onClick={() => onPhaseClick?.(phase)}
            >
              {isActive && (
                <rect
                  x={x - 4} y={y - 4}
                  width={NODE_WIDTH + 8} height={NODE_HEIGHT + 8}
                  rx={16}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  className="animate-pulse"
                  opacity={0.5}
                />
              )}
              <rect
                x={x} y={y}
                width={NODE_WIDTH} height={NODE_HEIGHT}
                rx={12}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isActive ? 2 : 1}
              />
              {agent && (
                <text
                  x={x + NODE_WIDTH / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fill={colors.label}
                  fontSize={9}
                >
                  {agent.agent_id}
                </text>
              )}
              <text
                x={x + NODE_WIDTH / 2}
                y={y + NODE_HEIGHT / 2 - 8}
                textAnchor="middle"
                fill={colors.text}
                fontSize={12}
                fontWeight="bold"
              >
                {phaseNames[phase] || phase}
              </text>
              <text
                x={x + NODE_WIDTH / 2}
                y={y + NODE_HEIGHT / 2 + 12}
                textAnchor="middle"
                fill="#475569"
                fontSize={10}
              >
                Phase {idx + 1}
              </text>
              {status === 'done' && (
                <text
                  x={x + NODE_WIDTH / 2}
                  y={y + NODE_HEIGHT / 2 + 26}
                  textAnchor="middle"
                  fill={colors.sub}
                  fontSize={10}
                >
                  ✓ Complete
                </text>
              )}
              {isActive && (
                <text
                  x={x + NODE_WIDTH / 2}
                  y={y + NODE_HEIGHT / 2 + 26}
                  textAnchor="middle"
                  fill={colors.sub}
                  fontSize={10}
                  className="animate-pulse"
                >
                  ● Active
                </text>
              )}
              {status === 'error' && (
                <text
                  x={x + NODE_WIDTH / 2}
                  y={y + NODE_HEIGHT / 2 + 26}
                  textAnchor="middle"
                  fill={colors.sub}
                  fontSize={10}
                >
                  ✗ Error
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </CardContent>
    </Card>
  );
}
