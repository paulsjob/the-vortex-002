import { create } from 'zustand';
import { applyConsistencyLayer, createSimulatorContext, resetSimulationCore } from '../features/simulation/core';
import { simulatorRegistry } from '../features/simulation/registry';
import type { ConsistencyStatus, GameState, SimulationEvent, SportKey } from '../features/simulation/types';

export type { GameState, SportKey };
export type Speed = 'slow' | 'normal' | 'fast';

interface DataEngineStore {
  activeSport: SportKey;
  game: GameState;
  running: boolean;
  speed: Speed;
  history: SimulationEvent[];
  consistency: ConsistencyStatus;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setSpeed: (speed: Speed) => void;
  setSport: (sport: SportKey) => void;
  stepPitch: () => void;
}

const speedsMs: Record<Speed, number> = { slow: 1800, normal: 900, fast: 350 };

let timer: ReturnType<typeof setInterval> | null = null;
const ctx = createSimulatorContext();

const runInterval = (get: () => DataEngineStore) => {
  timer = setInterval(() => {
    get().stepPitch();
  }, speedsMs[get().speed]);
};

export const useDataEngineStore = create<DataEngineStore>((set, get) => ({
  activeSport: 'mlb',
  game: simulatorRegistry.mlb.createInitialGame(),
  running: false,
  speed: 'normal',
  history: [],
  consistency: { corrected: false, corrections: 0 },
  start: () => {
    if (timer) return;
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
  setSport: (sport) => {
    if (timer) clearInterval(timer);
    timer = null;
    resetSimulationCore();
    set({ activeSport: sport, running: false, speed: 'normal', game: simulatorRegistry[sport].createInitialGame(), history: [], consistency: { corrected: false, corrections: 0 } });
  },
  reset: () => {
    if (timer) clearInterval(timer);
    timer = null;
    resetSimulationCore();
    const sport = get().activeSport;
    set({ running: false, speed: 'normal', game: simulatorRegistry[sport].createInitialGame(), history: [], consistency: { corrected: false, corrections: 0 } });
  },
  stepPitch: () => {
    const { activeSport, game, history } = get();
    const plugin = simulatorRegistry[activeSport];
    const { game: nextGame, event } = plugin.step(game, ctx, history);
    const normalized = applyConsistencyLayer({ sport: activeSport, previous: game, nextGame, event, history });
    const issues = (normalized.game as GameState).consistencyIssues ?? [];
    set((s) => ({
      game: normalized.game,
      history: [normalized.event, ...s.history].slice(0, 120),
      consistency: { ...normalized.consistency, ok: issues.length === 0, issues },
    }));
  },
}));
