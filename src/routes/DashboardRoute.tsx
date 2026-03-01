import { useState } from 'react';
import { AssetExplorer } from '../features/assets/AssetExplorer';
import { TemplateExplorer } from '../features/assets/TemplateExplorer';

type DashboardCategory = 'branded' | 'fonts' | 'templates';

const categoryButton = 'rounded-md border px-3 py-1.5 text-sm transition-colors';

export function DashboardRoute() {
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>('branded');

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">Project organization for Branded Assets, Fonts, and Templates with folder/file CRUD.</p>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-1">
          <button
            className={`${categoryButton} ${activeCategory === 'branded' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-transparent bg-transparent text-slate-300 hover:bg-slate-800'}`}
            onClick={() => setActiveCategory('branded')}
            type="button"
          >
            Branded Assets
          </button>
          <button
            className={`${categoryButton} ${activeCategory === 'fonts' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-transparent bg-transparent text-slate-300 hover:bg-slate-800'}`}
            onClick={() => setActiveCategory('fonts')}
            type="button"
          >
            Fonts
          </button>
          <button
            className={`${categoryButton} ${activeCategory === 'templates' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-transparent bg-transparent text-slate-300 hover:bg-slate-800'}`}
            onClick={() => setActiveCategory('templates')}
            type="button"
          >
            Templates
          </button>
        </div>

        {activeCategory === 'templates' ? (
          <TemplateExplorer />
        ) : (
          <AssetExplorer kind={activeCategory} title={activeCategory === 'branded' ? 'Branded Assets' : 'Fonts'} />
        )}
      </section>
    </section>
  );
}
