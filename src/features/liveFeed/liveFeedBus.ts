const CHANNEL = 'renderless-live-feed-v1';
const LIVE_FEED_LAST_STORAGE_KEY = 'renderless_live_feed_last';
const PROGRAM_CHANNEL = 'renderless:program';
const PROGRAM_SNAPSHOT_STORAGE_KEY = 'renderless:program:snapshot';

export type LiveFeedMessage =
  | { type: 'hello'; from: string }
  | { type: 'state'; from: string; ts: number; activeSport: string; game: any }
  | { type: 'bye'; from: string };

export type ProgramState = {
  activeSport: string;
  game: unknown;
};

export type ProgramSnapshotMessage = {
  type: 'PROGRAM_SNAPSHOT';
  state: ProgramState;
  ts: number;
};

export type ProgramPatchMessage = {
  type: 'PROGRAM_PATCH';
  patch: unknown;
  ts: number;
};

export type ProgramBroadcastMessage = ProgramSnapshotMessage | ProgramPatchMessage;

type PublisherState = {
  running: boolean;
  activeSport: string;
  game: unknown;
};

const createSourceId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createLiveFeedPublisher(getStateFn: () => PublisherState, intervalMs = 250) {
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  const from = createSourceId();
  channel?.postMessage({ type: 'hello', from } as LiveFeedMessage);

  const timer = setInterval(() => {
    const { running, activeSport, game } = getStateFn();
    if (!game) return;

    const message = {
      type: 'state',
      from,
      ts: Date.now(),
      activeSport,
      game,
    } as LiveFeedMessage;

    // Persist the latest live payload so embed/public output tabs can catch up instantly on refresh.
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LIVE_FEED_LAST_STORAGE_KEY, JSON.stringify(message));
      } catch {
        // Ignore persistence failures and keep broadcasting current live values.
      }
    }

    // Only broadcast when the in-app runtime is active, but still keep the snapshot fresh in storage.
    if (running) {
      channel?.postMessage(message);
      try {
        void fetch('/api/renderless/livefeed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
          keepalive: true,
        });
      } catch {
        // Ignore fallback transport failures.
      }
    }
  }, intervalMs);

  return () => {
    clearInterval(timer);
    channel?.postMessage({ type: 'bye', from } as LiveFeedMessage);
    channel?.close();
  };
}

export function createLiveFeedSubscriber(onState: (payload: { activeSport: string; game: any; ts: number }) => void) {
  let lastSeenTs = 0;
  let sawBroadcastUpdate = false;
  let hasStateUpdate = false;
  let fallbackPollTimer: ReturnType<typeof setInterval> | undefined;
  let fallbackStartTimer: ReturnType<typeof setTimeout> | undefined;

  const maybeEmitState = (state: { activeSport: string; game: any; ts: number }) => {
    if (typeof state.ts !== 'number' || state.ts <= lastSeenTs) return;
    lastSeenTs = state.ts;
    hasStateUpdate = true;
    onState(state);
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LIVE_FEED_LAST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LiveFeedMessage;
        if (parsed && parsed.type === 'state') {
          // Instant catch-up for refreshes before the next BroadcastChannel tick arrives.
          maybeEmitState({ activeSport: parsed.activeSport, game: parsed.game, ts: parsed.ts });
        }
      }
    } catch {
      // Ignore invalid snapshots and continue with channel updates.
    }
  }

  const startPollingFallback = () => {
    if (fallbackPollTimer) return;

    fallbackPollTimer = setInterval(() => {
      try {
        void fetch('/api/renderless/livefeed', {
          method: 'GET',
          cache: 'no-store',
        })
          .then(async (response) => {
            if (!response.ok) return;
            const message = (await response.json()) as LiveFeedMessage;
            if (!message || message.type !== 'state') return;
            maybeEmitState({ activeSport: message.activeSport, game: message.game, ts: message.ts });
          })
          .catch(() => {
            // Ignore fallback transport errors.
          });
      } catch {
        // Ignore fallback transport errors.
      }
    }, 250);
  };

  if (typeof BroadcastChannel === 'undefined') {
    startPollingFallback();
    return () => {
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer);
      }
    };
  }

  const channel = new BroadcastChannel(CHANNEL);
  const onMessage = (event: MessageEvent<LiveFeedMessage>) => {
    const message = event.data;
    if (!message || message.type !== 'state') return;
    sawBroadcastUpdate = true;
    maybeEmitState({ activeSport: message.activeSport, game: message.game, ts: message.ts });
  };

  fallbackStartTimer = setTimeout(() => {
    if (!hasStateUpdate && !sawBroadcastUpdate) {
      startPollingFallback();
    }
  }, 750);

  channel.addEventListener('message', onMessage);
  return () => {
    if (fallbackStartTimer) {
      clearTimeout(fallbackStartTimer);
    }
    if (fallbackPollTimer) {
      clearInterval(fallbackPollTimer);
    }
    channel.removeEventListener('message', onMessage);
    channel.close();
  };
}

const toProgramSnapshot = (state: PublisherState): ProgramSnapshotMessage => ({
  type: 'PROGRAM_SNAPSHOT',
  state: {
    activeSport: state.activeSport,
    game: state.game,
  },
  ts: Date.now(),
});

export function persistProgramSnapshot(snapshot: ProgramSnapshotMessage) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRAM_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore persistence failures and continue with broadcast updates.
  }
}

export function readPersistedProgramSnapshot(): ProgramSnapshotMessage | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROGRAM_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgramSnapshotMessage;
    if (!parsed || parsed.type !== 'PROGRAM_SNAPSHOT' || !parsed.state || typeof parsed.ts !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createProgramFeedPublisher(
  getStateFn: () => PublisherState,
  subscribeFn: (listener: (state: PublisherState, previousState: PublisherState) => void) => () => void,
) {
  if (typeof BroadcastChannel === 'undefined') return () => undefined;

  const channel = new BroadcastChannel(PROGRAM_CHANNEL);
  const publishSnapshot = () => {
    const snapshot = toProgramSnapshot(getStateFn());
    persistProgramSnapshot(snapshot);
    channel.postMessage(snapshot);
  };

  publishSnapshot();
  const unsubscribe = subscribeFn((state, previousState) => {
    if (state.game === previousState.game && state.activeSport === previousState.activeSport) return;
    publishSnapshot();
  });

  return () => {
    unsubscribe();
    channel.close();
  };
}

export function createProgramFeedSubscriber(onMessage: (message: ProgramBroadcastMessage) => void) {
  if (typeof BroadcastChannel === 'undefined') return () => undefined;

  const channel = new BroadcastChannel(PROGRAM_CHANNEL);
  const onBroadcast = (event: MessageEvent<ProgramBroadcastMessage>) => {
    const message = event.data;
    if (!message || (message.type !== 'PROGRAM_SNAPSHOT' && message.type !== 'PROGRAM_PATCH')) return;
    onMessage(message);
  };

  channel.addEventListener('message', onBroadcast);
  return () => {
    channel.removeEventListener('message', onBroadcast);
    channel.close();
  };
}
