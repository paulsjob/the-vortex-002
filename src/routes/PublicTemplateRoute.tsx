import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TemplatePreview } from '../features/playout/TemplatePreview';
import { useTemplateStore } from '../store/useTemplateStore';

export function PublicTemplateRoute() {
  const { templateId = '' } = useParams();
  const templateStore = useTemplateStore();
  const template = useMemo(() => templateStore.getTemplateById(templateId), [templateStore.templates, templateId]);

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Public Template Feed</h2>
        <p className="text-slate-400">Template ID: {templateId || 'missing'}</p>
      </div>
      <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <TemplatePreview template={template || null} label="PUBLIC TEMPLATE" tone="program" />
      </div>
    </section>
  );
}
