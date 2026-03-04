import type { GameState, SimulationEvent, SimulatorContext, SportKey, ConsistencyStatus } from './types';

export const DEFAULT_SIM_SEED = 123456789;
let activeSeed = DEFAULT_SIM_SEED;
let rngState = DEFAULT_SIM_SEED;
let sequence = 0;

const normalizeSeed = (seed: number) => {
  if (!Number.isFinite(seed)) return DEFAULT_SIM_SEED;
  const normalized = Math.abs(Math.floor(seed)) >>> 0;
  return normalized === 0 ? DEFAULT_SIM_SEED : normalized;
};

const nextRandom = () => {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState / 4294967296;
};

export const getSimulationSeed = () => activeSeed;

export const setSimulationSeed = (seed: number) => {
  activeSeed = normalizeSeed(seed);
  rngState = activeSeed;
};

export const resetSimulationCore = (seed?: number) => {
  activeSeed = normalizeSeed(seed ?? activeSeed);
  rngState = activeSeed;
  sequence = 0;
};

export const createSimulatorContext = (): SimulatorContext => ({
  nextId: () => {
    sequence += 1;
    return sequence;
  },
  random: () => nextRandom(),
  randomInt: (min, max) => {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    if (high <= low) return low;
    return Math.floor(low + nextRandom() * (high - low + 1));
  },
  pick: <T>(values: readonly T[]) => values[Math.floor(nextRandom() * values.length)]!,
});

export const formatClock = (clockSeconds: number) => {
  const safe = Math.max(0, Math.floor(clockSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const deriveMlbOuts = (game: GameState, previous: GameState) => {
  const outs = Number(game.context.outs ?? 0);
  const prevOuts = Number(previous.context.outs ?? 0);
  const clamped = clamp(Math.round(outs), 0, 2);
  return clamped < prevOuts && game.scoreHome === previous.scoreHome && game.scoreAway === previous.scoreAway
    ? prevOuts
    : clamped;
};

export const applyConsistencyLayer = ({
  sport,
  previous,
  nextGame,
  event,
}: {
  sport: SportKey;
  previous: GameState;
  nextGame: GameState;
  event: SimulationEvent;
  history: SimulationEvent[];
}) => {
  const game = structuredClone(nextGame);
  let corrections = 0;

  if (game.scoreHome < previous.scoreHome) {
    game.scoreHome = previous.scoreHome;
    corrections += 1;
  }
  if (game.scoreAway < previous.scoreAway) {
    game.scoreAway = previous.scoreAway;
    corrections += 1;
  }

  game.clockSeconds = Math.max(0, Math.floor(game.clockSeconds));
  game.clockDisplay = formatClock(game.clockSeconds);

  if (sport === 'nfl') {
    const down = clamp(Number(game.context.down ?? 1), 1, 4);
    if (down !== game.context.down) corrections += 1;
    game.context.down = down;
  }

  if (sport === 'mlb') {
    const fixedOuts = deriveMlbOuts(game, previous);
    if (fixedOuts !== game.context.outs) corrections += 1;
    game.context.outs = fixedOuts;
  }

  if (sport === 'nba') {
    const shotClock = clamp(Number(game.context.shotClock ?? 24), 0, 24);
    if (shotClock !== game.context.shotClock) corrections += 1;
    game.context.shotClock = shotClock;
  }

  return {
    game,
    event: {
      ...event,
      scoreHome: game.scoreHome,
      scoreAway: game.scoreAway,
      clockLabel: game.clockDisplay,
      periodLabel: game.periodLabel,
    },
    consistency: {
      corrected: corrections > 0,
      corrections,
      ok: corrections === 0,
      issues: corrections === 0 ? [] : ['CONSISTENCY_ADJUSTED'],
    } satisfies ConsistencyStatus,
  };
};
