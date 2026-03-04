import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataEngineStore, type SportKey } from '../store/useDataEngineStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { decodeOutputFeedPayload } from '../features/playout/publicUrl';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { createLiveFeedSubscriber } from '../features/liveFeed/liveFeedBus';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';

export function PublicOutputRoute() {
  const [searchParams] = useSearchParams();
  const templateStore = useTemplateStore();
  const [waitingForLiveFeed, setWaitingForLiveFeed] = useState(false);
  const payload = useMemo(() => {
    const encoded = searchParams.get('tpl');
    return encoded ? decodeOutputFeedPayload(encoded) : null;
  }, [searchParams]);
  const templateIdParam = searchParams.get('templateId');
  const effectiveTemplateId = templateIdParam ?? payload?.template.id ?? '';

  useEffect(() => {
    if (!payload) return;

    const engine = useDataEngineStore.getState();
    // Public/embed output subscribes to the live feed and keeps externalMode enabled.
    engine.setExternalMode(true);
    engine.clearExternalGame();
    setWaitingForLiveFeed(true);

    const unsubscribe = createLiveFeedSubscriber(({ activeSport, game, ts }) => {
      setWaitingForLiveFeed(false);
      const nextEngine = useDataEngineStore.getState();
      nextEngine.markBroadcastReceived(ts);
      nextEngine.setExternalGame(game, activeSport as SportKey);
    });

    return () => {
      unsubscribe();
      const nextEngine = useDataEngineStore.getState();
      nextEngine.setExternalMode(false);
      nextEngine.clearExternalGame();
    };
  }, [payload]);

  const renderState = useMemo(() => {
    if (!effectiveTemplateId) {
      return { template: payload?.template ?? null, assetResolver: undefined as ((path: string) => string) | undefined };
    }

    const pkg = templateStore.getVortexPackage(effectiveTemplateId);
    if (!pkg) {
      return { template: payload?.template ?? null, assetResolver: undefined as ((path: string) => string) | undefined };
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
      return { template: payload?.template ?? null, assetResolver: undefined as ((path: string) => string) | undefined };
    }
  }, [effectiveTemplateId, payload?.template, templateStore]);

  const template = renderState.template;

  if (!template) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-slate-300">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Output unavailable</h1>
          <p className="text-sm text-slate-500">No output template payload was provided.</p>
        </div>
      </main>
    );
  }

  if (waitingForLiveFeed) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-slate-300">
        <p className="text-sm">Waiting for program…</p>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black p-4">
      <div className="w-full" style={{ maxWidth: '100vw', maxHeight: '100vh', aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}` }}>
        <TemplateSceneSvg template={template} className="h-full w-full" assetResolver={renderState.assetResolver} debugLiveLabel="output" />
      </div>
    </main>
  );
}
