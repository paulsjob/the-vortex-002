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
  const homeComp = (h.passAtt ?? 0) > 0 ? ((h.passComp ?? 0) / (h.passAtt ?? 1)) * 100 : 0;
  const awayComp = (a.passAtt ?? 0) > 0 ? ((a.passComp ?? 0) / (a.passAtt ?? 1)) * 100 : 0;
  const homeYpc = (h.rushAtt ?? 0) > 0 ? (h.rushYds ?? 0) / (h.rushAtt ?? 1) : 0;
  return [
    { label: 'Down & Dist', value: `${g.down} & ${g.distance}` },
    { label: 'Yard Line', value: g.yardLine },
    { label: 'Play Type', value: g.playType },
    { label: 'Pass Yds', value: `${h.passYds ?? 0}-${a.passYds ?? 0}` },
    { label: 'Comp%', value: `${homeComp.toFixed(1)}-${awayComp.toFixed(1)}` },
    { label: 'Rush Yds', value: `${h.rushYds ?? 0}-${a.rushYds ?? 0}` },
    { label: 'Home YPC', value: homeYpc.toFixed(1) },
    { label: 'Drive Plays', value: g.playsThisDrive },
    { label: 'TOP', value: `${Math.round(h.topSec ?? 0)}-${Math.round(a.topSec ?? 0)}s` },
    { label: 'EPA', value: g.epa.toFixed(2) },
  ];
};

export const nflSimulator: SimulatorPlugin = {
  key: 'nfl', label: 'NFL',
  createInitialGame: () => {
    const boxScore = initializeBoxScore('nfl', homePlayers, awayPlayers, ['passAtt', 'passComp', 'passYds', 'passTd', 'int', 'rushAtt', 'rushYds', 'rushTd', 'targets', 'rec', 'recYds', 'recTd', 'topSec']);
    const game: NflGameState = { sport: 'nfl', homeTeam: 'KC', awayTeam: 'BUF', scoreHome: 0, scoreAway: 0, period: 1, periodLabel: 'Q1', clockSeconds: QUARTER_SECONDS, possession: 'away',
      lastEvent: 'Kickoff returned to BUF 23.', keyStats: [], lastPlay: { type: 'kickoff', description: 'Kickoff returned to BUF 23.', down: 1, distance: 10, yards: 0 }, down: 1, distance: 10, yardLine: 'BUF 23',
      ballOn: 23, driveNumber: 1, playClock: 40, possessionTeam: 'BUF', yardsThisDrive: 0, playsThisDrive: 0, timeoutsHome: 3, timeoutsAway: 3, passerName: 'J. Allen', rusherName: 'J. Cook', receiverName: 'S. Diggs', playType: 'pass',
      yardsGained: 0, epa: 0, winProbabilityHome: 0.5, redZone: false, turnoverCount: 0, penaltiesYards: 0, boxScore, consistencyIssues: [] };
    const l = computeLeaders(boxScore, ['passYds', 'rushYds', 'recYds']); game.teamLeaders = l.teamLeaders; game.gameLeaders = l.gameLeaders; game.keyStats = buildKeyStats(game); return game;
  },
  step: (previous, ctx) => {
    const game = structuredClone(previous) as NflGameState;
    const offense = game.possession ?? 'home';
    const offensePlayers = offense === 'home' ? homePlayers : awayPlayers;
    const qb = offensePlayers[0], rb = offensePlayers[1], wr = offensePlayers[2 + ctx.randomInt(0, 1)];
    game.possessionTeam = offense === 'home' ? game.homeTeam : game.awayTeam;
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(18, 35));
    game.playClock = ctx.randomInt(20, 40);
    let summary = ''; let type = 'play'; let yds = 0;
    bumpPlayerStat(game.boxScore!, offense, qb, 'topSec', 25);

    const roll = ctx.random();
    if (roll < 0.45) {
      type = 'pass'; game.playType = 'pass'; bumpPlayerStat(game.boxScore!, offense, qb, 'passAtt', 1); bumpPlayerStat(game.boxScore!, offense, wr, 'targets', 1);
      if (ctx.random() < 0.66) {
        yds = ctx.randomInt(3, 25); bumpPlayerStat(game.boxScore!, offense, qb, 'passComp', 1); bumpPlayerStat(game.boxScore!, offense, qb, 'passYds', yds); bumpPlayerStat(game.boxScore!, offense, wr, 'rec', 1); bumpPlayerStat(game.boxScore!, offense, wr, 'recYds', yds);
        summary = `${qb} complete to ${wr} for ${yds}.`;
      } else { summary = `${qb} incomplete for ${wr}.`; }
    } else if (roll < 0.75) {
      type = 'run'; game.playType = 'run'; yds = ctx.randomInt(-2, 16); bumpPlayerStat(game.boxScore!, offense, rb, 'rushAtt', 1); bumpPlayerStat(game.boxScore!, offense, rb, 'rushYds', yds); summary = `${rb} rushes for ${yds}.`;
    } else if (roll < 0.84) {
      type = 'sack'; game.playType = 'sack'; yds = -ctx.randomInt(4, 10); summary = `Sack for ${Math.abs(yds)} yards.`;
    } else if (roll < 0.9) {
      type = 'turnover'; game.playType = 'turnover'; bumpPlayerStat(game.boxScore!, offense, qb, 'passAtt', 1); bumpPlayerStat(game.boxScore!, offense, qb, 'int', 1); game.turnoverCount += 1; yds = -ctx.randomInt(1, 8); summary = `${qb} intercepted.`;
      game.possession = offense === 'home' ? 'away' : 'home'; game.down = 1; game.distance = 10; game.driveNumber += 1; game.yardsThisDrive = 0; game.playsThisDrive = 0;
    } else if (roll < 0.95) {
      type = 'field-goal'; game.playType = 'field_goal'; const made = ctx.random() < 0.72; summary = `${game.possessionTeam} ${made ? 'makes' : 'misses'} a FG.`; if (made) offense === 'home' ? (game.scoreHome += 3) : (game.scoreAway += 3);
      game.possession = offense === 'home' ? 'away' : 'home'; game.down = 1; game.distance = 10; game.driveNumber += 1; game.yardsThisDrive = 0; game.playsThisDrive = 0;
    } else {
      type = 'punt'; game.playType = 'punt'; summary = `${game.possessionTeam} punts away.`; game.possession = offense === 'home' ? 'away' : 'home'; game.down = 1; game.distance = 10; game.driveNumber += 1; game.yardsThisDrive = 0; game.playsThisDrive = 0;
    }

    if (type === 'pass' || type === 'run' || type === 'sack') {
      game.ballOn = clamp(game.ballOn + yds, 1, 99); game.yardsThisDrive += yds; game.playsThisDrive += 1;
      if (yds >= game.distance) { game.down = 1; game.distance = 10; } else { game.down = clamp((game.down + 1) as 1|2|3|4, 1, 4) as 1|2|3|4; game.distance = clamp(game.distance - yds, 1, 30); }
      game.redZone = game.ballOn >= 80;
      if (game.redZone && ctx.random() < 0.14) {
        if (type === 'pass') { bumpPlayerStat(game.boxScore!, offense, qb, 'passTd', 1); bumpPlayerStat(game.boxScore!, offense, wr, 'recTd', 1); }
        if (type === 'run') bumpPlayerStat(game.boxScore!, offense, rb, 'rushTd', 1);
        offense === 'home' ? (game.scoreHome += 7) : (game.scoreAway += 7); summary = `${game.possessionTeam} touchdown!`; game.possession = offense === 'home' ? 'away' : 'home'; game.down = 1; game.distance = 10; game.driveNumber += 1; game.yardsThisDrive = 0; game.playsThisDrive = 0;
      }
    }

    sumTeamTotals(game.boxScore!);
    const homeTop = game.boxScore!.teamTotals.home.topSec ?? 0; const awayTop = game.boxScore!.teamTotals.away.topSec ?? 0;
    game.yardLine = game.ballOn === 50 ? '50' : game.ballOn > 50 ? `${offense === 'home' ? game.awayTeam : game.homeTeam} ${100 - game.ballOn}` : `${game.possessionTeam} ${game.ballOn}`;
    game.passerName = qb; game.rusherName = rb; game.receiverName = wr; game.yardsGained = yds;
    game.epa = Number((((yds / 10) - (type === 'turnover' ? 2 : 0)) / 3).toFixed(2));
    game.winProbabilityHome = clamp(0.5 + (game.scoreHome - game.scoreAway) * 0.03 + (homeTop - awayTop) / 3000, 0.03, 0.97);

    const leaders = computeLeaders(game.boxScore!, ['passYds', 'rushYds', 'recYds']); game.teamLeaders = leaders.teamLeaders; game.gameLeaders = leaders.gameLeaders;
    const consistency = validateConsistency('nfl', game.boxScore!, game.scoreHome, game.scoreAway); game.consistencyIssues = consistency.issues;

    if (game.clockSeconds <= 0 && game.period < 4) { game.period += 1; game.periodLabel = `Q${game.period}`; game.clockSeconds = QUARTER_SECONDS; summary = `${game.periodLabel} begins.`; }
    game.lastEvent = summary;
    game.lastPlay = { type, description: summary, down: game.down, distance: game.distance, yards: yds, passer: qb, rusher: rb, receiver: wr, isTurnover: type === 'turnover' };
    game.keyStats = buildKeyStats(game);
    return { game, event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway } };
  },
};
