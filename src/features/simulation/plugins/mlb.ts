import { createDefaultPitch } from '../core';
import { bumpPlayerStat, computeLeaders, initializeBoxScore, sumTeamTotals, validateConsistency } from '../boxScore';
import type { KeyStat, MlbGameState, HalfInning, PitchType, SimulatorPlugin } from '../types';

const battersAway = ['A. Jones', 'B. Cruz', 'C. Watts', 'D. Hale', 'E. Reed', 'F. Knox', 'G. Ray', 'H. Snow', 'I. Dale'];
const battersHome = ['J. Cole', 'K. Ford', 'L. Pope', 'M. Wade', 'N. Moss', 'O. Beck', 'P. Shaw', 'Q. Boyd', 'R. Lane'];
const pitcherAway = 'S. Ortiz';
const pitcherHome = 'T. Kim';
let awayIndex = 0;
let homeIndex = 0;

const randomPitchType = (random: () => number): PitchType => ['FF', 'SI', 'SL', 'CH', 'CU'][Math.floor(random() * 5)] as PitchType;
const randomLocation = (random: () => number) => `${['Up', 'Mid', 'Low'][Math.floor(random() * 3)]}-${['In', 'Center', 'Away'][Math.floor(random() * 3)]}`;

const nextBatter = (half: HalfInning) => half === 'top' ? battersAway[(awayIndex = (awayIndex + 1) % battersAway.length)] : battersHome[(homeIndex = (homeIndex + 1) % battersHome.length)];

const advanceRunners = (game: MlbGameState, bases: 1 | 2 | 3 | 4) => {
  let runs = 0;
  let first = game.onFirst;
  let second = game.onSecond;
  let third = game.onThird;
  for (let step = 0; step < bases; step += 1) { runs += third ? 1 : 0; third = second; second = first; first = false; }
  if (bases === 4) runs += 1; else if (bases === 3) third = true; else if (bases === 2) second = true; else first = true;
  return { runs, first, second, third };
};

const buildKeyStats = (game: MlbGameState): KeyStat[] => [
  { label: 'Count', value: `${game.balls}-${game.strikes}`, emphasis: 'med' },
  { label: 'Outs', value: game.outs },
  { label: 'Inning', value: `${game.half === 'top' ? 'Top' : 'Bot'} ${game.inning}` },
  { label: 'Pitcher', value: game.pitcher },
  { label: 'Batter', value: game.batter },
  { label: 'Runs/Hits', value: `${game.scoreHome}-${game.scoreAway} / ${(game.boxScore?.teamTotals.home.h ?? 0)}-${(game.boxScore?.teamTotals.away.h ?? 0)}` },
  { label: 'Last Pitch', value: `${game.lastPitch.pitchType} ${game.lastPitch.velocityMph} mph` },
  { label: 'Pitch Result', value: game.lastPitch.result },
];

export const mlbSimulator: SimulatorPlugin = {
  key: 'mlb', label: 'MLB',
  createInitialGame: () => {
    awayIndex = 0; homeIndex = 0;
    const tracked = ['ab', 'h', 'rbi', 'hr', 'bb', 'k', 'tb', 'obpNum', 'obpDen', 'slgNum', 'slgDen', 'ipOuts', 'er', 'pbb', 'pk', 'ha', 'lob', 'err', 'rispAB', 'rispH', 'obp', 'slg', 'era', 'whip'];
    const box = initializeBoxScore('mlb', [...battersHome, pitcherHome], [...battersAway, pitcherAway], tracked);
    const seed: MlbGameState = {
      sport: 'mlb', homeTeam: 'Home', awayTeam: 'Away', scoreHome: 0, scoreAway: 0, period: 1, periodLabel: 'Top 1', clockSeconds: 0, possession: null,
      lastEvent: 'Waiting to start MLB simulation.', inning: 1, half: 'top', balls: 0, strikes: 0, outs: 0, onFirst: false, onSecond: false, onThird: false,
      pitcher: pitcherHome, batter: battersAway[0], lastPitch: createDefaultPitch(), lastPlay: { type: 'pregame', description: 'Waiting to start MLB simulation.', tags: ['pregame'] }, keyStats: [], boxScore: box, consistencyIssues: [],
    };
    const l = computeLeaders(box, ['h', 'rbi', 'hr', 'k']); seed.teamLeaders = l.teamLeaders; seed.gameLeaders = l.gameLeaders; seed.keyStats = buildKeyStats(seed); return seed;
  },
  forceActions: ['HR', 'BB', 'K'],
  forcePlay: (game, ctx, history, action) => {
    if (action === 'HR') return mlbSimulator.step(game, { ...ctx, random: () => 0.8, randomInt: (a,b)=>b }, history);
    if (action === 'BB') return mlbSimulator.step(game, { ...ctx, random: () => 0.86, randomInt: (a,b)=>a }, history);
    if (action === 'K') return mlbSimulator.step(game, { ...ctx, random: () => 0.94, randomInt: (a,b)=>a }, history);
    return mlbSimulator.step(game, ctx, history);
  },
  step: (previous, ctx) => {
    const game = structuredClone(previous) as MlbGameState;
    const offense: 'home' | 'away' = game.half === 'top' ? 'away' : 'home';
    const defense: 'home' | 'away' = offense === 'home' ? 'away' : 'home';
    const pitchType = randomPitchType(ctx.random);
    const velocityMph = ctx.randomInt(82, 100);
    const location = randomLocation(ctx.random);
    let result = ''; let type = 'pitch';

    const recordHit = (bases: 1 | 2 | 3 | 4, label: string) => {
      const moved = advanceRunners(game, bases);
      Object.assign(game, { onFirst: moved.first, onSecond: moved.second, onThird: moved.third });
      if (offense === 'home') game.scoreHome += moved.runs; else game.scoreAway += moved.runs;
      bumpPlayerStat(game.boxScore!, offense, game.batter, 'ab', 1); bumpPlayerStat(game.boxScore!, offense, game.batter, 'h', 1); bumpPlayerStat(game.boxScore!, offense, game.batter, 'tb', bases); bumpPlayerStat(game.boxScore!, offense, game.batter, 'slgNum', bases); bumpPlayerStat(game.boxScore!, offense, game.batter, 'slgDen', 1);
      bumpPlayerStat(game.boxScore!, offense, game.batter, 'rbi', moved.runs + (bases === 4 ? 1 : 0));
      if (bases === 4) { bumpPlayerStat(game.boxScore!, offense, game.batter, 'hr', 1); if (offense === 'home') game.scoreHome += 1; else game.scoreAway += 1; }
      bumpPlayerStat(game.boxScore!, defense, game.pitcher, 'ha', 1); bumpPlayerStat(game.boxScore!, defense, game.pitcher, 'er', moved.runs + (bases === 4 ? 1 : 0));
      result = label;
    };

    const r = ctx.random();
    if (r < 0.14) { game.balls += 1; result = 'Ball'; type = 'ball'; }
    else if (r < 0.28) { game.strikes = Math.min(2, game.strikes + 1); result = 'Called strike'; type = 'strike'; }
    else if (r < 0.36) { result = 'Foul ball'; if (game.strikes < 2) game.strikes += 1; type = 'foul'; }
    else if (r < 0.48) { game.outs += 1; bumpPlayerStat(game.boxScore!, offense, game.batter, 'ab', 1); bumpPlayerStat(game.boxScore!, defense, game.pitcher, 'ipOuts', 1); result = 'Ball in play: out'; type = 'bip-out'; }
    else if (r < 0.63) { recordHit(1, 'Single to center'); type = 'single'; }
    else if (r < 0.72) { recordHit(2, 'Double down the line'); type = 'double'; }
    else if (r < 0.76) { recordHit(3, 'Triple to the gap'); type = 'triple'; }
    else if (r < 0.82) { recordHit(4, 'Home run!'); type = 'home-run'; }
    else if (r < 0.89) { const moved = advanceRunners(game, 1); Object.assign(game, { onFirst: moved.first, onSecond: moved.second, onThird: moved.third }); if (offense === 'home') game.scoreHome += moved.runs; else game.scoreAway += moved.runs; bumpPlayerStat(game.boxScore!, offense, game.batter, 'bb', 1); bumpPlayerStat(game.boxScore!, offense, game.batter, 'obpNum', 1); bumpPlayerStat(game.boxScore!, offense, game.batter, 'obpDen', 1); bumpPlayerStat(game.boxScore!, defense, game.pitcher, 'pbb', 1); result = 'Walk issued'; type = 'bb'; }
    else if (r < 0.95) { game.outs += 1; bumpPlayerStat(game.boxScore!, offense, game.batter, 'ab', 1); bumpPlayerStat(game.boxScore!, offense, game.batter, 'k', 1); bumpPlayerStat(game.boxScore!, defense, game.pitcher, 'pk', 1); bumpPlayerStat(game.boxScore!, defense, game.pitcher, 'ipOuts', 1); result = 'Strikeout'; type = 'k'; }
    else if (r < 0.98) { result = 'Stolen base attempt'; type = 'sb-attempt'; }
    else { bumpPlayerStat(game.boxScore!, defense, game.pitcher, 'err', 1); result = 'Defensive error extends inning'; type = 'error'; }

    if (game.balls >= 4 || game.strikes >= 3 || type === 'single' || type === 'double' || type === 'triple' || type === 'home-run' || type === 'bip-out' || type === 'bb' || type === 'k' || type === 'error') {
      game.balls = 0; game.strikes = 0; game.batter = nextBatter(game.half);
    }

    if (game.outs >= 3) {
      game.outs = 0; game.onFirst = false; game.onSecond = false; game.onThird = false; game.half = game.half === 'top' ? 'bottom' : 'top';
      if (game.half === 'top') game.inning += 1;
      game.pitcher = game.half === 'top' ? pitcherHome : pitcherAway;
      result = `${result} · Inning change`; type = 'inning-change';
    }

    sumTeamTotals(game.boxScore!);
    for (const team of ['home', 'away'] as const) {
      const t = game.boxScore!.teamTotals[team];
      t.obp = (t.obpDen ?? 0) > 0 ? Number(((t.obpNum ?? 0) / t.obpDen).toFixed(3)) : 0;
      t.slg = (t.slgDen ?? 0) > 0 ? Number(((t.slgNum ?? 0) / t.slgDen).toFixed(3)) : 0;
      t.era = Number((((t.er ?? 0) * 9) / Math.max((t.ipOuts ?? 1) / 3, 1)).toFixed(2));
      t.whip = Number((((t.pbb ?? 0) + (t.ha ?? 0)) / Math.max((t.ipOuts ?? 1) / 3, 1)).toFixed(2));
    }

    game.period = game.inning; game.periodLabel = `${game.half === 'top' ? 'Top' : 'Bottom'} ${game.inning}`;
    game.lastPitch = { pitchNumber: game.lastPitch.pitchNumber + 1, pitchType, velocityMph, location, result, batSpeedMph: ctx.randomInt(62, 85), exitVelocityMph: ctx.randomInt(72, 114), launchAngleDeg: ctx.randomInt(-8, 40), projectedDistanceFt: ctx.randomInt(120, 430) };
    const leaders = computeLeaders(game.boxScore!, ['h', 'rbi', 'hr', 'k']); game.teamLeaders = leaders.teamLeaders; game.gameLeaders = leaders.gameLeaders;
    game.consistencyIssues = validateConsistency('mlb', game.boxScore!, game.scoreHome, game.scoreAway).issues;
    game.lastEvent = result; game.lastPlay = { type, description: result, tags: [type] }; game.keyStats = buildKeyStats(game);

    return { game, event: { id: ctx.nextId(), summary: game.lastEvent, periodLabel: game.periodLabel, clockLabel: '--:--', scoreHome: game.scoreHome, scoreAway: game.scoreAway } };
  },
};
