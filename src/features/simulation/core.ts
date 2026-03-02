import type { GameState, LastPitch, NbaGameState, NflGameState, NhlGameState, MlsGameState, SimulationEvent, SimulatorContext, SportKey, ConsistencyStatus } from './types';

const defaultPitch: LastPitch = {
  pitchNumber: 0,
  pitchType: 'FF',
  velocityMph: 0,
  location: 'Mid-Center',
  result: 'Game initialized',
  batSpeedMph: null,
  exitVelocityMph: null,
  launchAngleDeg: null,
  projectedDistanceFt: null,
};

export const createDefaultPitch = () => ({ ...defaultPitch });

let rngState = 123456789;
let sequence = 0;

export const resetSimulationCore = () => {
  rngState = 123456789;
  sequence = 0;
};

export const createSimulatorContext = (): SimulatorContext => ({
  nextId: () => {
    sequence += 1;
    return sequence;
  },
  random: () => {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296;
  },
  randomInt: (min, max) => {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return Math.floor(min + (rngState / 4294967296) * (max - min + 1));
  },
});

export const formatClock = (clockSeconds: number) => {
  const minutes = Math.floor(clockSeconds / 60);
  const seconds = clockSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const deriveNbaRun = (game: NbaGameState, history: SimulationEvent[]) => {
  const timeline = [...history].reverse();
  const snapshots = [{ scoreHome: 0, scoreAway: 0 }, ...timeline.map((e) => ({ scoreHome: e.scoreHome, scoreAway: e.scoreAway })), { scoreHome: game.scoreHome, scoreAway: game.scoreAway }];

  let runTeam: 'home' | 'away' | null = null;
  let runPoints = 0;

  for (let i = snapshots.length - 1; i > 0; i -= 1) {
    const curr = snapshots[i];
    const prev = snapshots[i - 1];
    const dHome = curr.scoreHome - prev.scoreHome;
    const dAway = curr.scoreAway - prev.scoreAway;
    if (dHome < 0 || dAway < 0) break;
    if (dHome > 0 && dAway === 0) {
      if (runTeam === null || runTeam === 'home') {
        runTeam = 'home';
        runPoints += dHome;
        continue;
      }
      break;
    }
    if (dAway > 0 && dHome === 0) {
      if (runTeam === null || runTeam === 'away') {
        runTeam = 'away';
        runPoints += dAway;
        continue;
      }
      break;
    }
    if (dHome === 0 && dAway === 0) continue;
    break;
  }

  if (!runTeam || runPoints === 0) return '0-0 run';
  const team = runTeam === 'home' ? game.homeTeam : game.awayTeam;
  const capped = Math.min(runPoints, runTeam === 'home' ? game.scoreHome : game.scoreAway);
  return `${team} ${capped}-0 run`;
};

export const applyConsistencyLayer = ({ sport, previous, nextGame, event, history }: { sport: SportKey; previous: GameState; nextGame: GameState; event: SimulationEvent; history: SimulationEvent[] }) => {
  const game = structuredClone(nextGame) as GameState;
  let corrections = 0;

  if (sport === 'nba') {
    const nba = game as NbaGameState;
    const prev = previous as NbaGameState;
    const derivedRun = deriveNbaRun(nba, history);
    if (nba.run !== derivedRun) {
      nba.run = derivedRun;
      corrections += 1;
    }
    const oldShot = nba.shotClock;
    nba.shotClock = clamp(nba.shotClock, 0, 24);
    if (oldShot !== nba.shotClock) corrections += 1;
    if (nba.possession !== prev.possession && nba.shotClock !== 24) {
      nba.shotClock = 24;
      corrections += 1;
    }
    const fh = nba.teamFoulsHome;
    const fa = nba.teamFoulsAway;
    nba.teamFoulsHome = clamp(nba.teamFoulsHome, 0, 12);
    nba.teamFoulsAway = clamp(nba.teamFoulsAway, 0, 12);
    if (fh !== nba.teamFoulsHome || fa !== nba.teamFoulsAway) corrections += 1;
  }

  if (sport === 'nfl') {
    const nfl = game as NflGameState;
    nfl.down = clamp(nfl.down, 1, 4) as 1 | 2 | 3 | 4;
    nfl.distance = clamp(nfl.distance, 1, 99);
    nfl.ballOn = clamp(nfl.ballOn, 1, 99);
    const expectedYard = nfl.ballOn === 50 ? '50' : nfl.ballOn > 50 ? `${nfl.possessionTeam === nfl.homeTeam ? nfl.awayTeam : nfl.homeTeam} ${100 - nfl.ballOn}` : `${nfl.possessionTeam} ${nfl.ballOn}`;
    if (nfl.yardLine !== expectedYard) {
      nfl.yardLine = expectedYard;
      corrections += 1;
    }
    if (nfl.lastPlay.type === 'drive-continue' && previous.sport === 'nfl') {
      const prev = previous as NflGameState;
      if (prev.clockSeconds === nfl.clockSeconds && prev.ballOn === nfl.ballOn) {
        nfl.clockSeconds = Math.max(0, nfl.clockSeconds - 1);
        corrections += 1;
      }
    }
  }

  if (sport === 'nhl') {
    const nhl = game as NhlGameState;
    nhl.clockSeconds = Math.max(0, nhl.clockSeconds);
    nhl.ppTimeRemaining = Math.max(0, nhl.ppTimeRemaining);
    if (nhl.sogHome < nhl.scoreHome) {
      nhl.sogHome = nhl.scoreHome;
      corrections += 1;
    }
    if (nhl.sogAway < nhl.scoreAway) {
      nhl.sogAway = nhl.scoreAway;
      corrections += 1;
    }
    if (nhl.period < 1) {
      nhl.period = 1;
      corrections += 1;
    }
  }

  if (sport === 'mls') {
    const mls = game as MlsGameState;
    mls.possessionPctHome = clamp(Math.round(mls.possessionPctHome), 0, 100);
    mls.matchClock = Math.max(mls.matchClock, (previous as MlsGameState).matchClock);
    mls.stoppageTime = clamp(mls.stoppageTime, 0, 15);
    corrections += 0;
  }

  if (sport === 'mlb') {
    const mlb = game as any;
    const b = mlb.balls;
    const s = mlb.strikes;
    const o = mlb.outs;
    mlb.balls = clamp(mlb.balls, 0, 3);
    mlb.strikes = clamp(mlb.strikes, 0, 2);
    mlb.outs = clamp(mlb.outs, 0, 2);
    if (b !== mlb.balls || s !== mlb.strikes || o !== mlb.outs) corrections += 1;
  }

  return {
    game,
    event: { ...event, scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    consistency: { corrected: corrections > 0, corrections } satisfies ConsistencyStatus,
  };
};
