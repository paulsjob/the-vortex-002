import { createDefaultPitch } from '../core';
import type { KeyStat, MlbGameState, HalfInning, PitchType, SimulatorPlugin } from '../types';

const battersAway = ['A. Jones', 'B. Cruz', 'C. Watts', 'D. Hale', 'E. Reed', 'F. Knox', 'G. Ray', 'H. Snow', 'I. Dale'];
const battersHome = ['J. Cole', 'K. Ford', 'L. Pope', 'M. Wade', 'N. Moss', 'O. Beck', 'P. Shaw', 'Q. Boyd', 'R. Lane'];
const pitcherAway = 'S. Ortiz';
const pitcherHome = 'T. Kim';

let awayIndex = 0;
let homeIndex = 0;

const randomPitchType = (random: () => number): PitchType => {
  const bag: PitchType[] = ['FF', 'SI', 'SL', 'CH', 'CU'];
  return bag[Math.floor(random() * bag.length)];
};

const randomLocation = (random: () => number) => {
  const rows = ['Up', 'Mid', 'Low'];
  const cols = ['In', 'Center', 'Away'];
  return `${rows[Math.floor(random() * rows.length)]}-${cols[Math.floor(random() * cols.length)]}`;
};

const nextBatter = (half: HalfInning) => {
  if (half === 'top') {
    awayIndex = (awayIndex + 1) % battersAway.length;
    return battersAway[awayIndex];
  }
  homeIndex = (homeIndex + 1) % battersHome.length;
  return battersHome[homeIndex];
};

const advanceRunners = (game: MlbGameState, bases: 1 | 2 | 3 | 4) => {
  let runs = 0;
  let first = game.onFirst;
  let second = game.onSecond;
  let third = game.onThird;

  for (let step = 0; step < bases; step += 1) {
    runs += third ? 1 : 0;
    third = second;
    second = first;
    first = false;
  }

  if (bases === 4) runs += 1;
  else if (bases === 3) third = true;
  else if (bases === 2) second = true;
  else first = true;

  return { runs, first, second, third };
};

const buildKeyStats = (game: MlbGameState): KeyStat[] => [
  { label: 'Count', value: `${game.balls}-${game.strikes}`, emphasis: 'med' },
  { label: 'Outs', value: game.outs },
  { label: 'Inning', value: `${game.half === 'top' ? 'Top' : 'Bot'} ${game.inning}` },
  { label: 'Pitcher', value: game.pitcher },
  { label: 'Batter', value: game.batter },
  { label: 'Bases', value: `${game.onFirst ? '1' : '-'}${game.onSecond ? '2' : '-'}${game.onThird ? '3' : '-'}` },
  { label: 'Last Pitch', value: `${game.lastPitch.pitchType} ${game.lastPitch.velocityMph} mph` },
  { label: 'Pitch Result', value: game.lastPitch.result },
];

export const mlbSimulator: SimulatorPlugin = {
  key: 'mlb',
  label: 'MLB',
  createInitialGame: () => {
    awayIndex = 0;
    homeIndex = 0;
    const seed = {
      sport: 'mlb' as const,
      homeTeam: 'Home',
      awayTeam: 'Away',
      scoreHome: 0,
      scoreAway: 0,
      period: 1,
      periodLabel: 'Top 1',
      clockSeconds: 0,
      possession: null,
      lastEvent: 'Waiting to start MLB simulation.',
      inning: 1,
      half: 'top' as const,
      balls: 0,
      strikes: 0,
      outs: 0,
      onFirst: false,
      onSecond: false,
      onThird: false,
      pitcher: pitcherHome,
      batter: battersAway[0],
      lastPitch: createDefaultPitch(),
      lastPlay: { summary: 'Waiting to start MLB simulation.', tags: ['pregame'] },
      keyStats: [] as KeyStat[],
    };
    seed.keyStats = buildKeyStats(seed);
    return seed;
  },
  step: (previous, ctx) => {
    const game = structuredClone(previous) as MlbGameState;
    const pitchType = randomPitchType(ctx.random);
    const velocityMph = ctx.randomInt(82, 100);
    const location = randomLocation(ctx.random);

    const r = ctx.random();
    let result = '';
    let batSpeedMph: number | null = null;
    let exitVelocityMph: number | null = null;
    let launchAngleDeg: number | null = null;
    let projectedDistanceFt: number | null = null;

    if (r < 0.30) {
      game.balls += 1;
      result = 'Ball';
      if (game.balls >= 4) {
        const moved = advanceRunners(game, 1);
        Object.assign(game, { onFirst: moved.first, onSecond: moved.second, onThird: moved.third });
        if (game.half === 'top') game.scoreAway += moved.runs;
        else game.scoreHome += moved.runs;
        game.balls = 0;
        game.strikes = 0;
        game.batter = nextBatter(game.half);
        result = 'Walk';
      }
    } else if (r < 0.58) {
      game.strikes += 1;
      result = 'Strike';
      if (game.strikes >= 3) {
        game.outs += 1;
        game.balls = 0;
        game.strikes = 0;
        game.batter = nextBatter(game.half);
        result = 'Strikeout';
      }
    } else if (r < 0.67) {
      result = game.strikes < 2 ? 'Foul' : 'Two-strike foul';
      if (game.strikes < 2) game.strikes += 1;
    } else {
      batSpeedMph = ctx.randomInt(62, 85);
      exitVelocityMph = ctx.randomInt(72, 114);
      launchAngleDeg = ctx.randomInt(-8, 40);
      projectedDistanceFt = ctx.randomInt(120, 430);

      const inPlay = ctx.random();
      if (inPlay < 0.35) {
        game.outs += 1;
        result = 'Ball in play: Out';
      } else if (inPlay < 0.70) {
        const moved = advanceRunners(game, 1);
        Object.assign(game, { onFirst: moved.first, onSecond: moved.second, onThird: moved.third });
        if (game.half === 'top') game.scoreAway += moved.runs;
        else game.scoreHome += moved.runs;
        result = 'Single';
      } else if (inPlay < 0.84) {
        const moved = advanceRunners(game, 2);
        Object.assign(game, { onFirst: moved.first, onSecond: moved.second, onThird: moved.third });
        if (game.half === 'top') game.scoreAway += moved.runs;
        else game.scoreHome += moved.runs;
        result = 'Double';
      } else if (inPlay < 0.91) {
        const moved = advanceRunners(game, 3);
        Object.assign(game, { onFirst: moved.first, onSecond: moved.second, onThird: moved.third });
        if (game.half === 'top') game.scoreAway += moved.runs;
        else game.scoreHome += moved.runs;
        result = 'Triple';
      } else {
        const moved = advanceRunners(game, 4);
        Object.assign(game, { onFirst: moved.first, onSecond: moved.second, onThird: moved.third });
        if (game.half === 'top') game.scoreAway += moved.runs;
        else game.scoreHome += moved.runs;
        result = 'Home Run';
      }

      game.balls = 0;
      game.strikes = 0;
      game.batter = nextBatter(game.half);
    }

    if (game.outs >= 3) {
      game.outs = 0;
      game.balls = 0;
      game.strikes = 0;
      game.onFirst = false;
      game.onSecond = false;
      game.onThird = false;
      game.half = game.half === 'top' ? 'bottom' : 'top';
      if (game.half === 'top') game.inning += 1;
      game.pitcher = game.half === 'top' ? pitcherHome : pitcherAway;
      game.batter = game.half === 'top' ? battersAway[awayIndex] : battersHome[homeIndex];
      result = `${result} · Side retired`;
    }

    game.period = game.inning;
    game.periodLabel = `${game.half === 'top' ? 'Top' : 'Bottom'} ${game.inning}`;
    game.lastPitch = {
      pitchNumber: game.lastPitch.pitchNumber + 1,
      pitchType,
      velocityMph,
      location,
      result,
      batSpeedMph,
      exitVelocityMph,
      launchAngleDeg,
      projectedDistanceFt,
    };
    game.lastEvent = result;
    game.lastPlay = { summary: result, tags: ['pitch'] };
    game.keyStats = buildKeyStats(game);

    return {
      game,
      event: {
        id: ctx.nextId(),
        summary: game.lastEvent,
        periodLabel: game.periodLabel,
        clockLabel: '--:--',
        scoreHome: game.scoreHome,
        scoreAway: game.scoreAway,
      },
    };
  },
};
