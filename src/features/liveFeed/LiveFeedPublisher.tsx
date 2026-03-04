import { useEffect } from 'react';
import { createLiveFeedPublisher } from './liveFeedBus';
import { useDataEngineStore } from '../../store/useDataEngineStore';
import { usePlayoutStore } from '../../store/usePlayoutStore';

type Props = {
  enabled: boolean;
};

export function LiveFeedPublisher({ enabled }: Props) {
  useEffect(() => {
    const engine = useDataEngineStore.getState();
    if (!enabled) {
      engine.setLivePublisherActive(false);
      return;
    }

    // Publisher runs only in the main app runtime (Control Room / in-app Output), not public/embed pages.
    engine.setLivePublisherActive(true);
    const stopPublisher = createLiveFeedPublisher(() => {
      const { running, activeSport, game } = useDataEngineStore.getState();
      const { programTemplate, previewTemplate } = usePlayoutStore.getState();
      return {
        running,
        activeSport,
        game,
        programTemplateId: programTemplate?.id ?? null,
        previewTemplateId: previewTemplate?.id ?? null,
      };
    }, 250);

    return () => {
      stopPublisher();
      useDataEngineStore.getState().setLivePublisherActive(false);
    };
  }, [enabled]);

  return null;
}
