import { useState } from 'react';
import { AssetExplorer } from '../features/assets/AssetExplorer';
import { TemplateExplorer } from '../features/assets/TemplateExplorer';
import { useAssetStore } from '../store/useAssetStore';

type DashboardCategory = 'branded' | 'fonts' | 'templates';

const categoryButton = 'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors';

export function DashboardRoute() {
  // Manual sanity checklist:
  // 1) Create folders in Branded Assets, refresh, and verify they remain.
  // 2) Upload a PNG into a nested folder and verify it appears immediately.
  // 3) Refresh and verify file remains in that same folder.
  // 4) Drag the file onto another folder and verify it moves.
  // 5) Refresh and verify the file remains in the moved folder.
  // 6) Delete file and folder (with confirmations), refresh, and verify they stay deleted.
  // 7) Use Reset State in Dev Tools and verify default seed state is restored.
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>('branded');
  const [exportedState, setExportedState] = useState('');
  const exportState = useAssetStore((s) => s.exportState);
  const resetState = useAssetStore((s) => s.resetState);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">Single-pane explorer for Branded Assets, Fonts, and Templates with persisted folder/file management.</p>
      </div>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mode</h3>
          <div className="space-y-2">
            <button
              className={`${categoryButton} ${activeCategory === 'branded' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
              onClick={() => setActiveCategory('branded')}
              type="button"
            >
              Branded Assets
            </button>
            <button
              className={`${categoryButton} ${activeCategory === 'fonts' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
              onClick={() => setActiveCategory('fonts')}
              type="button"
            >
              Fonts
            </button>
            <button
              className={`${categoryButton} ${activeCategory === 'templates' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
              onClick={() => setActiveCategory('templates')}
              type="button"
            >
              Templates
            </button>
          </div>

          <details className="rounded border border-slate-700 bg-slate-950 p-2">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">Dev Tools</summary>
            <div className="mt-2 space-y-2">
              <button
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => setExportedState(exportState())}
                type="button"
              >
                Export persisted state
              </button>
              <button
                className="w-full rounded border border-rose-700/70 bg-rose-900/20 px-2 py-1 text-xs text-rose-200 hover:bg-rose-900/40"
                onClick={() => {
                  if (window.confirm('Reset persisted asset/font/template explorer state to defaults?')) {
                    resetState();
                    setExportedState('');
                  }
                }}
                type="button"
              >
                Reset state
              </button>
              {exportedState ? (
                <textarea
                  className="h-40 w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300"
                  readOnly
                  value={exportedState}
                />
              ) : null}
            </div>
          </details>
        </aside>

        <div>
          {activeCategory === 'templates' ? (
            <TemplateExplorer />
          ) : (
            <AssetExplorer kind={activeCategory} title={activeCategory === 'branded' ? 'Branded Assets' : 'Fonts'} />
          )}
        </div>
      </section>
    </section>
  );
}
