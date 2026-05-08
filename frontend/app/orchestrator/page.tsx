"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, WorkflowStatus, AgentRun, AgentLog } from "@/lib/api";
import { useOrchestratorSocket } from "@/lib/websocket";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AgentControls from "@/components/orchestrator/AgentControls";
import WorkflowDAG from "@/components/orchestrator/WorkflowDAG";
import LogViewer from "@/components/orchestrator/LogViewer";
import RunHistory from "@/components/orchestrator/RunHistory";
import ArtifactInspector from "@/components/orchestrator/ArtifactInspector";

const AgentAvatar = ({ status }: { status: string }) => {
  const isWorking = status === 'working';
  const isIdle = status === 'idle';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <div className={`absolute inset-0 rounded-full blur-xl opacity-30 transition-all duration-700 ${
        isWorking ? 'bg-blue-500 animate-pulse' : 
        isIdle ? 'bg-gray-500' : 
        isDone ? 'bg-green-500' : 'bg-red-500'
      }`}></div>
      
      <div className={`relative z-10 w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-500 ${
        isWorking ? 'border-blue-400 bg-gray-800 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 
        isIdle ? 'border-gray-600 bg-gray-900 opacity-70' : 
        isDone ? 'border-green-400 bg-gray-800' : 'border-red-400 bg-gray-800'
      } ${isWorking ? 'animate-bounce' : ''}`}>
        
        <div className="flex space-x-2 mb-1">
          <div className={`w-2 h-2 rounded-full transition-all ${
            isWorking ? 'bg-blue-400 animate-ping' : 
            isIdle ? 'bg-gray-700' : 
            isDone ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
          <div className={`w-2 h-2 rounded-full transition-all ${
            isWorking ? 'bg-blue-400 animate-ping' : 
            isIdle ? 'bg-gray-700' : 
            isDone ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
        </div>
        
        <div className={`w-8 h-1 rounded-full ${
            isWorking ? 'bg-blue-400/50' : 'bg-gray-700'
        }`}></div>

        {isIdle && (
          <div className="absolute -top-2 -right-2 text-xs font-bold text-gray-400 animate-pulse">
            Zzz
          </div>
        )}
      </div>

      {isWorking && (
        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default function OrchestratorDashboard() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const { isConnected, subscribe, send } = useOrchestratorSocket();

  const isRunning = status?.agents.some(a => a.status === 'working') || false;

  const fetchStatus = async () => {
    try {
      const data = await api.getWorkflowStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to orchestration service. Is the backend running on :8081?");
    } finally {
      setLoading(false);
    }
  };

  const fetchRuns = async () => {
    try {
      const data = await api.getRuns();
      setRuns(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchRuns();
    const interval = setInterval(() => {
      fetchStatus();
      fetchRuns();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubStatus = subscribe('agent:status', (payload: any) => {
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          agents: prev.agents.map(a =>
            a.agent_id === payload.agent_id ? { ...a, ...payload } : a
          ),
        };
      });
    });

    const unsubLog = subscribe('agent:log', (payload: AgentLog) => {
      setLogs(prev => [...prev, payload]);
    });

    const unsubNext = subscribe('workflow:next', (payload: any) => {
      setStatus(prev => {
        if (!prev) return prev;
        return { ...prev, next_phase: payload.next_phase };
      });
    });

    const unsubRun = subscribe('run:update', (payload: any) => {
      setRuns(prev => {
        const idx = prev.findIndex(r => r.run_id === payload.run_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...payload };
          return updated;
        }
        return [payload, ...prev];
      });
    });

    return () => {
      unsubStatus();
      unsubLog();
      unsubNext();
      unsubRun();
    };
  }, [subscribe]);

  const handleStartWorkflow = () => {
    send('action', { action: 'start_workflow' });
  };

  const handleStartAgent = (agentId: string) => {
    send('action', { action: 'start_agent', agent_id: agentId });
  };

  const handleStopAgent = (agentId: string) => {
    if (!window.confirm(`Stop agent "${agentId}"?`)) return;
    send('action', { action: 'stop_agent', agent_id: agentId });
  };

  const handleRetryAgent = (agentId: string) => {
    send('action', { action: 'retry', agent_id: agentId });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="text-blue-500 animate-spin text-4xl">◎</div>
    </div>
  );

  const doneCount = status?.agents.filter(a => a.status === 'done').length || 0;
  const totalPhases = status?.phases.length || 1;
  const progressPct = Math.round(doneCount / totalPhases * 100);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-blue-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
              <Badge variant="outline" className={`text-xs font-bold uppercase tracking-widest ${
                isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {isConnected ? 'WS Connected' : 'WS Disconnected'}
              </Badge>
              <span className="h-1 w-1 rounded-full bg-slate-700"></span>
              <span className="text-slate-500 text-xs font-medium">v1.2.0-core</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              Agent Orchestration
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            {error && (
              <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium animate-pulse">
                {error}
              </div>
            )}
            <Link href="/" className="group flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-full transition-all duration-300">
              <span className="text-sm font-medium">Back to Terminal</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </header>

        {/* Bento Grid: 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Col 1: Pipeline */}
          <div className="lg:col-span-1">
            <WorkflowDAG
              phases={status?.phases || []}
              phaseNames={status?.phase_names || {}}
              agents={status?.agents || []}
            />
          </div>

          {/* Col 2: Global Progress */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-b from-blue-600 to-blue-800 border-0 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl font-black italic select-none">GO</div>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-80">Global Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-6xl font-black mb-4">{progressPct}%</div>
                <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden mb-8">
                  <div className="h-full bg-white transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
                </div>
                <p className="text-sm opacity-80 leading-relaxed font-medium">
                  {status?.next_phase === "all-done"
                    ? "System optimization and deployment complete. All agents in standby mode."
                    : `System is currently focused on ${status?.phase_names[status?.next_phase || '']}.`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Col 3: Controls */}
          <div className="lg:col-span-1">
            <AgentControls
              agents={status?.agents || []}
              onStartWorkflow={handleStartWorkflow}
              onStartAgent={handleStartAgent}
              onStopAgent={handleStopAgent}
              onRetryAgent={handleRetryAgent}
              isRunning={isRunning}
            />
          </div>
        </div>

        {/* Tabs: Agents | Logs | History */}
        <Card className="bg-slate-900/40 border-slate-800">
          <Tabs defaultValue="agents">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <TabsList className="bg-slate-800/50 border border-slate-700/50">
                  <TabsTrigger value="agents" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
                    Agents
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
                    Logs {logs.length > 0 && <span className="ml-1.5 text-xs text-slate-500">({logs.length})</span>}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
                    Run History {runs.length > 0 && <span className="ml-1.5 text-xs text-slate-500">({runs.length})</span>}
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <TabsContent value="agents" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(!status || status.agents.length === 0) && (
                    <p className="text-slate-600 text-sm col-span-2 text-center py-8">No agents configured</p>
                  )}
                  {status?.agents.map((agent) => (
                    <div key={agent.agent_id} className={`group relative p-6 rounded-3xl border transition-all duration-500 ${
                      agent.status === 'working' ? 'bg-blue-500/5 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]' :
                      'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex gap-6 items-start">
                        <AgentAvatar status={agent.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-lg font-bold text-white truncate">{agent.agent_id}</h3>
                            <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                              agent.status === 'working' ? 'bg-blue-500 text-white border-blue-500 animate-pulse' :
                              agent.status === 'done' ? 'bg-green-500/20 text-green-400 border-green-500/20' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {agent.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mb-3 italic">
                            Phase: {status?.phase_names[agent.current_phase] || agent.current_phase}
                          </p>
                          <div className="p-3 rounded-xl bg-black/40 border border-slate-800/50">
                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                              {agent.last_action}
                            </p>
                          </div>
                        </div>
                      </div>

                      {agent.status === 'working' && (
                        <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 animate-progress-indefinite"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="mt-0">
                <LogViewer logs={logs} />
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <RunHistory
                  runs={runs}
                  onSelectRun={setSelectedRun}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {selectedRun && (
        <ArtifactInspector
          runId={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
