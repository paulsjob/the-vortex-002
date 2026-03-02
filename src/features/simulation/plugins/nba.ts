import { formatClock } from '../core';
import { bumpPlayerStat, computeLeaders, initializeBoxScore, setMeta, sumTeamTotals, validateConsistency } from '../boxScore';
import type { KeyStat, NbaAdvancedMetrics, NbaGameState, SimulatorPlugin } from '../types';

const QUARTER_SECONDS = 12 * 60;
const shotClockMax = 24;
const homePlayers = ['L. James', 'A. Davis', 'D. Russell', 'A. Reaves', 'R. Hachimura'];
const awayPlayers = ['J. Tatum', 'J. Brown', 'D. White', 'J. Holiday', 'K. Porzingis'];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const buildKeyStats = (g: NbaGameState): KeyStat[] => {
  const h = g.boxScore?.teamTotals.home ?? {};
  const a = g.boxScore?.teamTotals.away ?? {};
  const homeFgp = (h.fga ?? 0) > 0 ? ((h.fgm ?? 0) / (h.fga ?? 1)) * 100 : 0;
  const awayFgp = (a.fga ?? 0) > 0 ? ((a.fgm ?? 0) / (a.fga ?? 1)) * 100 : 0;
  return [
    { label: 'Quarter', value: g.periodLabel, emphasis: 'med' },
    { label: 'Game Clock', value: formatClock(g.clockSeconds) },
    { label: 'Shot Clock', value: g.shotClock, emphasis: g.shotClock < 7 ? 'high' : 'low' },
    { label: 'Possession', value: g.possession === 'home' ? g.homeTeam : g.awayTeam },
    { label: 'Team Fouls', value: `${g.teamFoulsHome}-${g.teamFoulsAway}` },
    { label: 'FG%', value: `${homeFgp.toFixed(1)}-${awayFgp.toFixed(1)}` },
    { label: '3PM', value: `${h.tpm ?? 0}-${a.tpm ?? 0}` },
    { label: 'Assists', value: `${h.ast ?? 0}-${a.ast ?? 0}` },
    { label: 'Rebounds', value: `${h.reb ?? 0}-${a.reb ?? 0}` },
    { label: 'Run', value: g.run, emphasis: 'med' },
  ];
};

const runText = (g: NbaGameState) => {
  const runTeam = g.boxScore?.meta?.runTeam as 'home' | 'away' | undefined;
  const runPts = Number(g.boxScore?.meta?.runPoints ?? 0);
  if (!runTeam || runPts <= 0) return '0-0 run';
  return `${runTeam === 'home' ? g.homeTeam : g.awayTeam} ${Math.min(runPts, runTeam === 'home' ? g.scoreHome : g.scoreAway)}-0 run`;
};

export const nbaSimulator: SimulatorPlugin = {
  key: 'nba',
  label: 'NBA',
  createInitialGame: () => {
    const boxScore = initializeBoxScore('nba', homePlayers, awayPlayers, ['pts', 'ast', 'reb', 'stl', 'blk', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'fouls', 'turnovers', 'minutes','paintPts','doubleDouble']);
    const game: NbaGameState = {
      sport: 'nba', homeTeam: 'LAL', awayTeam: 'BOS', scoreHome: 0, scoreAway: 0, period: 1, periodLabel: 'Q1', clockSeconds: QUARTER_SECONDS, possession: 'away',
      lastEvent: 'Tip-off controlled by BOS.', keyStats: [], lastPlay: { type: 'tipoff', description: 'Tip-off controlled by BOS.', playId: 0, points: 0, shooter: 'N/A', shotType: 'midrange', possession: 'away', shotClock: 24, paceEstimate: 99, offensiveRating: 110, defensiveRating: 110, netRating: 0, tsApprox: 0 },
      shotClock: shotClockMax, teamFoulsHome: 0, teamFoulsAway: 0, bonusHome: false, bonusAway: false, turnoversHome: 0, turnoversAway: 0,
      pointsLeader: 'L. James 0', assistsLeader: 'L. James 0', reboundsLeader: 'A. Davis 0', lastShot: 'NONE', shotResult: 'none', run: '0-0 run',
      paceEstimate: 99, offensiveRatingEstimate: 110, winProbabilityHome: 0.5, advancedMetrics: { offensiveRating: 110, defensiveRating: 110, netRating: 0, trueShootingPct: 55, pace: 99, assistRatio: 16, reboundPct: 50, usageRate: 21, ppp: 1.1, astToRatio: 1.5 }, boxScore, consistencyIssues: [],
    };
    const leaders = computeLeaders(boxScore, ['pts', 'ast', 'reb']);
    game.teamLeaders = leaders.teamLeaders;
    game.gameLeaders = leaders.gameLeaders;
    game.keyStats = buildKeyStats(game);
    return game;
  },
  forceActions: ['3PT', 'turnover', 'foul'],
  forcePlay: (game, ctx, history, action) => {
    if (action === '3PT') return nbaSimulator.step(game, { ...ctx, random: () => 0.26, randomInt: (a,b)=>b }, history);
    if (action === 'turnover') return nbaSimulator.step(game, { ...ctx, random: () => 0.12, randomInt: (a,b)=>a }, history);
    if (action === 'foul') return nbaSimulator.step(game, { ...ctx, random: () => 0.2, randomInt: (a,b)=>a }, history);
    return nbaSimulator.step(game, ctx, history);
  },
  step: (previous, ctx) => {
    const game = structuredClone(previous) as NbaGameState;
    const offense = game.possession ?? 'home';
    const shooter = (offense === 'home' ? homePlayers : awayPlayers)[ctx.randomInt(0, 4)];
    const assister = (offense === 'home' ? homePlayers : awayPlayers)[ctx.randomInt(0, 4)];
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(4, 20));
    game.shotClock = clamp(game.shotClock - ctx.randomInt(4, 10), 0, shotClockMax);
    let summary = '';
    let points = 0;
    let type = 'possession';
    game.lastShot = 'NONE';
    game.shotResult = 'none';

    const missRebound = () => {
      const rebTeam: 'home' | 'away' = ctx.random() < 0.75 ? (offense === 'home' ? 'away' : 'home') : offense;
      const rebPlayer = (rebTeam === 'home' ? homePlayers : awayPlayers)[ctx.randomInt(0, 4)];
      bumpPlayerStat(game.boxScore!, rebTeam, rebPlayer, 'reb', 1);
      summary = `${rebTeam===offense?'Offensive':'Defensive'} rebound by ${rebPlayer}.`;
      type = rebTeam===offense?'off-reb':'def-reb';
      if (rebTeam !== offense) game.possession = rebTeam;
    };

    const roll = ctx.random();
    if (roll < 0.07) {
      type = 'timeout';
      summary = `${offense === 'home' ? game.homeTeam : game.awayTeam} takes timeout.`;
      game.shotClock = shotClockMax;
    } else if (roll < 0.16) {
      type = 'turnover';
      game.shotResult = 'turnover';
      bumpPlayerStat(game.boxScore!, offense, shooter, 'turnovers', 1);
      const stealer = (offense === 'home' ? awayPlayers : homePlayers)[ctx.randomInt(0, 4)];
      bumpPlayerStat(game.boxScore!, offense === 'home' ? 'away' : 'home', stealer, 'stl', 1);
      summary = `Turnover by ${shooter}; steal by ${stealer}.`;
      game.shotClock = shotClockMax;
      game.possession = offense === 'home' ? 'away' : 'home';
    } else if (roll < 0.22) {
      type = 'foul';
      game.lastShot = 'FT';
      game.shotResult = 'foul';
      const defense = offense === 'home' ? 'away' : 'home';
      const foulPlayer = (defense === 'home' ? homePlayers : awayPlayers)[ctx.randomInt(0, 4)];
      bumpPlayerStat(game.boxScore!, defense, foulPlayer, 'fouls', 1);
      offense === 'home' ? (game.teamFoulsAway += 1) : (game.teamFoulsHome += 1);
      for (let i = 0; i < 2; i += 1) {
        bumpPlayerStat(game.boxScore!, offense, shooter, 'fta', 1);
        if (ctx.random() < 0.78) {
          bumpPlayerStat(game.boxScore!, offense, shooter, 'ftm', 1);
          bumpPlayerStat(game.boxScore!, offense, shooter, 'pts', 1);
          points += 1;
        }
      }
      summary = `${shooter} at the line for two.`;
      game.shotClock = shotClockMax;
    } else {
      const isThree = ctx.random() < 0.36;
      const made = ctx.random() < (isThree ? 0.37 : 0.52);
      game.lastShot = isThree ? '3PT' : '2PT';
      game.shotResult = made ? 'made' : 'missed';
      bumpPlayerStat(game.boxScore!, offense, shooter, 'fga', 1);
      if (isThree) bumpPlayerStat(game.boxScore!, offense, shooter, 'tpa', 1);
      if (made) {
        type = 'made-shot';
        points = isThree ? 3 : 2;
        bumpPlayerStat(game.boxScore!, offense, shooter, 'fgm', 1);
        if (isThree) bumpPlayerStat(game.boxScore!, offense, shooter, 'tpm', 1);
        bumpPlayerStat(game.boxScore!, offense, shooter, 'pts', points); if(!isThree) bumpPlayerStat(game.boxScore!, offense, shooter, 'paintPts', 2);
        if (assister !== shooter && ctx.random() < 0.7) bumpPlayerStat(game.boxScore!, offense, assister, 'ast', 1);
        summary = `${shooter} ${isThree ? 'hits from deep' : 'scores at the rim'}.`;
      } else {
        type = 'miss';
        summary = `${shooter} misses ${isThree ? 'a three' : 'a jumper'}.`;
        if (ctx.random() < 0.1) {
          const blocker = (offense === 'home' ? awayPlayers : homePlayers)[ctx.randomInt(0, 4)];
          bumpPlayerStat(game.boxScore!, offense === 'home' ? 'away' : 'home', blocker, 'blk', 1);
        }
        missRebound();
      }
      game.shotClock = shotClockMax;
    }

    if (points > 0) {
      offense === 'home' ? (game.scoreHome += points) : (game.scoreAway += points);
      const runTeam = game.boxScore!.meta?.runTeam as 'home' | 'away' | undefined;
      const current = Number(game.boxScore!.meta?.runPoints ?? 0);
      setMeta(game.boxScore!, 'runTeam', offense);
      setMeta(game.boxScore!, 'runPoints', runTeam === offense ? current + points : points);
    } else if (type !== 'timeout') {
      setMeta(game.boxScore!, 'runPoints', 0);
      setMeta(game.boxScore!, 'runTeam', '');
    }

    homePlayers.forEach((p) => bumpPlayerStat(game.boxScore!, 'home', p, 'minutes', 0.2));
    awayPlayers.forEach((p) => bumpPlayerStat(game.boxScore!, 'away', p, 'minutes', 0.2));
    sumTeamTotals(game.boxScore!);
    for (const [player, line] of Object.entries(game.boxScore!.homePlayers)) { if ((line.pts ?? 0) >= 10 && ((line.reb ?? 0) >= 10 || (line.ast ?? 0) >= 10)) game.boxScore!.homePlayers[player].doubleDouble = 1; }
    for (const [player, line] of Object.entries(game.boxScore!.awayPlayers)) { if ((line.pts ?? 0) >= 10 && ((line.reb ?? 0) >= 10 || (line.ast ?? 0) >= 10)) game.boxScore!.awayPlayers[player].doubleDouble = 1; }
    game.turnoversHome = Math.round(game.boxScore!.teamTotals.home.turnovers ?? 0);
    game.turnoversAway = Math.round(game.boxScore!.teamTotals.away.turnovers ?? 0);
    game.bonusHome = game.teamFoulsAway >= 5;
    game.bonusAway = game.teamFoulsHome >= 5;
    game.run = runText(game);

    const leaders = computeLeaders(game.boxScore!, ['pts', 'ast', 'reb']);
    game.teamLeaders = leaders.teamLeaders;
    game.gameLeaders = leaders.gameLeaders;
    game.pointsLeader = `${leaders.gameLeaders.pts[0]?.player ?? 'N/A'} ${leaders.gameLeaders.pts[0]?.value ?? 0}`;
    game.assistsLeader = `${leaders.gameLeaders.ast[0]?.player ?? 'N/A'} ${leaders.gameLeaders.ast[0]?.value ?? 0}`;
    game.reboundsLeader = `${leaders.gameLeaders.reb[0]?.player ?? 'N/A'} ${leaders.gameLeaders.reb[0]?.value ?? 0}`;

    const poss = (game.boxScore!.teamTotals.home.fga ?? 0) + (game.boxScore!.teamTotals.away.fga ?? 0);
    game.paceEstimate = clamp(Math.round(90 + poss / Math.max(game.period, 1)), 85, 115);
    game.offensiveRatingEstimate = clamp(Math.round(((game.scoreHome + game.scoreAway) / Math.max(poss, 1)) * 100), 80, 140);
    game.winProbabilityHome = clamp(0.5 + (game.scoreHome - game.scoreAway) * 0.03, 0.02, 0.98);

    const homeTotals = game.boxScore!.teamTotals.home;
    const awayTotals = game.boxScore!.teamTotals.away;
    const homePoss = (homeTotals.fga ?? 0) + 0.44 * (homeTotals.fta ?? 0) + (homeTotals.turnovers ?? 0);
    const awayPoss = (awayTotals.fga ?? 0) + 0.44 * (awayTotals.fta ?? 0) + (awayTotals.turnovers ?? 0);
    const totalPoss = Math.max((homePoss + awayPoss) / 2, 1);
    const offRtg = ((homeTotals.pts ?? game.scoreHome) / totalPoss) * 100;
    const defRtg = ((awayTotals.pts ?? game.scoreAway) / totalPoss) * 100;
    const ts = ((homeTotals.pts ?? game.scoreHome) / (2 * Math.max((homeTotals.fga ?? 0) + 0.44 * (homeTotals.fta ?? 0), 1))) * 100;
    const assistRatio = ((homeTotals.ast ?? 0) * 100) / Math.max((homeTotals.fga ?? 0) + 0.44 * (homeTotals.fta ?? 0) + (homeTotals.ast ?? 0) + (homeTotals.turnovers ?? 0), 1);
    const rebPct = ((homeTotals.reb ?? 0) / Math.max((homeTotals.reb ?? 0) + (awayTotals.reb ?? 0), 1)) * 100;
    const usage = (((homeTotals.fga ?? 0) + 0.44 * (homeTotals.fta ?? 0) + (homeTotals.turnovers ?? 0)) / Math.max(totalPoss * 5, 1)) * 100;
    const ppp = (homeTotals.pts ?? game.scoreHome) / Math.max(homePoss, 1);
    const astTo = (homeTotals.ast ?? 0) / Math.max(homeTotals.turnovers ?? 0, 1);
    game.advancedMetrics = {
      offensiveRating: Number(offRtg.toFixed(1)),
      defensiveRating: Number(defRtg.toFixed(1)),
      netRating: Number((offRtg - defRtg).toFixed(1)),
      trueShootingPct: Number(ts.toFixed(1)),
      pace: game.paceEstimate,
      assistRatio: Number(assistRatio.toFixed(1)),
      reboundPct: Number(rebPct.toFixed(1)),
      usageRate: Number(usage.toFixed(1)),
      ppp: Number(ppp.toFixed(2)),
      astToRatio: Number(astTo.toFixed(2)),
    } satisfies NbaAdvancedMetrics;

    if (game.clockSeconds <= 0 && game.period < 4) {
      game.period += 1; game.periodLabel = `Q${game.period}`; game.clockSeconds = QUARTER_SECONDS; game.teamFoulsHome = 0; game.teamFoulsAway = 0;
      summary = `${game.periodLabel} begins.`; type = 'quarter-start';
    }

    const check = validateConsistency('nba', game.boxScore!, game.scoreHome, game.scoreAway);
    game.consistencyIssues = check.issues;
    game.lastEvent = summary;
    game.lastPlay = { type, description: summary, playId: ctx.nextId(), points, shooter, assist: assister, shotType: game.lastShot==='3PT'?'three':game.lastShot==='FT'?'free-throw':'rim', isThree: game.lastShot === '3PT', isFoul: type === 'foul', possession: offense, shotClock: game.shotClock, paceEstimate: game.paceEstimate, offensiveRating: game.offensiveRatingEstimate, defensiveRating: 112, netRating: Number((game.offensiveRatingEstimate-112).toFixed(1)), tsApprox: Number((((game.boxScore?.teamTotals[offense].pts ?? 0)/(2*Math.max((game.boxScore?.teamTotals[offense].fga ?? 0)+0.44*(game.boxScore?.teamTotals[offense].fta ?? 0),1)))*100).toFixed(1)) };
    game.keyStats = buildKeyStats(game);
    game.possession = game.possession ?? (offense === 'home' ? 'away' : 'home');

    return { game, event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway } };
  },
};
