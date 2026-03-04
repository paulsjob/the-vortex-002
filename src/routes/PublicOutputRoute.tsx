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

const FOLLOW_PREVIEW_STORAGE_KEY = 'renderless.output.follow.preview.v1';
const FOLLOW_PROGRAM_STORAGE_KEY = 'renderless.output.follow.program.v1';

type FollowTemplatePointer = {
  templateId: string;
  sport: string | null;
  sponsor: string | null;
  ts: number;
};

const readFollowPointer = (follow: FollowMode): FollowTemplatePointer | null => {
  const key = follow === 'preview' ? FOLLOW_PREVIEW_STORAGE_KEY : FOLLOW_PROGRAM_STORAGE_KEY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FollowTemplatePointer;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.templateId !== 'string' || parsed.templateId.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
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

    if (follow) {
      const pointer = readFollowPointer(follow);
      setLiveTemplateId(pointer?.templateId ?? null);
      setWaitingForLiveFeed(!pointer?.templateId);
    } else {
      setLiveTemplateId(null);
      setWaitingForLiveFeed(false);
    }

    const engine = useDataEngineStore.getState();
    engine.setExternalMode(true);
    engine.clearExternalGame();

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

  if (waitingForLiveFeed || !template) {
    return <main className="min-h-screen bg-black" />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black p-4">
      <div className="w-full" style={{ maxWidth: '100vw', maxHeight: '100vh', aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}` }}>
        <TemplateSceneSvg template={template} className="h-full w-full" assetResolver={renderState.assetResolver} />
      </div>
    </main>
  );
}
