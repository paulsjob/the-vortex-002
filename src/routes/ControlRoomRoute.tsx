import { useMemo } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { TemplatePreview } from '../features/playout/TemplatePreview';

export function ControlRoomRoute() {
  const templateStore = useTemplateStore();
  const previewTemplate = usePlayoutStore((s) => s.previewTemplate);
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const lastTakeAt = usePlayoutStore((s) => s.lastTakeAt);
  const setPreviewTemplate = usePlayoutStore((s) => s.setPreviewTemplate);
  const takeToProgram = usePlayoutStore((s) => s.takeToProgram);

  const templates = useMemo(
    () => [...templateStore.templates].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [templateStore.templates],
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Control Room Template Queue</h2>
        <p className="text-slate-400">Saved Design templates are available here for graphics operators to trigger on-air.</p>
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-700 bg-slate-950 p-3 xl:grid-cols-2">
        <TemplatePreview template={previewTemplate} label="PST / Preview" tone="preview" />
        <TemplatePreview template={programTemplate} label="PGM / Program" tone="program" />
      </div>

      <div className="flex flex-wrap items-center justify-between rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-400">
        <p>
          <span className="mr-2 uppercase tracking-wider">Preview</span>
          <span className="font-semibold text-slate-200">{previewTemplate?.name || 'No template loaded'}</span>
        </p>
        <p>
          <span className="mr-2 uppercase tracking-wider">Program</span>
          <span className="font-semibold text-slate-200">{programTemplate?.name || 'Nothing on-air'}</span>
        </p>
        {lastTakeAt && <p>Last take: {new Date(lastTakeAt).toLocaleString()}</p>}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_220px] bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Name</span>
          <span>Canvas</span>
          <span>Layers</span>
          <span>Saved</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-slate-800">
          {templates.map((template) => {
            const isPreview = previewTemplate?.id === template.id;
            return (
              <div key={template.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_220px] items-center px-4 py-3 text-sm ${isPreview ? 'bg-blue-900/20 text-blue-100' : 'text-slate-200'}`}>
                <span className="font-semibold">{template.name}</span>
                <span>{template.canvasWidth} × {template.canvasHeight}</span>
                <span>{template.layers.length}</span>
                <span>{new Date(template.createdAt).toLocaleString()}</span>
                <div className="flex gap-2">
                  <button className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold" onClick={() => setPreviewTemplate(template)}>
                    {isPreview ? 'Loaded' : 'Load Preview'}
                  </button>
                  <button className="rounded bg-red-700 px-2 py-1 text-xs font-semibold disabled:opacity-50" onClick={takeToProgram} disabled={!isPreview}>
                    Take
                  </button>
                </div>
              </div>
            );
          })}
          {!templates.length && (
            <div className="px-4 py-6 text-sm text-slate-500">
              No saved templates yet. Save one from the Design dashboard to make it available here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
