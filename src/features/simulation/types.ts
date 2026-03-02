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
  playId: number;
  points: number;
  shooter: string;
  assist?: string;
  shotType: 'rim' | 'midrange' | 'three' | 'free-throw';
  isThree?: boolean;
  isFoul?: boolean;
  possession: 'home' | 'away';
  shotClock: number;
  paceEstimate: number;
  offensiveRating: number;
  defensiveRating: number;
  netRating: number;
  tsApprox: number;
}

export interface NflLastPlay extends BaseLastPlay {
  playId: number;
  driveId: number;
  down: number;
  distance: number;
  yards: number;
  fieldPosition: number;
  playType: 'run' | 'pass' | 'sack' | 'penalty' | 'turnover' | 'field_goal' | 'punt';
  passer?: string;
  rusher?: string;
  target?: string;
  tackler?: string;
  epa: number;
  success: boolean;
  pressure: boolean;
  redZone: boolean;
  isTurnover?: boolean;
}

export interface NhlLastPlay extends BaseLastPlay {
  playId: number;
  shooter?: string;
  assister?: string[];
  strength: 'EV' | 'PP' | 'PK';
  xg: number;
  sog: boolean;
  goalieSave?: string;
  faceoffWinPctHome: number;
  toiLeader: string;
  isGoal?: boolean;
}

export interface MlsLastPlay extends BaseLastPlay {
  playId: number;
  player?: string;
  assister?: string;
  xg?: number;
  xa?: number;
  shotType?: 'open-play' | 'set-piece' | 'counter' | 'penalty';
  keyPass?: boolean;
  progressivePasses: number;
  possessionPctHome: number;
  ppdaApprox: number;
  pressures: number;
  recoveries: number;
  isGoal?: boolean;
}

export interface MlbAdvancedMetrics {
  exitVelocity: number;
  launchAngle: number;
  barrelPct: number;
  whiffPct: number;
  chaseRate: number;
  spinRate: number;
  hardHitPct: number;
  xwOBA: number;
  zoneContactPct: number;
  sprintSpeed: number;
}

export interface NflAdvancedMetrics {
  epa: number;
  successRate: number;
  cpoe: number;
  pressureRate: number;
  airYards: number;
  yardsAfterContact: number;
  adot: number;
  explosivePlayPct: number;
  defensiveStuffs: number;
  neutralPace: number;
}

export interface NbaAdvancedMetrics {
  offensiveRating: number;
  defensiveRating: number;
  netRating: number;
  trueShootingPct: number;
  pace: number;
  assistRatio: number;
  reboundPct: number;
  usageRate: number;
  ppp: number;
  astToRatio: number;
}

export interface NhlAdvancedMetrics {
  xG: number;
  corsiForPct: number;
  fenwickForPct: number;
  pdo: number;
  highDangerChances: number;
  zoneStartsPct: number;
  takeaways: number;
  xGA: number;
  giveaways: number;
  slotShots: number;
}

export interface MlsAdvancedMetrics {
  xG: number;
  xA: number;
  ppda: number;
  fieldTilt: number;
  progressivePasses: number;
  packing: number;
  ballRecoveries: number;
  pressures: number;
  shotEndingSequences: number;
  bigChancesCreated: number;
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
  advancedMetrics: MlbAdvancedMetrics;
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
  advancedMetrics: NbaAdvancedMetrics;
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
  advancedMetrics: NflAdvancedMetrics;
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
  advancedMetrics: NhlAdvancedMetrics;
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
  advancedMetrics: MlsAdvancedMetrics;
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
  forcePlay?: (game: GameState, ctx: SimulatorContext, history: SimulationEvent[], action: string) => { game: GameState; event: SimulationEvent };
  forceActions?: string[];
}

export interface ConsistencyStatus {
  corrected: boolean;
  corrections: number;
  ok?: boolean;
  issues?: string[];
}

export interface TeamMetricEntry {
  label: string;
  home: string | number;
  away: string | number;
}

interface NormalizedBasePayload {
  sport: SportKey;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  score: { home: number; away: number };
  period: string;
  clock: string;
  possession: 'home' | 'away' | null;
  lastEvent: string;
  updatedAt: string;
  keyStats: KeyStat[];
  boxScore?: SportBoxScore;
  teamLeaders?: TeamLeaders;
  gameLeaders?: GameLeaders;
  teamMetrics: TeamMetricEntry[];
  consistencyIssues?: string[];
}

export type NormalizedSimulationPayload =
  | (NormalizedBasePayload & { sport: 'mlb'; advancedMetrics: MlbAdvancedMetrics; mlb: Pick<MlbGameState, 'inning' | 'half' | 'balls' | 'strikes' | 'outs' | 'pitcher' | 'batter' | 'lastPitch' | 'lastPlay'> })
  | (NormalizedBasePayload & { sport: 'nba'; advancedMetrics: NbaAdvancedMetrics; nba: Pick<NbaGameState, 'shotClock' | 'teamFoulsHome' | 'teamFoulsAway' | 'run' | 'lastPlay'> })
  | (NormalizedBasePayload & { sport: 'nfl'; advancedMetrics: NflAdvancedMetrics; nfl: Pick<NflGameState, 'down' | 'distance' | 'yardLine' | 'playType' | 'lastPlay'> })
  | (NormalizedBasePayload & { sport: 'nhl'; advancedMetrics: NhlAdvancedMetrics; nhl: Pick<NhlGameState, 'strengthState' | 'ppTimeRemaining' | 'pulledGoalie' | 'lastPlay'> })
  | (NormalizedBasePayload & { sport: 'mls'; advancedMetrics: MlsAdvancedMetrics; mls: Pick<MlsGameState, 'matchClock' | 'stoppageTime' | 'possessionPctHome' | 'lastPlay'> });
