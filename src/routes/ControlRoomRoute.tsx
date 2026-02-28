import { useMemo } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { TemplatePreview } from '../features/playout/TemplatePreview';
import { useDataEngineStore } from '../store/useDataEngineStore';
import { buildOutputFeedUrl, buildTemplateFeedUrl } from '../features/playout/publicUrl';
import { StatusBadge } from '../components/ui/StatusBadge';

export function ControlRoomRoute() {
  const templateStore = useTemplateStore();
  const previewTemplate = usePlayoutStore((s) => s.previewTemplate);
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const lastTakeAt = usePlayoutStore((s) => s.lastTakeAt);
  const setPreviewTemplate = usePlayoutStore((s) => s.setPreviewTemplate);
  const takeToProgram = usePlayoutStore((s) => s.takeToProgram);

  const engineRunning = useDataEngineStore((s) => s.running);
  const engineSpeed = useDataEngineStore((s) => s.speed);
  const startEngine = useDataEngineStore((s) => s.start);
  const stopEngine = useDataEngineStore((s) => s.stop);
  const stepPitch = useDataEngineStore((s) => s.stepPitch);
  const setEngineSpeed = useDataEngineStore((s) => s.setSpeed);

  const templates = useMemo(
    () => [...templateStore.templates].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [templateStore.templates],
  );

  const copyTemplateUrl = async (templateId: string) => {
    const template = templateStore.getTemplateById(templateId);
    if (!template) return;
    const url = buildTemplateFeedUrl(window.location.origin, template);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy template URL', url);
    }
  };

  const copyAggregateOutputUrl = async () => {
    if (!programTemplate) return;
    const url = buildOutputFeedUrl(window.location.origin, programTemplate);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy Control Room output URL', url);
    }
  };

  const takeTime = lastTakeAt ? new Date(lastTakeAt).toLocaleTimeString() : 'No take yet';

  return (
    <section className="grid gap-6 rounded-xl border border-slate-800 bg-slate-900 p-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Control Room</h2>
          <p className="mt-1 text-xs text-slate-400">Broadcast playout authority.</p>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Engine</p>
          {engineRunning ? <StatusBadge tone="ready">READY</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}
          <div className="mt-3 flex items-center gap-2">
            <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs" value={engineSpeed} onChange={(e) => setEngineSpeed(e.target.value as 'slow' | 'normal' | 'fast')}>
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
            <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={stepPitch}>Step</button>
            <button className="rounded border border-emerald-600 bg-emerald-700 px-2 py-1 text-xs font-semibold disabled:opacity-50" onClick={startEngine} disabled={engineRunning}>Start</button>
            <button className="rounded border border-amber-600 bg-amber-700 px-2 py-1 text-xs font-semibold disabled:opacity-50" onClick={stopEngine} disabled={!engineRunning}>Pause</button>
          </div>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">
          <p className="uppercase tracking-wider text-slate-400">Program</p>
          <p className="mt-1 truncate font-semibold text-slate-100">{programTemplate?.name ?? 'No template on air'}</p>
          <div className="mt-2 flex items-center gap-2">{programTemplate ? <StatusBadge tone="on-air">ON AIR</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}</div>
          <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-500">Last TAKE: {takeTime}</p>
        </div>
      </aside>

      <section className="space-y-5 rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <TemplatePreview template={previewTemplate} label="PREVIEW" tone="preview" />
          <TemplatePreview template={programTemplate} label="PROGRAM" tone="program" />
        </div>

        <div className="flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 p-3">
          <button
            className={`rounded-md border px-8 py-3 text-base font-bold tracking-wider text-white disabled:opacity-50 ${previewTemplate ? 'border-red-500 bg-red-600 hover:bg-red-500' : 'border-slate-700 bg-slate-700'}`}
            onClick={takeToProgram}
            disabled={!previewTemplate}
          >
            TAKE
          </button>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-700">
          <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Template</span><span>Status</span><span>Feed</span><span>Actions</span>
          </div>
          <div className="divide-y divide-slate-800">
            {templates.map((template) => {
              const isPreview = previewTemplate?.id === template.id;
              const isProgram = programTemplate?.id === template.id;
              return (
                <div key={template.id} className="grid grid-cols-[1.8fr_1fr_1fr_1fr] items-center px-3 py-3 text-sm text-slate-200">
                  <span className="font-semibold">{template.name}</span>
                  <span>{template.layers.length > 0 ? <StatusBadge tone="valid">VALID</StatusBadge> : <StatusBadge tone="invalid">INVALID</StatusBadge>}</span>
                  <span>{isProgram ? <StatusBadge tone="on-air">ON AIR</StatusBadge> : isPreview ? <StatusBadge tone="preview">PREVIEW</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}</span>
                  <div className="flex gap-2 text-xs">
                    <button className="rounded border border-blue-600 bg-blue-700 px-2 py-1 font-semibold hover:bg-blue-600" onClick={() => setPreviewTemplate(template)}>Load</button>
                    <button className="rounded border border-emerald-700 px-2 py-1 font-semibold text-emerald-300 hover:bg-emerald-900/30" onClick={() => copyTemplateUrl(template.id)}>URL</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button className="rounded border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-300 disabled:opacity-50 hover:bg-emerald-900/30" onClick={copyAggregateOutputUrl} disabled={!programTemplate}>
            Copy Output URL
          </button>
        </div>
      </section>
    </section>
  );
}
