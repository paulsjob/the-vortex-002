import { formatClock } from '../core';
import { bumpPlayerStat, computeLeaders, initializeBoxScore, sumTeamTotals, validateConsistency } from '../boxScore';
import type { KeyStat, NflAdvancedMetrics, NflGameState, SimulatorPlugin } from '../types';

const QUARTER_SECONDS = 15 * 60;
const homePlayers = ['P. Mahomes', 'I. Pacheco', 'T. Kelce', 'R. Rice'];
const awayPlayers = ['J. Allen', 'J. Cook', 'S. Diggs', 'D. Kincaid'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const updateNflAdvanced = (game: NflGameState, playType: string, yds: number, wasPressure: boolean, wasPass: boolean, completedPass: boolean) => {
  const meta = game.boxScore!.meta ?? {};
  const plays = Number(meta.plays ?? 0) + 1;
  const successful = Number(meta.successful ?? 0) + ((yds >= Math.max(4, Math.floor(game.distance / 2))) ? 1 : 0);
  const pressures = Number(meta.pressures ?? 0) + (wasPressure ? 1 : 0);
  const passAtt = Number(meta.passAttAdv ?? 0) + (wasPass ? 1 : 0);
  const completions = Number(meta.completionsAdv ?? 0) + (completedPass ? 1 : 0);
  const airYards = Number(meta.airYards ?? 0) + (wasPass ? Math.max(0, yds - Math.max(0, Math.floor(ctxYac(yds)))) : 0);
  const yac = Number(meta.yac ?? 0) + (wasPass && completedPass ? Math.max(0, ctxYac(yds)) : 0);
  const yacontact = Number(meta.yacontact ?? 0) + (playType === 'run' ? Math.max(0, Math.floor(yds * 0.55 + 1)) : 0);
  const explosive = Number(meta.explosive ?? 0) + ((yds >= 20 || (playType === 'run' && yds >= 12)) ? 1 : 0);
  const stuffs = Number(meta.stuffs ?? 0) + ((playType === 'run' && yds <= 0) ? 1 : 0);
  const neutralSnaps = Number(meta.neutralSnaps ?? 0) + (Math.abs(game.scoreHome - game.scoreAway) <= 8 ? 1 : 0);
  const neutralSecs = Number(meta.neutralSecs ?? 0) + (Math.abs(game.scoreHome - game.scoreAway) <= 8 ? (40 - game.playClock) : 0);
  game.boxScore!.meta = { ...meta, plays, successful, pressures, passAttAdv: passAtt, completionsAdv: completions, airYards, yac, yacontact, explosive, stuffs, neutralSnaps, neutralSecs };
  const cpoeExpected = passAtt > 0 ? 0.62 - Math.min(0.22, (airYards / passAtt) / 100) : 0.62;
  const compPct = passAtt > 0 ? completions / passAtt : 0;
  const paceSec = neutralSnaps > 0 ? neutralSecs / neutralSnaps : 29;
  game.advancedMetrics = {
    epa: round(0.75 * game.advancedMetrics.epa + 0.25 * game.epa, 2),
    successRate: round((successful / Math.max(plays, 1)) * 100, 1),
    cpoe: round((compPct - cpoeExpected) * 100, 1),
    pressureRate: round((pressures / Math.max(passAtt, 1)) * 100, 1),
    airYards: round(airYards, 1),
    yardsAfterContact: round(yacontact, 1),
    adot: round(airYards / Math.max(passAtt, 1), 1),
    explosivePlayPct: round((explosive / Math.max(plays, 1)) * 100, 1),
    defensiveStuffs: stuffs,
    neutralPace: round(paceSec, 1),
  } satisfies NflAdvancedMetrics;
};
const ctxYac = (yds: number) => Math.max(0, yds * 0.35);

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
      yardsGained: 0, epa: 0, winProbabilityHome: 0.5, redZone: false, turnoverCount: 0, penaltiesYards: 0, advancedMetrics: { epa: 0, successRate: 0, cpoe: 0, pressureRate: 0, airYards: 0, yardsAfterContact: 0, adot: 0, explosivePlayPct: 0, defensiveStuffs: 0, neutralPace: 29 }, boxScore, consistencyIssues: [] };
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

    const isPass = game.playType === 'pass' || type === 'interception';
    const completedPass = (type === 'short-pass' || type === 'deep-pass') && yds > 0;
    const pressure = type === 'sack' || (isPass && ctx.random() < 0.3);
    updateNflAdvanced(game, type, yds, pressure, isPass, completedPass);

    const leaders = computeLeaders(game.boxScore!, ['passYds', 'rushYds', 'recYds']); game.teamLeaders = leaders.teamLeaders; game.gameLeaders = leaders.gameLeaders;
    const consistency = validateConsistency('nfl', game.boxScore!, game.scoreHome, game.scoreAway); game.consistencyIssues = consistency.issues;

    game.lastEvent = summary;
    game.lastPlay = { type, description: summary, playId: ctx.nextId(), driveId: game.driveNumber, down: game.down, distance: game.distance, yards: yds, fieldPosition: game.ballOn, playType: game.playType, passer: qb, rusher: rb, target: wr, tackler: (defense==='home'?homePlayers:awayPlayers)[ctx.randomInt(1,3)], epa: game.epa, success: yds >= Math.max(4, Math.floor(game.distance / 2)), pressure, redZone: game.redZone, isTurnover: type.includes('turnover') || type === 'interception' || type === 'fumble' };
    game.keyStats = buildKeyStats(game);
    return { game, event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway } };
  },
};
