import { AssetExplorer } from '../features/assets/AssetExplorer';
import { TemplateExplorer } from '../features/assets/TemplateExplorer';

export function DashboardRoute() {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">Project organization for Branded Assets, Fonts, and Templates with folder/file CRUD.</p>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Branded Assets</h3>
        <AssetExplorer kind="branded" title="Branded Assets" />
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Fonts</h3>
        <AssetExplorer kind="fonts" title="Fonts" />
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Templates</h3>
        <TemplateExplorer />
      </section>
    </section>
  );
}
