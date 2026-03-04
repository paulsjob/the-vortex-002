export type SportKey = 'mlb' | 'nba' | 'nfl' | 'nhl' | 'mls';
export type SimulationSpeed = 'slow' | 'normal' | 'fast';
export type SimulationStatus = 'scheduled' | 'running' | 'paused' | 'external' | 'final';

export interface KeyStat {
  label: string;
  value: string | number;
  emphasis?: 'low' | 'med' | 'high';
}

export interface LeaderEntry {
  player: string;
  team: 'home' | 'away';
  value: number;
}

export interface TeamLeaders {
  home: Record<string, LeaderEntry>;
  away: Record<string, LeaderEntry>;
}

export type GameLeaders = Record<string, LeaderEntry[]>;

export interface SportBoxScore {
  sport: SportKey;
  homePlayers: Record<string, Record<string, number>>;
  awayPlayers: Record<string, Record<string, number>>;
  teamTotals: {
    home: Record<string, number>;
    away: Record<string, number>;
  };
}

export interface PlayerState {
  id: string;
  name: string;
  team: 'home' | 'away';
  stats: Record<string, number>;
}

export interface LastPlay {
  type: string;
  description: string;
  player?: string;
  team?: 'home' | 'away';
  [key: string]: unknown;
}

export interface GameState {
  id: string;
  sport: SportKey;
  status: SimulationStatus;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  scoreHome: number;
  scoreAway: number;
  period: number;
  periodLabel: string;
  clockSeconds: number;
  clockDisplay: string;
  possession: 'home' | 'away' | null;
  lastEvent: string;
  lastPlay: LastPlay;
  context: Record<string, unknown>;
  players: Record<string, PlayerState>;
  keyStats: KeyStat[];
  teamLeaders: TeamLeaders;
  gameLeaders: GameLeaders;
  advancedMetrics: Record<string, number>;
  boxScore: SportBoxScore;
  consistencyIssues?: string[];
}

export interface SimulationEvent {
  id: number;
  summary: string;
  periodLabel: string;
  clockLabel: string;
  scoreHome: number;
  scoreAway: number;
  eventType: string;
  team: string;
  player: string;
  payload: Record<string, unknown>;
}

export interface SimulationBaseEvent {
  sequence: number;
  simTimeMs: number;
  clock: string;
  eventType: string;
  team: string;
  player: string;
  payload: Record<string, unknown>;
  summary: string;
}

export interface SimPlayByPlayEvent extends SimulationBaseEvent {
  id: number;
  periodLabel: string;
  clockLabel: string;
  scoreHome: number;
  scoreAway: number;
}

export type SimulationSnapshot = GameState;

export interface SimulationAnalyticsLayer {
  game: Record<string, number | string | boolean | null>;
  team: {
    home: Record<string, number | string | boolean | null>;
    away: Record<string, number | string | boolean | null>;
  };
  player: Record<string, Record<string, number | string | boolean | null>>;
}

export interface SimulationGraphicsLayer {
  momentum: { home: number; away: number };
  pressure: { index: number };
  hottestPlayer: { name: string; metric: string };
  dominance: { home: number; away: number };
  clutch: { player: string; score: number };
}

export interface SimulationStoryTrigger {
  active: boolean;
  team?: string;
  player?: string;
  description: string;
  probability?: number;
}

export interface SimulationStoryLayer {
  hotStreak: SimulationStoryTrigger;
  momentumShift: SimulationStoryTrigger;
  recordWatch: SimulationStoryTrigger;
  comeback: SimulationStoryTrigger;
  defense: SimulationStoryTrigger;
  historicPace: SimulationStoryTrigger;
}

export interface SimulationContextLayer {
  seed: number;
  league: SportKey;
  speed: SimulationSpeed;
  status: 'running' | 'paused' | 'external';
  eventCount: number;
  sequence: number;
  simTimeMs: number;
}

export interface SimulationFrame {
  sequence: number;
  simTimeMs: number;
  event: SimPlayByPlayEvent;
  snapshot: SimulationSnapshot;
  analytics: SimulationAnalyticsLayer;
  graphics: SimulationGraphicsLayer;
  story: SimulationStoryLayer;
  events: { recent: SimPlayByPlayEvent[] };
  context: SimulationContextLayer;
}

export interface SimulatorContext {
  nextId: () => number;
  random: () => number;
  randomInt: (min: number, max: number) => number;
  pick: <T>(values: readonly T[]) => T;
}

export interface SimulatorPlugin {
  key: SportKey;
  label: string;
  expectedEventRange: { min: number; max: number };
  createInitialGame: () => GameState;
  step: (game: GameState, ctx: SimulatorContext, history: SimulationEvent[]) => { game: GameState; event: SimulationEvent };
  forcePlay?: (game: GameState, ctx: SimulatorContext, history: SimulationEvent[], action: string) => { game: GameState; event: SimulationEvent };
  forceActions?: string[];
}

export interface ConsistencyStatus {
  corrected: boolean;
  corrections: number;
  ok?: boolean;
  issues?: string[];
}
