const CHANNEL = 'renderless-live-feed-v1';

export type LiveFeedMessage =
  | { type: 'hello'; from: string }
  | { type: 'state'; from: string; ts: number; activeSport: string; game: any }
  | { type: 'bye'; from: string };

type PublisherState = {
  running: boolean;
  activeSport: string;
  game: unknown;
};

const createSourceId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createLiveFeedPublisher(getStateFn: () => PublisherState, intervalMs = 250) {
  if (typeof BroadcastChannel === 'undefined') return () => undefined;

  const channel = new BroadcastChannel(CHANNEL);
  const from = createSourceId();
  channel.postMessage({ type: 'hello', from } as LiveFeedMessage);

  const timer = setInterval(() => {
    const { running, activeSport, game } = getStateFn();
    if (!running || !game) return;
    channel.postMessage({
      type: 'state',
      from,
      ts: Date.now(),
      activeSport,
      game,
    } as LiveFeedMessage);
  }, intervalMs);

  return () => {
    clearInterval(timer);
    channel.postMessage({ type: 'bye', from } as LiveFeedMessage);
    channel.close();
  };
}

export function createLiveFeedSubscriber(onState: (payload: { activeSport: string; game: any; ts: number }) => void) {
  if (typeof BroadcastChannel === 'undefined') return () => undefined;

  const channel = new BroadcastChannel(CHANNEL);
  const onMessage = (event: MessageEvent<LiveFeedMessage>) => {
    const message = event.data;
    if (!message || message.type !== 'state') return;
    onState({ activeSport: message.activeSport, game: message.game, ts: message.ts });
  };

  channel.addEventListener('message', onMessage);
  return () => {
    channel.removeEventListener('message', onMessage);
    channel.close();
  };
}
