'use client';

import { useEffect, useState } from 'react';
import { api, AgentRun } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ArtifactInspectorProps {
  runId: string;
  onClose: () => void;
}

export default function ArtifactInspector({ runId, onClose }: ArtifactInspectorProps) {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [tab, setTab] = useState<'input' | 'output'>('input');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getRun(runId).then(data => {
      setRun(data.run);
    }).catch(console.error).finally(() => setLoading(false));
  }, [runId]);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className={cn(
          "bg-slate-900 border-slate-800 text-slate-200 max-w-2xl",
          !loading && run && "max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0"
        )}
        showCloseButton={false}
      >
        {loading && (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        )}
        {!loading && !run && (
          <div className="p-8 text-center text-red-400">Failed to load run details</div>
        )}
        {!loading && run && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <div>
                <DialogTitle className="text-lg font-bold text-white">Run Artifacts</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  {run.agent_id} — {run.run_id.slice(0, 8)}...
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <button className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </DialogClose>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'input' | 'output')} className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="w-full justify-start border-b border-slate-800 rounded-none bg-transparent h-auto p-0 gap-0 shrink-0">
                <TabsTrigger
                  value="input"
                  className="px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-none border-0 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-300 hover:bg-transparent"
                >
                  Input
                </TabsTrigger>
                <TabsTrigger
                  value="output"
                  className="px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-none border-0 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-300 hover:bg-transparent"
                >
                  Output
                </TabsTrigger>
              </TabsList>
              <TabsContent value="input" className="flex-1 overflow-auto p-6">
                <pre className="bg-black/60 rounded-2xl border border-slate-800 p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(run.input, null, 2)}
                </pre>
              </TabsContent>
              <TabsContent value="output" className="flex-1 overflow-auto p-6">
                <pre className="bg-black/60 rounded-2xl border border-slate-800 p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(run.output || {}, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
