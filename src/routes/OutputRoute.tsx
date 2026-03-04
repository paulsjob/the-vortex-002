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
import { decodeOutputFeedPayload } from '../features/playout/publicUrl';
import { createLiveFeedSubscriber } from '../features/liveFeed/liveFeedBus';
import { useDemoSessionStore } from '../store/useDemoSessionStore';
import { useDataEngineStore, type GameState, type SportKey } from '../store/useDataEngineStore';
import { getCatalogRegistry, getCatalogRegistryHealth } from '../components/design/dataBindingPaths';

const FOLLOW_PREVIEW_STORAGE_KEY = 'renderless.output.follow.preview.v1';
const FOLLOW_PROGRAM_STORAGE_KEY = 'renderless.output.follow.program.v1';

type FollowTemplatePointer = {
  templateId: string;
  sport?: SportKey | null;
  sponsor?: string | null;
  ts: number;
};

const parseFollowTemplatePointer = (value: string | null): FollowTemplatePointer | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as FollowTemplatePointer;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.templateId !== 'string' || parsed.templateId.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};

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
  const follow = searchParams.get('follow');
  const followKey = follow === 'preview' ? FOLLOW_PREVIEW_STORAGE_KEY : follow === 'program' ? FOLLOW_PROGRAM_STORAGE_KEY : null;
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
  const [externalTemplateId, setExternalTemplateId] = useState<string | null>(null);
  const [externalTemplate, setExternalTemplate] = useState<NonNullable<ReturnType<typeof usePlayoutStore.getState>['programTemplate']> | null>(null);

  const selectedPlayer = useDemoSessionStore((s) => s.selectedPlayer);
  const selectedStat = useDemoSessionStore((s) => s.selectedStat);
  const selectedSponsor = useDemoSessionStore((s) => s.selectedSponsor);

  const [fontGateResult, setFontGateResult] = useState<FontLoadResult | null>(null);
  const [fontGateLoading, setFontGateLoading] = useState(false);
  const [waitingForLiveFeed, setWaitingForLiveFeed] = useState(false);

  const activeTemplateRef = useMemo(() => {
    const templateId = externalTemplateId ?? externalTemplate?.id ?? programTemplate?.id ?? programSnapshot?.templateId;
    if (!templateId) return null;
    const vortexPackage = templateStore.getVortexPackage(templateId);
    return { source: vortexPackage ? 'vortex' as const : 'native' as const, id: templateId };
  }, [externalTemplateId, externalTemplate?.id, programTemplate?.id, programSnapshot?.templateId, templateStore.vortexPackages]);

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
    const payload = decodeOutputFeedPayload(tpl);
    if (!payload) return;

    activateProgramTemplate(payload.template);

    const pkg = templateStore.getVortexPackage(payload.template.id);
    if (pkg) {
      const schema = normalizeBindingSchema(pkg.bindings);
      initializeBindings(payload.template.id, schema);
    }

    const { running, start } = useDataEngineStore.getState();
    if (!embed && !running) start();
  }, [tpl, embed, activateProgramTemplate, templateStore, initializeBindings]);

  useEffect(() => {
    if (!embed || !followKey) {
      setExternalTemplateId(null);
      setExternalTemplate(null);
      return;
    }

    const applyPointer = (rawPayload: string | null) => {
      const pointer = parseFollowTemplatePointer(rawPayload);
      if (!pointer) {
        setExternalTemplateId(null);
        setExternalTemplate(null);
        return;
      }

      setExternalTemplateId(pointer.templateId);
      const pkg = templateStore.getVortexPackage(pointer.templateId);
      if (pkg) {
        setExternalTemplate(null);
        const schema = normalizeBindingSchema(pkg.bindings);
        initializeBindings(pointer.templateId, schema);
        return;
      }

      const storedTemplate = templateStore.getTemplateById(pointer.templateId);
      if (!storedTemplate) {
        setExternalTemplate(null);
        return;
      }

      setExternalTemplate(storedTemplate);
      activateProgramTemplate(storedTemplate);
    };

    const loadPointerFromStorage = () => {
      try {
        applyPointer(window.localStorage.getItem(followKey));
      } catch (error) {
        console.warn('[output] Failed to read follow pointer from localStorage.', error);
        setExternalTemplateId(null);
        setExternalTemplate(null);
      }
    };

    loadPointerFromStorage();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== followKey) return;
      applyPointer(event.newValue);
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [embed, followKey, activateProgramTemplate, templateStore, initializeBindings]);

  useEffect(() => {
    if (!embed) return;
    if (!tpl && !followKey) return;

    const debugProgram = typeof window !== 'undefined' && window.localStorage.getItem('debug_program') === '1';
    const engine = useDataEngineStore.getState();
    // Embed output must always consume the externally published live feed, never local simulation.
    engine.setExternalMode(true);
    engine.clearExternalGame();
    setWaitingForLiveFeed(true);

    const unsubscribe = createLiveFeedSubscriber(({ activeSport, game, ts }) => {
      setWaitingForLiveFeed(false);
      const nextEngine = useDataEngineStore.getState();
      nextEngine.markBroadcastReceived(ts);
      nextEngine.setExternalGame(game as GameState, activeSport as SportKey);
      if (debugProgram) {
        console.debug('[program] live feed received', {
          ts,
          deltaMs: Date.now() - ts,
        });
      }
    });

    return () => {
      unsubscribe();
      const nextEngine = useDataEngineStore.getState();
      nextEngine.setExternalMode(false);
      nextEngine.clearExternalGame();
    };
  }, [embed, tpl, followKey]);

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
  const activeTemplate = transformedVortexTemplate || externalTemplate || programTemplate || programSnapshot?.sceneDefinition || null;
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
        ) : waitingForLiveFeed && embed ? (
          <div className="grid h-full place-items-center text-sm text-slate-400">Waiting for Program…</div>
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
