import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataEngineStore, type SportKey } from '../store/useDataEngineStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { decodeOutputFeedPayload } from '../features/playout/publicUrl';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { createLiveFeedSubscriber } from '../features/liveFeed/liveFeedBus';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';

type FollowMode = 'program' | 'preview';

const shouldShowDebugWatermark = (): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return window.localStorage.getItem('debug_output_watermark') === '1';
};

export function PublicOutputRoute() {
  const [searchParams] = useSearchParams();
  const templateStore = useTemplateStore();
  const [waitingForLiveFeed, setWaitingForLiveFeed] = useState(false);
  const [liveTemplateId, setLiveTemplateId] = useState<string | null>(null);

  const payload = useMemo(() => {
    const encoded = searchParams.get('tpl');
    return encoded ? decodeOutputFeedPayload(encoded) : null;
  }, [searchParams]);

  const templateIdParam = searchParams.get('templateId');
  const followParam = searchParams.get('follow');
  const follow: FollowMode | null = followParam === 'program' || followParam === 'preview' ? followParam : null;

  useEffect(() => {
    if (!follow && !payload) return;

    setLiveTemplateId(null);

    const engine = useDataEngineStore.getState();
    engine.setExternalMode(true);
    engine.clearExternalGame();
    setWaitingForLiveFeed(true);

    const unsubscribe = createLiveFeedSubscriber(({ activeSport, game, ts, programTemplateId, previewTemplateId }) => {
      const nextEngine = useDataEngineStore.getState();
      nextEngine.markBroadcastReceived(ts);
      nextEngine.setExternalGame(game, activeSport as SportKey);

      if (follow) {
        setLiveTemplateId(follow === 'program' ? programTemplateId : previewTemplateId);
      }

      setWaitingForLiveFeed(false);
    });

    return () => {
      unsubscribe();
      const nextEngine = useDataEngineStore.getState();
      nextEngine.setExternalMode(false);
      nextEngine.clearExternalGame();
    };
  }, [follow, payload]);

  const effectiveTemplateId = follow
    ? (liveTemplateId ?? '')
    : (templateIdParam ?? payload?.template.id ?? '');

  const renderState = useMemo(() => {
    if (!effectiveTemplateId) {
      return { template: follow ? null : (payload?.template ?? null), assetResolver: undefined as ((path: string) => string) | undefined };
    }

    const pkg = templateStore.getVortexPackage(effectiveTemplateId);
    if (!pkg) {
      const stored = templateStore.getTemplateById(effectiveTemplateId);
      return { template: stored ?? (follow ? null : (payload?.template ?? null)), assetResolver: undefined as ((path: string) => string) | undefined };
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
        assetResolver: (path: string) => getVortexAssetUrl(pkg.manifest.templateId, path),
      };
    } catch {
      return { template: follow ? null : (payload?.template ?? null), assetResolver: undefined as ((path: string) => string) | undefined };
    }
  }, [effectiveTemplateId, follow, payload?.template, templateStore]);

  const template = renderState.template;
  const showDebugWatermark = shouldShowDebugWatermark();

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent">
      {template ? (
        <div className="h-screen w-screen" style={{ aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}` }}>
          <TemplateSceneSvg template={template} className="h-full w-full" assetResolver={renderState.assetResolver} />
        </div>
      ) : null}

      {showDebugWatermark ? (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-slate-500/70 bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-200">
          {follow ?? 'template'} · {waitingForLiveFeed ? 'warming' : 'live'}
        </div>
      ) : null}
    </main>
  );
}
