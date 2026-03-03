import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';
import { type FontLoadResult, loadVortexFonts } from '../features/packages/vortexFontGate';
import { getManifestFormat } from '../features/packages/loadVortexPackage';
import { FontGateOverlay } from '../features/playout/FontGateOverlay';
import { applyBindingsToScene, normalizeBindingSchema } from '../features/playout/vortexBindings';
import { StatusBadge } from '../components/ui/StatusBadge';
import { decodeTemplatePayload } from '../features/playout/publicUrl';
import { useDemoSessionStore } from '../store/useDemoSessionStore';
import { useDataEngineStore } from '../store/useDataEngineStore';
import { getCatalogRegistry, getCatalogRegistryHealth } from '../components/design/dataBindingPaths';

const mapDemoBindingDefaults = (
  keys: string[],
  session: { player: string; stat: string; sponsor: string },
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  keys.forEach((key) => {
    const normalized = key.toLowerCase();
    if (normalized.includes('player') || normalized.includes('batter') || normalized.includes('athlete')) {
      next[key] = session.player;
    } else if (normalized.includes('stat') || normalized.includes('metric')) {
      next[key] = session.stat;
    } else if (normalized.includes('sponsor') || normalized.includes('brand')) {
      next[key] = session.sponsor;
    }
  });
  return next;
};

const shouldShowDebugOverlay = (): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  // Toggle in dev by setting localStorage.setItem('debug_output_overlay', '1').
  return window.localStorage.getItem('debug_output_overlay') === '1';
};

const shouldShowCatalogOverlay = (): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  // Toggle in dev by setting localStorage.setItem('debug_catalog', '1').
  return window.localStorage.getItem('debug_catalog') === '1';
};

export function OutputRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const tpl = searchParams.get('tpl');
  const templateStore = useTemplateStore();
  const programSnapshot = usePlayoutStore((s) => s.programSnapshot);
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const programRevision = usePlayoutStore((s) => s.programRevision);
  const outputRevision = usePlayoutStore((s) => s.outputRevision);
  const fontOverrides = usePlayoutStore((s) => s.fontOverrides);
  const initializeBindings = usePlayoutStore((s) => s.initializeBindings);
  const getBindingState = usePlayoutStore((s) => s.getBindingState);
  const setBindingFontGateSatisfied = usePlayoutStore((s) => s.setBindingFontGateSatisfied);
  const setFontOverride = usePlayoutStore((s) => s.setFontOverride);
  const setBindingValues = usePlayoutStore((s) => s.setBindingValues);
  const activateProgramTemplate = usePlayoutStore((s) => s.activateProgramTemplate);

  const selectedPlayer = useDemoSessionStore((s) => s.selectedPlayer);
  const selectedStat = useDemoSessionStore((s) => s.selectedStat);
  const selectedSponsor = useDemoSessionStore((s) => s.selectedSponsor);

  const [fontGateResult, setFontGateResult] = useState<FontLoadResult | null>(null);
  const [fontGateLoading, setFontGateLoading] = useState(false);

  const activeTemplateRef = useMemo(() => {
    const templateId = programTemplate?.id ?? programSnapshot?.templateId;
    if (!templateId) return null;
    const vortexPackage = templateStore.getVortexPackage(templateId);
    return { source: vortexPackage ? 'vortex' as const : 'native' as const, id: templateId };
  }, [programTemplate?.id, programSnapshot?.templateId, templateStore.vortexPackages]);

  const vortexRenderState = useMemo(() => {
    if (!activeTemplateRef || activeTemplateRef.source !== 'vortex') return null;
    const pkg = templateStore.getVortexPackage(activeTemplateRef.id);
    if (!pkg) return { error: 'Selected Vortex template package is missing.' as const };

    try {
      const scene = sceneFromVortexPackage(pkg);
      const schema = normalizeBindingSchema(pkg.bindings);
      const format = getManifestFormat(pkg.manifest);
      return {
        template: {
          id: pkg.manifest.templateId,
          name: pkg.manifest.templateName,
          canvasWidth: scene.canvas.width,
          canvasHeight: scene.canvas.height,
          layers: scene.layers,
        },
        schema,
        formatLabel: `${format.formatId} · ${scene.canvas.width} × ${scene.canvas.height}`,
        packageRef: pkg,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid Vortex scene data.' };
    }
  }, [activeTemplateRef, templateStore.vortexPackages]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!embed && event.key === 'Escape') navigate('/control-room');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [embed, navigate]);

  useEffect(() => {
    if (!tpl) return;
    const decodedTemplate = decodeTemplatePayload(tpl);
    if (!decodedTemplate) return;

    activateProgramTemplate(decodedTemplate);

    const pkg = templateStore.getVortexPackage(decodedTemplate.id);
    if (!pkg) return;
    const schema = normalizeBindingSchema(pkg.bindings);
    initializeBindings(decodedTemplate.id, schema);
  }, [tpl, activateProgramTemplate, templateStore, initializeBindings]);

  useEffect(() => {
    if (!embed && !tpl) return;
    const { running, start } = useDataEngineStore.getState();
    if (!running) {
      start();
    }
  }, [embed, tpl]);

  useEffect(() => {
    if (!vortexRenderState || !('template' in vortexRenderState) || !vortexRenderState.template || !vortexRenderState.schema) return;
    initializeBindings(vortexRenderState.template.id, vortexRenderState.schema);
    const autoValues = mapDemoBindingDefaults(vortexRenderState.schema.bindings.map((binding) => binding.key), {
      player: selectedPlayer,
      stat: selectedStat,
      sponsor: selectedSponsor,
    });
    if (Object.keys(autoValues).length > 0) {
      setBindingValues(vortexRenderState.template.id, autoValues);
    }
  }, [vortexRenderState, initializeBindings, selectedPlayer, selectedStat, selectedSponsor, setBindingValues]);

  useEffect(() => {
    if (!vortexRenderState || !('template' in vortexRenderState) || !vortexRenderState.packageRef) {
      setFontGateResult(null);
      setFontGateLoading(false);
      return;
    }

    let active = true;
    setFontGateLoading(true);
    loadVortexFonts(vortexRenderState.packageRef, vortexRenderState.template.layers)
      .then((result) => {
        if (!active) return;
        setFontGateResult(result);
      })
      .finally(() => {
        if (!active) return;
        setFontGateLoading(false);
      });

    return () => {
      active = false;
    };
  }, [vortexRenderState]);

  useEffect(() => {
    if (!vortexRenderState || !('template' in vortexRenderState) || !vortexRenderState.template) return;
    const override = fontOverrides[vortexRenderState.template.id];
    setBindingFontGateSatisfied(vortexRenderState.template.id, Boolean(!fontGateResult || fontGateResult.ok || override?.enabled));
  }, [vortexRenderState, fontGateResult, fontOverrides, setBindingFontGateSatisfied]);

  const vortexTemplate = vortexRenderState && 'template' in vortexRenderState ? vortexRenderState.template : undefined;
  const vortexSchema = vortexRenderState && 'template' in vortexRenderState ? vortexRenderState.schema : undefined;
  const bindingState = vortexTemplate ? getBindingState(vortexTemplate.id) : undefined;
  const transformedVortexTemplate = vortexTemplate && vortexSchema ? applyBindingsToScene(vortexTemplate, vortexSchema, bindingState) : undefined;
  const activeTemplate = transformedVortexTemplate || programTemplate || programSnapshot?.sceneDefinition || null;
  const override = vortexTemplate ? fontOverrides[vortexTemplate.id] : undefined;

  const shouldBlockForFonts = Boolean(vortexRenderState?.template && fontGateResult && !fontGateResult.ok && !override?.enabled);
  const shouldBlockForBindings = Boolean(vortexRenderState?.template && bindingState && !bindingState.readyToAir);

  const showDebugOverlay = shouldShowDebugOverlay();
  const showCatalogOverlay = shouldShowCatalogOverlay();
  const catalogHealth = useMemo(() => {
    if (!showCatalogOverlay) return null;
    getCatalogRegistry();
    return getCatalogRegistryHealth();
  }, [showCatalogOverlay]);

  return (
    <section className="relative h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="relative h-full overflow-hidden">
        {!embed && (
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <button className="rounded border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200" onClick={() => navigate('/control-room')}>Back to Control Room</button>
            {activeTemplate ? <StatusBadge tone="on-air">ON AIR</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}
            {vortexTemplate && bindingState?.readyToAir ? <StatusBadge tone="ready">READY</StatusBadge> : null}
          </div>
        )}

        {showDebugOverlay ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded border border-slate-600/80 bg-black/70 px-2 py-1 text-[10px] leading-tight text-slate-200">
            <p>program: {programSnapshot?.templateId ?? 'none'}</p>
            <p>output: {programSnapshot?.templateId ?? 'none'}</p>
            <p>rev pgm:{programRevision} out:{outputRevision}</p>
          </div>
        ) : null}

        {showCatalogOverlay && catalogHealth ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-30 rounded border border-emerald-500/80 bg-black/70 px-2 py-1 text-[10px] leading-tight text-emerald-200">
            <p>catalog built: {String(catalogHealth.built)}</p>
            <p>catalog entries: {catalogHealth.entryCount}</p>
          </div>
        ) : null}

        {vortexRenderState?.error ? (
          <div className="grid h-full place-items-center text-sm text-rose-300">{vortexRenderState.error}</div>
        ) : !activeTemplate ? (
          <div className="grid h-full place-items-center text-sm text-slate-500">No template on air.</div>
        ) : (
          <div className={`relative grid h-full place-items-center overflow-hidden ${embed ? 'p-0' : 'p-4'}`}>
            {fontGateLoading && vortexRenderState?.template && (
              <div className="absolute inset-0 z-20 grid place-items-center text-sm text-slate-200">Loading template fonts…</div>
            )}

            {shouldBlockForFonts && vortexRenderState?.template && fontGateResult && (
              <FontGateOverlay
                templateName={vortexRenderState.template.name}
                formatLabel={vortexRenderState.formatLabel}
                missingFamilies={fontGateResult.missingFamilies}
                loadedFamilies={fontGateResult.loadedFamilies}
                onKeepStopped={() => undefined}
                onOverride={(fallbackFamily) => {
                  if (!vortexTemplate) return;
                  setFontOverride(vortexTemplate.id, {
                    enabled: true,
                    fallbackFamily,
                    timestamp: new Date().toISOString(),
                  });
                }}
              />
            )}

            {shouldBlockForBindings && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-6 text-center text-sm text-rose-200">
                Rendering blocked: required bindings are missing.
              </div>
            )}

            <div
              className="relative h-full w-full"
              style={{
                aspectRatio: `${activeTemplate.canvasWidth} / ${activeTemplate.canvasHeight}`,
                maxWidth: embed ? '100vw' : 'calc(100vw - 2rem)',
                maxHeight: embed ? '100vh' : 'calc(100vh - 2rem)',
                fontFamily: override?.enabled ? override.fallbackFamily : undefined,
              }}
            >
              {!shouldBlockForFonts && !shouldBlockForBindings && (
                <TemplateSceneSvg
                  template={activeTemplate}
                  className="absolute inset-0 h-full w-full"
                  assetResolver={vortexTemplate ? (path) => getVortexAssetUrl(vortexTemplate.id, path) : undefined}
                  debugLiveLabel="output"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
