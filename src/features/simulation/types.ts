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

export interface KeyStat {
  label: string;
  value: string | number;
  emphasis?: 'low' | 'med' | 'high';
}

export interface LastPlay {
  summary: string;
  tags?: string[];
}

interface BaseGameState {
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
  keyStats: KeyStat[];
  lastPlay: LastPlay;
}

export interface MlbGameState extends BaseGameState {
  sport: 'mlb';
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

export interface NbaGameState extends BaseGameState {
  sport: 'nba';
  shotClock: number;
  teamFoulsHome: number;
  teamFoulsAway: number;
  bonusHome: boolean;
  bonusAway: boolean;
  turnoversHome: number;
  turnoversAway: number;
  pointsLeader: string;
  assistsLeader: string;
  reboundsLeader: string;
  lastShot: '2PT' | '3PT' | 'FT' | 'NONE';
  shotResult: 'made' | 'missed' | 'foul' | 'turnover' | 'none';
  run: string;
  paceEstimate: number;
  offensiveRatingEstimate: number;
  winProbabilityHome: number;
}

export interface NflGameState extends BaseGameState {
  sport: 'nfl';
  down: 1 | 2 | 3 | 4;
  distance: number;
  yardLine: string;
  driveNumber: number;
  playClock: number;
  possessionTeam: string;
  yardsThisDrive: number;
  playsThisDrive: number;
  timeoutsHome: number;
  timeoutsAway: number;
  passerName: string;
  rusherName: string;
  receiverName: string;
  playType: 'run' | 'pass' | 'sack' | 'penalty' | 'turnover' | 'field_goal' | 'punt';
  yardsGained: number;
  epa: number;
  winProbabilityHome: number;
  redZone: boolean;
  turnoverCount: number;
  penaltiesYards: number;
}

export interface NhlGameState extends BaseGameState {
  sport: 'nhl';
  strengthState: 'EV' | 'PP' | 'PK';
  ppTimeRemaining: number;
  shotsHome: number;
  shotsAway: number;
  sogHome: number;
  sogAway: number;
  hitsHome: number;
  hitsAway: number;
  faceoffWinPctHome: number;
  giveawaysHome: number;
  giveawaysAway: number;
  takeawaysHome: number;
  takeawaysAway: number;
  goalieSavesHome: number;
  goalieSavesAway: number;
  pulledGoalie: boolean;
  xGHome: number;
  xGAway: number;
  scoringChancesHome: number;
  scoringChancesAway: number;
}

export interface MlsGameState extends BaseGameState {
  sport: 'mls';
  matchClock: number;
  stoppageTime: number;
  possessionPctHome: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  xGHome: number;
  xGAway: number;
  cornersHome: number;
  cornersAway: number;
  passesCompletedPctHome: number;
  passesCompletedPctAway: number;
  foulsHome: number;
  foulsAway: number;
  yellowCardsHome: number;
  yellowCardsAway: number;
  redCardsHome: number;
  redCardsAway: number;
  bigChancesHome: number;
  bigChancesAway: number;
  goalkeeperSavesHome: number;
  goalkeeperSavesAway: number;
}

export type GameState = MlbGameState | NbaGameState | NflGameState | NhlGameState | MlsGameState;

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
