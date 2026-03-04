import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataEngineStore, type SportKey } from '../store/useDataEngineStore';
import { useTemplateStore, type SavedTemplate } from '../store/useTemplateStore';
import { decodeOutputFeedPayload } from '../features/playout/publicUrl';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { createLiveFeedSubscriber } from '../features/liveFeed/liveFeedBus';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';

type FollowMode = 'program' | 'preview';

type TemplateLike = SavedTemplate | null;

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

const isSavedTemplate = (value: unknown): value is SavedTemplate => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && Array.isArray(value.layers);
};

const extractTemplateFromState = (game: unknown, follow: FollowMode): TemplateLike => {
  if (!isRecord(game)) return null;

  const candidates = follow === 'program'
    ? [game.programTemplate, game.program, game.programSnapshot, game.outputTemplate, game.output]
    : [game.previewTemplate, game.preview, game.previewSnapshot];

  for (const candidate of candidates) {
    if (isSavedTemplate(candidate)) {
      return candidate;
    }
    if (isRecord(candidate) && isSavedTemplate(candidate.sceneDefinition)) {
      return candidate.sceneDefinition;
    }
  }

  return null;
};

const extractTemplateIdFromState = (game: unknown, follow: FollowMode): string | null => {
  if (!isRecord(game)) return null;

  const candidates = follow === 'program'
    ? [game.programTemplateId, game.programId, game.outputTemplateId, game.outputId, game.programSnapshot]
    : [game.previewTemplateId, game.previewId, game.previewSnapshot];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate;
    if (isRecord(candidate) && typeof candidate.templateId === 'string') return candidate.templateId;
  }

  const nested = follow === 'program' ? game.program : game.preview;
  if (isRecord(nested) && typeof nested.templateId === 'string') {
    return nested.templateId;
  }

  return null;
};

export function PublicOutputRoute() {
  const [searchParams] = useSearchParams();
  const templateStore = useTemplateStore();
  const [waitingForLiveFeed, setWaitingForLiveFeed] = useState(false);
  const [liveTemplate, setLiveTemplate] = useState<TemplateLike>(null);
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

    setLiveTemplate(null);
    setLiveTemplateId(null);

    const engine = useDataEngineStore.getState();
    engine.setExternalMode(true);
    engine.clearExternalGame();
    setWaitingForLiveFeed(true);

    const unsubscribe = createLiveFeedSubscriber(({ activeSport, game, ts }) => {
      const nextEngine = useDataEngineStore.getState();
      nextEngine.markBroadcastReceived(ts);
      nextEngine.setExternalGame(game, activeSport as SportKey);

      if (follow) {
        const nextTemplate = extractTemplateFromState(game, follow);
        const nextTemplateId = extractTemplateIdFromState(game, follow);
        setLiveTemplate(nextTemplate);
        setLiveTemplateId(nextTemplate?.id ?? nextTemplateId ?? null);
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
    ? (liveTemplateId ?? liveTemplate?.id ?? templateIdParam ?? payload?.template.id ?? '')
    : (templateIdParam ?? payload?.template.id ?? '');

  const renderState = useMemo(() => {
    if (follow && liveTemplate) {
      return { template: liveTemplate, assetResolver: undefined as ((path: string) => string) | undefined };
    }

    if (!effectiveTemplateId) {
      return { template: payload?.template ?? null, assetResolver: undefined as ((path: string) => string) | undefined };
    }

    const pkg = templateStore.getVortexPackage(effectiveTemplateId);
    if (!pkg) {
      const stored = templateStore.getTemplateById(effectiveTemplateId);
      return { template: stored ?? payload?.template ?? null, assetResolver: undefined as ((path: string) => string) | undefined };
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
  }, [effectiveTemplateId, follow, liveTemplate, payload?.template, templateStore]);

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
