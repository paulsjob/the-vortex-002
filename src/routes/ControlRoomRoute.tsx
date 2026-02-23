import { useMemo } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';

export function ControlRoomRoute() {
  const templateStore = useTemplateStore();
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

      <div className="overflow-hidden rounded-lg border border-slate-700">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Name</span>
          <span>Canvas</span>
          <span>Layers</span>
          <span>Saved</span>
        </div>
        <div className="divide-y divide-slate-800">
          {templates.map((template) => (
            <div key={template.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-4 py-3 text-sm text-slate-200">
              <span className="font-semibold">{template.name}</span>
              <span>{template.canvasWidth} × {template.canvasHeight}</span>
              <span>{template.layers.length}</span>
              <span>{new Date(template.createdAt).toLocaleString()}</span>
            </div>
          ))}
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
