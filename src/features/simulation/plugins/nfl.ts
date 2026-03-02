import { formatClock } from '../core';
import { bumpPlayerStat, computeLeaders, initializeBoxScore, sumTeamTotals, validateConsistency } from '../boxScore';
import type { KeyStat, NflGameState, SimulatorPlugin } from '../types';

const QUARTER_SECONDS = 15 * 60;
const homePlayers = ['P. Mahomes', 'I. Pacheco', 'T. Kelce', 'R. Rice'];
const awayPlayers = ['J. Allen', 'J. Cook', 'S. Diggs', 'D. Kincaid'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildKeyStats = (g: NflGameState): KeyStat[] => {
  const h = g.boxScore?.teamTotals.home ?? {};
  const a = g.boxScore?.teamTotals.away ?? {};
  return [
    { label: 'Down & Dist', value: `${g.down} & ${g.distance}` },
    { label: 'Yard Line', value: g.yardLine },
    { label: 'Play Type', value: g.playType },
    { label: 'Pass Yds', value: `${h.passYds ?? 0}-${a.passYds ?? 0}` },
    { label: 'Rush Yds', value: `${h.rushYds ?? 0}-${a.rushYds ?? 0}` },
    { label: 'TOP', value: `${Math.round(h.topSec ?? 0)}-${Math.round(a.topSec ?? 0)}s` },
    { label: 'Pen Yds', value: `${h.penYds ?? 0}-${a.penYds ?? 0}` },
    { label: 'Sacks', value: `${h.sacksAllowed ?? 0}-${a.sacksAllowed ?? 0}` },
    { label: 'Turnovers', value: `${h.turnovers ?? 0}-${a.turnovers ?? 0}` },
    { label: 'EPA', value: g.epa.toFixed(2) },
  ];
};

export const nflSimulator: SimulatorPlugin = {
  key: 'nfl', label: 'NFL',
  createInitialGame: () => {
    const tracked = ['passAtt', 'passComp', 'passYds', 'passTd', 'int', 'rushAtt', 'rushYds', 'rushTd', 'targets', 'rec', 'recYds', 'recTd', 'topSec', 'turnovers', 'thirdAtt', 'thirdConv', 'rzAtt', 'rzTd', 'sacksAllowed', 'penYds'];
    const boxScore = initializeBoxScore('nfl', homePlayers, awayPlayers, tracked);
    const game: NflGameState = { sport: 'nfl', homeTeam: 'KC', awayTeam: 'BUF', scoreHome: 0, scoreAway: 0, period: 1, periodLabel: 'Q1', clockSeconds: QUARTER_SECONDS, possession: 'away',
      lastEvent: 'Kickoff returned to BUF 23.', keyStats: [], lastPlay: { type: 'kickoff', description: 'Kickoff returned to BUF 23.', playId: 0, driveId: 1, down: 1, distance: 10, yards: 0, fieldPosition: 23, playType: 'pass', epa: 0, success: false, pressure: false, redZone: false }, down: 1, distance: 10, yardLine: 'BUF 23',
      ballOn: 23, driveNumber: 1, playClock: 40, possessionTeam: 'BUF', yardsThisDrive: 0, playsThisDrive: 0, timeoutsHome: 3, timeoutsAway: 3, passerName: 'J. Allen', rusherName: 'J. Cook', receiverName: 'S. Diggs', playType: 'pass',
      yardsGained: 0, epa: 0, winProbabilityHome: 0.5, redZone: false, turnoverCount: 0, penaltiesYards: 0, boxScore, consistencyIssues: [] };
    const l = computeLeaders(boxScore, ['passYds', 'rushYds', 'recYds']); game.teamLeaders = l.teamLeaders; game.gameLeaders = l.gameLeaders; game.keyStats = buildKeyStats(game); return game;
  },
  forceActions: ['score', 'turnover', 'penalty', 'big-play'],
  forcePlay: (game, ctx, history, action) => {
    if (action === 'score') return nflSimulator.step(game, { ...ctx, random: () => 0.86, randomInt: (a,b)=>b }, history);
    if (action === 'turnover') return nflSimulator.step(game, { ...ctx, random: () => 0.76, randomInt: (a,b)=>a }, history);
    if (action === 'penalty') return nflSimulator.step(game, { ...ctx, random: () => 0.65, randomInt: (a,b)=>Math.round((a+b)/2) }, history);
    if (action === 'big-play') return nflSimulator.step(game, { ...ctx, random: () => 0.3, randomInt: (a,b)=>b }, history);
    return nflSimulator.step(game, ctx, history);
  },
  step: (previous, ctx) => {
    const game = structuredClone(previous) as NflGameState;
    const offense = game.possession ?? 'home';
    const offensePlayers = offense === 'home' ? homePlayers : awayPlayers;
    const defense = offense === 'home' ? 'away' : 'home';
    const qb = offensePlayers[0], rb = offensePlayers[1], wr = offensePlayers[2 + ctx.randomInt(0, 1)];
    game.possessionTeam = offense === 'home' ? game.homeTeam : game.awayTeam;
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(18, 35));
    game.playClock = ctx.randomInt(20, 40);
    let summary = ''; let type = 'play'; let yds = 0;
    bumpPlayerStat(game.boxScore!, offense, qb, 'topSec', 24);

    const roll = ctx.random();
    if (roll < 0.22) {
      type = 'short-pass'; game.playType = 'pass'; bumpPlayerStat(game.boxScore!, offense, qb, 'passAtt', 1); bumpPlayerStat(game.boxScore!, offense, wr, 'targets', 1);
      if (ctx.random() < 0.7) { yds = ctx.randomInt(3, 10); bumpPlayerStat(game.boxScore!, offense, qb, 'passComp', 1); bumpPlayerStat(game.boxScore!, offense, qb, 'passYds', yds); bumpPlayerStat(game.boxScore!, offense, wr, 'rec', 1); bumpPlayerStat(game.boxScore!, offense, wr, 'recYds', yds); summary = `${qb} short completion to ${wr} for ${yds}.`; }
      else summary = `${qb} incomplete short right.`;
    } else if (roll < 0.36) {
      type = 'deep-pass'; game.playType = 'pass'; bumpPlayerStat(game.boxScore!, offense, qb, 'passAtt', 1); bumpPlayerStat(game.boxScore!, offense, wr, 'targets', 1);
      if (ctx.random() < 0.45) { yds = ctx.randomInt(15, 42); bumpPlayerStat(game.boxScore!, offense, qb, 'passComp', 1); bumpPlayerStat(game.boxScore!, offense, qb, 'passYds', yds); bumpPlayerStat(game.boxScore!, offense, wr, 'rec', 1); bumpPlayerStat(game.boxScore!, offense, wr, 'recYds', yds); summary = `${qb} hits ${wr} deep for ${yds}!`; }
      else summary = `${qb} takes a deep shot, incomplete.`;
    } else if (roll < 0.56) {
      type = 'run'; game.playType = 'run'; yds = ctx.randomInt(-2, 14); bumpPlayerStat(game.boxScore!, offense, rb, 'rushAtt', 1); bumpPlayerStat(game.boxScore!, offense, rb, 'rushYds', yds); summary = `${rb} runs for ${yds}.`;
    } else if (roll < 0.63) {
      type = 'sack'; game.playType = 'sack'; yds = -ctx.randomInt(4, 11); bumpPlayerStat(game.boxScore!, offense, qb, 'sacksAllowed', 1); summary = `${qb} sacked for ${Math.abs(yds)}.`;
    } else if (roll < 0.71) {
      type = 'penalty'; game.playType = 'penalty'; const py = ctx.randomInt(5, 15); yds = ctx.random() < 0.6 ? py : -py; bumpPlayerStat(game.boxScore!, yds < 0 ? offense : defense, qb, 'penYds', py); summary = `Penalty ${yds > 0 ? 'on defense' : 'on offense'} for ${py} yards.`;
    } else if (roll < 0.77) {
      type = 'interception'; game.playType = 'turnover'; bumpPlayerStat(game.boxScore!, offense, qb, 'passAtt', 1); bumpPlayerStat(game.boxScore!, offense, qb, 'int', 1); bumpPlayerStat(game.boxScore!, offense, qb, 'turnovers', 1); summary = `${qb} intercepted!`; game.turnoverCount += 1;
      game.possession = defense; game.down = 1; game.distance = 10; game.driveNumber += 1; game.yardsThisDrive = 0; game.playsThisDrive = 0;
    } else if (roll < 0.82) {
      type = 'fumble'; game.playType = 'turnover'; bumpPlayerStat(game.boxScore!, offense, rb, 'turnovers', 1); summary = `Fumble by ${rb}, recovered by defense.`; game.turnoverCount += 1;
      game.possession = defense; game.down = 1; game.distance = 10; game.driveNumber += 1; game.yardsThisDrive = 0; game.playsThisDrive = 0;
    } else if (roll < 0.88) {
      type = 'fg-attempt'; game.playType = 'field_goal'; const made = ctx.random() < 0.72; summary = `${game.possessionTeam} ${made ? 'hits' : 'misses'} a field goal attempt.`; if (made) offense === 'home' ? (game.scoreHome += 3) : (game.scoreAway += 3);
      game.possession = defense; game.down = 1; game.distance = 10; game.driveNumber += 1;
    } else if (roll < 0.94) {
      type = 'turnover-downs'; game.playType = 'turnover'; summary = `Turnover on downs.`; game.possession = defense; game.down = 1; game.distance = 10; game.driveNumber += 1;
    } else {
      type = 'punt'; game.playType = 'punt'; summary = `${game.possessionTeam} punts.`; game.possession = defense; game.down = 1; game.distance = 10; game.driveNumber += 1;
    }

    if (type === 'short-pass' || type === 'deep-pass' || type === 'run' || type === 'sack' || type === 'penalty') {
      game.ballOn = clamp(game.ballOn + yds, 1, 99); game.yardsThisDrive += yds; game.playsThisDrive += 1;
      if (yds >= game.distance) { game.down = 1; game.distance = 10; } else { game.down = clamp((game.down + 1) as 1|2|3|4, 1, 4) as 1|2|3|4; game.distance = clamp(game.distance - yds, 1, 30); }
      game.redZone = game.ballOn >= 80;
      if (game.down === 3) bumpPlayerStat(game.boxScore!, offense, qb, 'thirdAtt', 1);
      if (game.down === 1 && yds > 0) bumpPlayerStat(game.boxScore!, offense, qb, 'thirdConv', 1);
      if (game.redZone && ctx.random() < 0.12) { bumpPlayerStat(game.boxScore!, offense, qb, 'rzAtt', 1); bumpPlayerStat(game.boxScore!, offense, qb, 'rzTd', 1); offense === 'home' ? (game.scoreHome += 7) : (game.scoreAway += 7); summary = `${game.possessionTeam} touchdown!`; game.possession = defense; game.down = 1; game.distance = 10; }
    }

    if (game.clockSeconds <= 0 && game.period < 4) { game.period += 1; game.periodLabel = `Q${game.period}`; game.clockSeconds = QUARTER_SECONDS; summary = `${game.periodLabel} begins.`; type = 'quarter-change'; }

    sumTeamTotals(game.boxScore!);
    game.yardLine = game.ballOn === 50 ? '50' : game.ballOn > 50 ? `${offense === 'home' ? game.awayTeam : game.homeTeam} ${100 - game.ballOn}` : `${game.possessionTeam} ${game.ballOn}`;
    game.passerName = qb; game.rusherName = rb; game.receiverName = wr; game.yardsGained = yds;
    game.epa = Number((((yds / 10) - ((type === 'interception' || type === 'fumble') ? 2 : 0)) / 3).toFixed(2));
    game.winProbabilityHome = clamp(0.5 + (game.scoreHome - game.scoreAway) * 0.03, 0.03, 0.97);

    const leaders = computeLeaders(game.boxScore!, ['passYds', 'rushYds', 'recYds']); game.teamLeaders = leaders.teamLeaders; game.gameLeaders = leaders.gameLeaders;
    const consistency = validateConsistency('nfl', game.boxScore!, game.scoreHome, game.scoreAway); game.consistencyIssues = consistency.issues;

    game.lastEvent = summary;
    game.lastPlay = { type, description: summary, playId: ctx.nextId(), driveId: game.driveNumber, down: game.down, distance: game.distance, yards: yds, fieldPosition: game.ballOn, playType: game.playType, passer: qb, rusher: rb, target: wr, tackler: (defense==='home'?homePlayers:awayPlayers)[ctx.randomInt(1,3)], epa: game.epa, success: yds >= Math.max(4, Math.floor(game.distance / 2)), pressure: type === 'sack' || (game.playType === 'pass' && ctx.random() < 0.3), redZone: game.redZone, isTurnover: type.includes('turnover') || type === 'interception' || type === 'fumble' };
    game.keyStats = buildKeyStats(game);
    return { game, event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway } };
  },
};
