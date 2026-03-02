export type SportKey = 'mlb' | 'nba' | 'nfl' | 'nhl' | 'mls';

export type HalfInning = 'top' | 'bottom';
export type PitchType = 'FF' | 'SI' | 'SL' | 'CH' | 'CU';

export interface LastPitch {
  pitchNumber: number;
  pitchType: PitchType;
  velocityMph: number;
  location: string;
  result: string;
  batSpeedMph: number | null;
  exitVelocityMph: number | null;
  launchAngleDeg: number | null;
  projectedDistanceFt: number | null;
}

export interface GameState {
  sport: SportKey;
  homeTeam: string;
  awayTeam: string;
  scoreHome: number;
  scoreAway: number;
  period: number;
  periodLabel: string;
  clockSeconds: number;
  possession: 'home' | 'away' | null;
  lastEvent: string;
  inning: number;
  half: HalfInning;
  balls: number;
  strikes: number;
  outs: number;
  onFirst: boolean;
  onSecond: boolean;
  onThird: boolean;
  pitcher: string;
  batter: string;
  lastPitch: LastPitch;
}

export interface SimulationEvent {
  id: number;
  summary: string;
  periodLabel: string;
  clockLabel: string;
  scoreHome: number;
  scoreAway: number;
}

export interface SimulatorContext {
  nextId: () => number;
  random: () => number;
  randomInt: (min: number, max: number) => number;
}

export interface SimulatorPlugin {
  key: SportKey;
  label: string;
  createInitialGame: () => GameState;
  step: (game: GameState, ctx: SimulatorContext) => { game: GameState; event: SimulationEvent };
}
