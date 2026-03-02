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
  meta?: Record<string, number | string | boolean>;
}

export interface BaseLastPlay {
  type: string;
  description: string;
}

export interface MlbLastPlay extends BaseLastPlay {
  tags?: string[];
}

export interface NbaLastPlay extends BaseLastPlay {
  points: number;
  shooter: string;
  assist?: string;
  isThree?: boolean;
  isFoul?: boolean;
}

export interface NflLastPlay extends BaseLastPlay {
  down: number;
  distance: number;
  yards: number;
  passer?: string;
  rusher?: string;
  receiver?: string;
  isTurnover?: boolean;
}

export interface NhlLastPlay extends BaseLastPlay {
  shooter?: string;
  assister?: string;
  strength?: string;
  isGoal?: boolean;
}

export interface MlsLastPlay extends BaseLastPlay {
  player?: string;
  assister?: string;
  xg?: number;
  isGoal?: boolean;
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
  lastPlay: BaseLastPlay;
  boxScore?: SportBoxScore;
  teamLeaders?: TeamLeaders;
  gameLeaders?: GameLeaders;
  consistencyIssues?: string[];
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
  lastPlay: MlbLastPlay;
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
  lastPlay: NbaLastPlay;
}

export interface NflGameState extends BaseGameState {
  sport: 'nfl';
  down: 1 | 2 | 3 | 4;
  distance: number;
  yardLine: string;
  ballOn: number;
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
  lastPlay: NflLastPlay;
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
  lastPlay: NhlLastPlay;
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
  lastPlay: MlsLastPlay;
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
  step: (game: GameState, ctx: SimulatorContext, history: SimulationEvent[]) => { game: GameState; event: SimulationEvent };
}

export interface ConsistencyStatus {
  corrected: boolean;
  corrections: number;
  ok?: boolean;
  issues?: string[];
}
