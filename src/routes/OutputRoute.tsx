import { useMemo } from 'react';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { buildOutputFeedUrl } from '../features/playout/publicUrl';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';

export function OutputRoute() {
  const templateStore = useTemplateStore();
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const lastTakeAt = usePlayoutStore((s) => s.lastTakeAt);
  const clearProgram = usePlayoutStore((s) => s.clearProgram);

  const selectedTemplate = templateStore.selectedTemplate;

  const vortexRenderState = useMemo(() => {
    if (!selectedTemplate || selectedTemplate.source !== 'vortex') {
      return null;
    }
    const pkg = templateStore.getVortexPackage(selectedTemplate.id);
    if (!pkg) {
      return { error: 'Selected Vortex template package is missing.' as const };
    }
    try {
      const scene = sceneFromVortexPackage(pkg);
      return {
        template: {
          id: pkg.manifest.templateId,
          name: pkg.manifest.templateName,
          canvasWidth: scene.canvas.width,
          canvasHeight: scene.canvas.height,
          layers: scene.layers,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid Vortex scene data.' };
    }
  }, [selectedTemplate, templateStore.vortexPackages]);

  const copyOutputUrl = async () => {
    if (!programTemplate) return;
    const url = buildOutputFeedUrl(window.location.origin, programTemplate);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy output URL', url);
    }
  };

  return (
    <section className="flex h-[calc(100vh-11.75rem)] min-h-[36rem] flex-col gap-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Output Monitor (Client Feed)</h2>
          <p className="text-slate-400">This is the actual program output feed only.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded border border-emerald-700 px-3 py-1 text-xs text-emerald-300 disabled:opacity-50" onClick={copyOutputUrl} disabled={!programTemplate}>Copy Output URL</button>
          <button className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300" onClick={clearProgram}>Clear Output</button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid content-start gap-3 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Template Info</p>
            <p className="font-semibold text-red-300">{vortexRenderState?.template?.name || programTemplate?.name || 'No live graphic'}</p>
            {vortexRenderState?.template ? (
              <p className="text-xs text-slate-400">{vortexRenderState.template.canvasWidth} × {vortexRenderState.template.canvasHeight} · {vortexRenderState.template.layers.length} layers</p>
            ) : programTemplate ? (
              <p className="text-xs text-slate-400">{programTemplate.canvasWidth} × {programTemplate.canvasHeight} · {programTemplate.layers.length} layers</p>
            ) : (
              <p className="text-xs text-slate-500">Waiting for Take from Control Room</p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Stream Health</p>
            <p className={`font-semibold ${vortexRenderState?.template || programTemplate ? 'text-emerald-300' : 'text-amber-300'}`}>{vortexRenderState?.template || programTemplate ? 'Stable' : 'Standby'}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">FPS</p>
            <p className="font-semibold text-slate-100">{vortexRenderState?.template || programTemplate ? '59.94' : '--'}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Bitrate</p>
            <p className="font-semibold text-slate-100">{vortexRenderState?.template || programTemplate ? '8.5 Mbps' : '--'}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Latency</p>
            <p className="font-semibold text-slate-100">{vortexRenderState?.template || programTemplate ? '120 ms' : '--'}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Status</p>
            <p className="font-semibold text-slate-100">{lastTakeAt ? `Last take: ${new Date(lastTakeAt).toLocaleString()}` : 'No takes yet'}</p>
          </div>
        </aside>

        <div className="min-h-0 rounded-lg border border-slate-700 bg-slate-950 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-[0.2em] text-red-300">Program Feed</span>
            {(vortexRenderState?.template || programTemplate) && <span>{(vortexRenderState?.template || programTemplate)?.canvasWidth} × {(vortexRenderState?.template || programTemplate)?.canvasHeight}</span>}
          </div>

          {vortexRenderState?.error ? (
            <div className="grid h-[calc(100%-1.5rem)] place-items-center rounded-lg border border-rose-700/60 bg-rose-900/20 text-sm text-rose-200">
              {vortexRenderState.error}
            </div>
          ) : !vortexRenderState?.template && !programTemplate ? (
            <div className="grid h-[calc(100%-1.5rem)] place-items-center rounded-lg border border-slate-700 text-sm text-slate-500">
              No template on Output. Go to Control Room and click <strong>Take</strong>.
            </div>
          ) : (
            <div className="relative h-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,#0f172a_25%,#111827_25%,#111827_50%,#0f172a_50%,#0f172a_75%,#111827_75%,#111827_100%)] bg-[length:18px_18px] opacity-70" />
              <div className="relative z-10 grid h-full place-items-center p-2">
                <div className="relative max-h-full w-full" style={{ aspectRatio: `${(vortexRenderState?.template || programTemplate)?.canvasWidth} / ${(vortexRenderState?.template || programTemplate)?.canvasHeight}` }}>
                  <TemplateSceneSvg
                    template={(vortexRenderState?.template || programTemplate)!}
                    className="absolute inset-0 h-full w-full"
                    assetResolver={vortexRenderState?.template ? (path) => getVortexAssetUrl(vortexRenderState.template.id, path) : undefined}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
