import { create } from 'zustand';
import {
  applyConsistencyLayer,
  createSimulatorContext,
  DEFAULT_SIM_SEED,
  formatClock,
  resetSimulationCore,
} from '../features/simulation/core';
import { simulatorRegistry } from '../features/simulation/registry';
import type {
  ConsistencyStatus,
  GameState,
  SimPlayByPlayEvent,
  SimulationEvent,
  SimulationFrame,
  SportKey,
} from '../features/simulation/types';
import {
  buildCanonicalEvent,
  buildLiveBindingPayload,
  buildSimulationFrame,
  createPlaceholderEvent,
  validateFrameInvariants,
} from '../features/simulation/feed';

export type { GameState, SportKey, SimulationFrame, SimPlayByPlayEvent };
export type Speed = 'slow' | 'normal' | 'fast';

interface DataEngineStore {
  activeSport: SportKey;
  game: GameState;
  running: boolean;
  externalMode: boolean;
  externalGame: GameState | null;
  livePublisherActive: boolean;
  lastBroadcastAt: number | null;
  speed: Speed;
  seed: number;
  sequence: number;
  simTimeMs: number;
  eventDepth: number;
  history: SimPlayByPlayEvent[];
  simFrame: SimulationFrame | null;
  livePayload: Record<string, unknown>;
  consistency: ConsistencyStatus;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setSpeed: (speed: Speed) => void;
  setSport: (sport: SportKey) => void;
  setSeed: (seed: number) => void;
  setEventDepth: (depth: number) => void;
  stepPitch: (action?: string) => void;
  setExternalMode: (enabled: boolean) => void;
  setExternalGame: (game: GameState, sport: SportKey) => void;
  clearExternalGame: () => void;
  setLivePublisherActive: (active: boolean) => void;
  markBroadcastReceived: (timestamp?: number) => void;
  forceActions: string[];
}

const speedsMs: Record<Speed, number> = {
  slow: 1200,
  normal: 450,
  fast: 100,
};

const eventSpacingBySpeed: Record<Speed, { min: number; max: number }> = {
  slow: { min: 800, max: 1600 },
  normal: { min: 250, max: 700 },
  fast: { min: 50, max: 150 },
};

let timer: ReturnType<typeof setInterval> | null = null;
const ctx = createSimulatorContext();

const normalizeSeed = (seed: number) => {
  if (!Number.isFinite(seed)) return DEFAULT_SIM_SEED;
  const normalized = Math.abs(Math.floor(seed)) >>> 0;
  return normalized === 0 ? DEFAULT_SIM_SEED : normalized;
};

const makeLegacyEventFromGame = (game: GameState, id: number): SimulationEvent => ({
  id,
  summary: game.lastEvent,
  periodLabel: game.periodLabel,
  clockLabel: formatClock(game.clockSeconds),
  scoreHome: game.scoreHome,
  scoreAway: game.scoreAway,
  eventType: game.lastPlay.type,
  team: game.possession === 'home' ? game.homeTeam : game.awayTeam,
  player: typeof game.lastPlay.player === 'string' ? game.lastPlay.player : 'N/A',
  payload: game.context,
});

const buildFrameFromGame = (input: {
  game: GameState;
  history: SimPlayByPlayEvent[];
  seed: number;
  speed: Speed;
  status: 'running' | 'paused' | 'external';
  sequence: number;
  simTimeMs: number;
  previousFrame: SimulationFrame | null;
}) => {
  const { game, history, seed, speed, status, sequence, simTimeMs, previousFrame } = input;
  const event = sequence > 0
    ? buildCanonicalEvent({
      game,
      legacyEvent: makeLegacyEventFromGame(game, sequence),
      sequence,
      simTimeMs,
    })
    : createPlaceholderEvent(game);

  const recent = sequence > 0 ? [event, ...history] : [...history];
  const frame = buildSimulationFrame({
    game,
    canonicalEvent: event,
    recentEvents: recent,
    seed,
    speed,
    status,
  });

  const invariantIssues = validateFrameInvariants(previousFrame, event, frame.snapshot);
  if (invariantIssues.length > 0) {
    frame.snapshot.consistencyIssues = [
      ...(frame.snapshot.consistencyIssues ?? []),
      ...invariantIssues,
    ];
  }

  return {
    frame,
    history: recent,
    invariantIssues,
  };
};

const buildInitialRuntime = (sport: SportKey, seed: number, speed: Speed, eventDepth: number) => {
  resetSimulationCore(seed);
  const game = simulatorRegistry[sport].createInitialGame();
  const { frame } = buildFrameFromGame({
    game,
    history: [],
    seed,
    speed,
    status: 'paused',
    sequence: 0,
    simTimeMs: 0,
    previousFrame: null,
  });

  return {
    game,
    history: [] as SimPlayByPlayEvent[],
    frame,
    livePayload: buildLiveBindingPayload(frame),
    consistency: {
      corrected: false,
      corrections: 0,
      ok: (frame.snapshot.consistencyIssues ?? []).length === 0,
      issues: frame.snapshot.consistencyIssues ?? [],
    } satisfies ConsistencyStatus,
    forceActions: simulatorRegistry[sport].forceActions ?? [],
    sequence: 0,
    simTimeMs: 0,
    eventDepth,
  };
};

const runInterval = (get: () => DataEngineStore) => {
  timer = setInterval(() => {
    if (get().externalMode) return;
    get().stepPitch();
  }, speedsMs[get().speed]);
};

const computeBurstCount = (action: string | undefined) => {
  if (action) return 1;
  const roll = ctx.random();
  if (roll > 0.965) return 3;
  if (roll > 0.87) return 2;
  return 1;
};

const initialRuntime = buildInitialRuntime('mlb', DEFAULT_SIM_SEED, 'normal', 120);

export const useDataEngineStore = create<DataEngineStore>((set, get) => ({
  activeSport: 'mlb',
  game: initialRuntime.game,
  running: false,
  externalMode: false,
  externalGame: null,
  livePublisherActive: false,
  lastBroadcastAt: null,
  speed: 'normal',
  seed: DEFAULT_SIM_SEED,
  sequence: initialRuntime.sequence,
  simTimeMs: initialRuntime.simTimeMs,
  eventDepth: initialRuntime.eventDepth,
  history: initialRuntime.history,
  simFrame: initialRuntime.frame,
  livePayload: initialRuntime.livePayload,
  consistency: initialRuntime.consistency,
  forceActions: initialRuntime.forceActions,

  start: () => {
    if (timer || get().externalMode) return;
    set({ running: true });
    runInterval(get);
  },

  stop: () => {
    if (timer) clearInterval(timer);
    timer = null;
    set({ running: false });
  },

  setSpeed: (speed) => {
    set({ speed });
    if (!get().running) return;
    if (timer) clearInterval(timer);
    runInterval(get);
  },

  setSeed: (seed) => {
    const normalizedSeed = normalizeSeed(seed);
    const state = get();
    const runtime = buildInitialRuntime(state.activeSport, normalizedSeed, state.speed, state.eventDepth);
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    set({
      seed: normalizedSeed,
      running: false,
      externalMode: false,
      externalGame: null,
      game: runtime.game,
      history: runtime.history,
      simFrame: runtime.frame,
      livePayload: runtime.livePayload,
      consistency: runtime.consistency,
      sequence: runtime.sequence,
      simTimeMs: runtime.simTimeMs,
      forceActions: runtime.forceActions,
    });
  },

  setEventDepth: (depth) => {
    const safeDepth = clampDepth(depth);
    set((state) => ({
      eventDepth: safeDepth,
      history: state.history.slice(0, safeDepth),
    }));
  },

  setSport: (sport) => {
    if (timer) clearInterval(timer);
    timer = null;
    const state = get();
    const runtime = buildInitialRuntime(sport, state.seed, state.speed, state.eventDepth);
    set({
      activeSport: sport,
      running: false,
      externalMode: false,
      externalGame: null,
      game: runtime.game,
      history: runtime.history,
      simFrame: runtime.frame,
      livePayload: runtime.livePayload,
      consistency: runtime.consistency,
      forceActions: runtime.forceActions,
      sequence: runtime.sequence,
      simTimeMs: runtime.simTimeMs,
    });
  },

  reset: () => {
    if (timer) clearInterval(timer);
    timer = null;
    const state = get();
    const runtime = buildInitialRuntime(state.activeSport, state.seed, state.speed, state.eventDepth);
    set({
      running: false,
      externalMode: false,
      externalGame: null,
      game: runtime.game,
      history: runtime.history,
      simFrame: runtime.frame,
      livePayload: runtime.livePayload,
      consistency: runtime.consistency,
      forceActions: runtime.forceActions,
      sequence: runtime.sequence,
      simTimeMs: runtime.simTimeMs,
    });
  },

  stepPitch: (action) => {
    const state = get();
    const plugin = simulatorRegistry[state.activeSport];
    const burstCount = computeBurstCount(action);

    let nextGame = state.game;
    let nextHistory = [...state.history];
    let nextConsistency = { ...state.consistency };
    let nextSequence = state.sequence;
    let nextSimTimeMs = state.simTimeMs;
    let previousFrame = state.simFrame;
    let nextFrame = state.simFrame;

    const spacing = eventSpacingBySpeed[state.speed];

    for (let i = 0; i < burstCount; i += 1) {
      const previousGame = nextGame;
      const stepResult = action && i === 0 && plugin.forcePlay
        ? plugin.forcePlay(nextGame, ctx, nextHistory, action)
        : plugin.step(nextGame, ctx, nextHistory);

      const normalized = applyConsistencyLayer({
        sport: state.activeSport,
        previous: previousGame,
        nextGame: stepResult.game,
        event: stepResult.event,
        history: nextHistory,
      });

      nextGame = normalized.game;
      nextSequence += 1;
      nextSimTimeMs += ctx.randomInt(spacing.min, spacing.max);

      const canonical = buildCanonicalEvent({
        game: nextGame,
        legacyEvent: stepResult.event,
        sequence: nextSequence,
        simTimeMs: nextSimTimeMs,
      });

      const recent = [canonical, ...nextHistory].slice(0, state.eventDepth);
      const status: 'running' | 'paused' | 'external' = state.externalMode
        ? 'external'
        : state.running
          ? 'running'
          : 'paused';

      const frame = buildSimulationFrame({
        game: nextGame,
        canonicalEvent: canonical,
        recentEvents: recent,
        seed: state.seed,
        speed: state.speed,
        status,
      });

      const invariantIssues = validateFrameInvariants(previousFrame, canonical, frame.snapshot);
      const allIssues = [
        ...(frame.snapshot.consistencyIssues ?? []),
        ...invariantIssues,
      ];
      if (allIssues.length > 0) {
        frame.snapshot.consistencyIssues = [...new Set(allIssues)];
      }

      nextConsistency = {
        corrected: normalized.consistency.corrected || invariantIssues.length > 0,
        corrections: normalized.consistency.corrections + invariantIssues.length,
        ok: (frame.snapshot.consistencyIssues ?? []).length === 0,
        issues: frame.snapshot.consistencyIssues ?? [],
      };

      nextHistory = recent;
      nextFrame = frame;
      previousFrame = frame;
    }

    if (!nextFrame) {
      const built = buildFrameFromGame({
        game: nextGame,
        history: nextHistory,
        seed: state.seed,
        speed: state.speed,
        status: state.externalMode ? 'external' : state.running ? 'running' : 'paused',
        sequence: nextSequence,
        simTimeMs: nextSimTimeMs,
        previousFrame,
      });
      nextFrame = built.frame;
      nextHistory = built.history.slice(0, state.eventDepth);
      nextConsistency = {
        corrected: built.invariantIssues.length > 0,
        corrections: built.invariantIssues.length,
        ok: built.invariantIssues.length === 0,
        issues: built.invariantIssues,
      };
    }

    set({
      game: nextGame,
      history: nextHistory,
      consistency: nextConsistency,
      sequence: nextSequence,
      simTimeMs: nextSimTimeMs,
      simFrame: nextFrame,
      livePayload: buildLiveBindingPayload(nextFrame),
      forceActions: simulatorRegistry[nextGame.sport].forceActions ?? [],
      activeSport: nextGame.sport,
    });
  },

  setExternalMode: (enabled) => {
    if (enabled && timer) {
      clearInterval(timer);
      timer = null;
    }

    set((state) => {
      const status: 'running' | 'paused' | 'external' = enabled ? 'external' : state.running ? 'running' : 'paused';
      const game = enabled && state.externalGame ? state.externalGame : state.game;
      const { frame } = buildFrameFromGame({
        game,
        history: state.history,
        seed: state.seed,
        speed: state.speed,
        status,
        sequence: state.sequence,
        simTimeMs: state.simTimeMs,
        previousFrame: state.simFrame,
      });

      return {
        externalMode: enabled,
        running: enabled ? false : state.running,
        externalGame: enabled ? state.externalGame : null,
        simFrame: frame,
        livePayload: buildLiveBindingPayload(frame),
      };
    });
  },

  setExternalGame: (game, sport) => {
    set((state) => {
      const nextSequence = state.sequence + 1;
      const nextSimTimeMs = state.simTimeMs + 1;
      const legacyEvent = makeLegacyEventFromGame(game, nextSequence);
      const canonical = buildCanonicalEvent({
        game,
        legacyEvent,
        sequence: nextSequence,
        simTimeMs: nextSimTimeMs,
      });
      const recent = [canonical, ...state.history].slice(0, state.eventDepth);
      const frame = buildSimulationFrame({
        game,
        canonicalEvent: canonical,
        recentEvents: recent,
        seed: state.seed,
        speed: state.speed,
        status: 'external',
      });

      const invariantIssues = validateFrameInvariants(state.simFrame, canonical, frame.snapshot);
      if (invariantIssues.length > 0) {
        frame.snapshot.consistencyIssues = [...(frame.snapshot.consistencyIssues ?? []), ...invariantIssues];
      }

      return {
        externalMode: true,
        externalGame: game,
        game,
        activeSport: sport,
        running: false,
        sequence: nextSequence,
        simTimeMs: nextSimTimeMs,
        history: recent,
        simFrame: frame,
        livePayload: buildLiveBindingPayload(frame),
        forceActions: simulatorRegistry[sport].forceActions ?? [],
        consistency: {
          corrected: invariantIssues.length > 0,
          corrections: invariantIssues.length,
          ok: (frame.snapshot.consistencyIssues ?? []).length === 0,
          issues: frame.snapshot.consistencyIssues ?? [],
        },
      };
    });
  },

  clearExternalGame: () => {
    set((state) => {
      const { frame } = buildFrameFromGame({
        game: state.game,
        history: state.history,
        seed: state.seed,
        speed: state.speed,
        status: state.running ? 'running' : 'paused',
        sequence: state.sequence,
        simTimeMs: state.simTimeMs,
        previousFrame: state.simFrame,
      });

      return {
        externalGame: null,
        simFrame: frame,
        livePayload: buildLiveBindingPayload(frame),
      };
    });
  },

  setLivePublisherActive: (active) => {
    set({ livePublisherActive: active });
  },

  markBroadcastReceived: (timestamp) => {
    set({ lastBroadcastAt: timestamp ?? Date.now() });
  },
}));

function clampDepth(value: number) {
  if (!Number.isFinite(value)) return 120;
  return Math.min(500, Math.max(20, Math.floor(value)));
}
