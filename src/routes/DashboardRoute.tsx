import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayerStore } from '../store/useLayerStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { StatusBadge } from '../components/ui/StatusBadge';

export function DashboardRoute() {
  const navigate = useNavigate();
  const templateStore = useTemplateStore();
  const loadTemplate = useLayerStore((s) => s.loadTemplate);

  const selectedTemplateRef = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);

  const templates = useMemo(
    () => [...templateStore.templates].sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt)),
    [templateStore.templates],
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateRef?.id) ?? templates[0],
    [templates, selectedTemplateRef],
  );

  return (
    <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">System template authority view.</p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">Templates</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{templates.length}</p>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">Active</p>
            <p className="mt-1 truncate font-semibold text-slate-100">{selectedTemplate?.name ?? 'None'}</p>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">System</p>
            <StatusBadge tone="ready">READY</StatusBadge>
          </div>
        </div>
      </aside>

      <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Template Queue</h3>
          <button
            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
            disabled={!selectedTemplate}
            onClick={() => {
              if (!selectedTemplate) return;
              loadTemplate(selectedTemplate);
              navigate('/design');
            }}
          >
            LOAD TO DESIGN
          </button>
        </header>

        <div className="overflow-hidden rounded-md border border-slate-700">
          <div className="grid grid-cols-[2.2fr_0.9fr_0.9fr_0.8fr_0.7fr] bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Template</span>
            <span>Status</span>
            <span>Format</span>
            <span>Version</span>
            <span>Updated</span>
          </div>
          <div className="divide-y divide-slate-800">
            {templates.map((template, index) => {
              const isActive = selectedTemplate?.id === template.id;
              const isValid = template.layers.length > 0;
              return (
                <button
                  key={template.id}
                  className={`grid w-full grid-cols-[2.2fr_0.9fr_0.9fr_0.8fr_0.7fr] items-center px-3 py-3 text-left text-sm ${isActive ? 'bg-blue-900/25 text-blue-50' : 'bg-transparent text-slate-200 hover:bg-slate-900/70'}`}
                  onClick={() => selectTemplate({ source: 'native', id: template.id })}
                >
                  <span className="font-medium">{template.name}</span>
                  <span>{isValid ? <StatusBadge tone="valid">VALID</StatusBadge> : <StatusBadge tone="invalid">INVALID</StatusBadge>}</span>
                  <span>{template.canvasWidth}×{template.canvasHeight}</span>
                  <span>v{index + 1}</span>
                  <span className="text-xs text-slate-400">{new Date(template.updatedAt ?? template.createdAt).toLocaleDateString()}</span>
                </button>
              );
            })}
            {!templates.length && <p className="px-3 py-6 text-sm text-slate-500">No templates available.</p>}
          </div>
        </div>
      </section>
    </section>
  );
}
