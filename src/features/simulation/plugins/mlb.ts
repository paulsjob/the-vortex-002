import { formatClock } from '../core';
import type { GameState, SimulationEvent, SimulatorPlugin } from '../types';
import {
  advanceClock,
  applyScore,
  buildLeaders,
  clampMetric,
  createEmptyBoxScore,
  createPlayers,
  mergePlayers,
  randomWalk,
  updateBoxTotals,
  updateKeyStats,
} from './shared';

const homeRoster = ['Judge', 'Soto', 'Rizzo', 'Torres', 'Volpe', 'Stanton', 'Cole', 'Holmes'];
const awayRoster = ['Devers', 'Story', 'Casas', 'Duran', 'Yoshida', 'Bello', 'Rafaela', 'Jansen'];

const eventWeights: Array<{ type: string; weight: number }> = [
  { type: 'pitch', weight: 20 },
  { type: 'ball', weight: 12 },
  { type: 'strike', weight: 14 },
  { type: 'swing', weight: 10 },
  { type: 'batted-ball', weight: 12 },
  { type: 'out', weight: 10 },
  { type: 'base-advance', weight: 10 },
  { type: 'home-run', weight: 6 },
  { type: 'walk', weight: 6 },
];

const weightedPick = (roll: number) => {
  const total = eventWeights.reduce((sum, item) => sum + item.weight, 0);
  let cursor = roll * total;
  for (const item of eventWeights) {
    cursor -= item.weight;
    if (cursor <= 0) return item.type;
  }
  return eventWeights[eventWeights.length - 1]!.type;
};

const initialMetrics = {
  exitVelocity: 89,
  launchAngle: 14,
  barrelPercent: 8,
  whiffPercent: 23,
  chaseRate: 29,
  spinRate: 2250,
  hardHitPercent: 34,
  xwOBA: 0.318,
  zoneContactPercent: 82,
  sprintSpeed: 27.4,
  barrelPct: 8,
  whiffPct: 23,
  hardHitPct: 34,
  zoneContactPct: 82,
};

const createInitialGame = (): GameState => {
  const players = mergePlayers(createPlayers(homeRoster, 'home'), createPlayers(awayRoster, 'away'));
  const boxScore = createEmptyBoxScore('mlb', players);

  const game: GameState = {
    id: 'sim-mlb-001',
    sport: 'mlb',
    status: 'scheduled',
    homeTeam: 'New York Yankees',
    awayTeam: 'Boston Red Sox',
    homeAbbr: 'NYY',
    awayAbbr: 'BOS',
    scoreHome: 0,
    scoreAway: 0,
    period: 1,
    periodLabel: 'Inning 1',
    clockSeconds: 180,
    clockDisplay: formatClock(180),
    possession: 'away',
    lastEvent: 'First pitch ready',
    lastPlay: { type: 'init', description: 'Simulation initialized' },
    context: {
      inning: 1,
      half: 'top',
      outs: 0,
      balls: 0,
      strikes: 0,
      bases: { first: false, second: false, third: false },
    },
    players,
    keyStats: [],
    teamLeaders: { home: {}, away: {} },
    gameLeaders: {},
    advancedMetrics: { ...initialMetrics },
    boxScore,
  };

  const leaders = buildLeaders(players, 'mlb');
  game.teamLeaders = leaders.teamLeaders;
  game.gameLeaders = leaders.gameLeaders;
  updateKeyStats(game);
  return game;
};

const applyEventToGame = (game: GameState, eventType: string, side: 'home' | 'away', playerId: string, random: () => number) => {
  const player = game.players[playerId]!;
  const battingTeam = side === 'home' ? game.homeTeam : game.awayTeam;
  const fieldingTeam = side === 'home' ? game.awayTeam : game.homeTeam;

  player.stats.touches = (player.stats.touches ?? 0) + 1;
  const playerBox = side === 'home' ? game.boxScore.homePlayers[player.name] : game.boxScore.awayPlayers[player.name];
  playerBox.attempts += 1;

  let scoreDelta = 0;
  let summary = '';

  if (eventType === 'home-run') {
    scoreDelta = 1;
    player.stats.points = (player.stats.points ?? 0) + 1;
    player.stats.rbi = (player.stats.rbi ?? 0) + 1;
    playerBox.rbi += 1;
    summary = `${player.name} crushes a home run for ${battingTeam}`;
  } else if (eventType === 'base-advance') {
    scoreDelta = Number((game.context.outs as number) < 2 && random() < 0.25);
    if (scoreDelta > 0) {
      player.stats.rbi = (player.stats.rbi ?? 0) + scoreDelta;
      playerBox.rbi += scoreDelta;
    }
    summary = `${player.name} puts it in play and advances the runners`;
  } else if (eventType === 'walk') {
    summary = `${player.name} draws a walk`;
  } else if (eventType === 'out') {
    game.context.outs = Math.min(2, Number(game.context.outs ?? 0) + 1);
    summary = `${player.name} is retired by ${fieldingTeam}`;
  } else if (eventType === 'strike') {
    game.context.strikes = Math.min(2, Number(game.context.strikes ?? 0) + 1);
    summary = `${player.name} takes strike ${game.context.strikes}`;
  } else if (eventType === 'ball') {
    game.context.balls = Math.min(3, Number(game.context.balls ?? 0) + 1);
    summary = `Ball ${game.context.balls} to ${player.name}`;
  } else if (eventType === 'batted-ball') {
    summary = `${player.name} barrels a ball into the gap`;
  } else if (eventType === 'swing') {
    summary = `${player.name} swings through high heat`;
  } else {
    summary = `Pitch delivered to ${player.name}`;
  }

  applyScore(game, side, scoreDelta);
  updateBoxTotals(game);

  // Statcast-like metrics drift.
  const metrics = game.advancedMetrics;
  metrics.exitVelocity = randomWalk(metrics.exitVelocity, (random() - 0.5) * 4, 60, 115, 1);
  metrics.launchAngle = randomWalk(metrics.launchAngle, (random() - 0.5) * 3, -20, 50, 1);
  metrics.spinRate = randomWalk(metrics.spinRate, (random() - 0.5) * 55, 1800, 2800, 0);
  metrics.barrelPercent = randomWalk(metrics.barrelPercent, (random() - 0.5) * 0.5, 1, 30, 2);
  metrics.whiffPercent = randomWalk(metrics.whiffPercent, (random() - 0.5) * 0.6, 5, 45, 2);
  metrics.chaseRate = randomWalk(metrics.chaseRate, (random() - 0.5) * 0.5, 10, 45, 2);
  metrics.hardHitPercent = randomWalk(metrics.hardHitPercent, (random() - 0.5) * 0.5, 10, 60, 2);
  metrics.xwOBA = clampMetric(metrics.xwOBA + (random() - 0.5) * 0.004, 0.15, 0.6, 3);
  metrics.zoneContactPercent = randomWalk(metrics.zoneContactPercent, (random() - 0.5) * 0.6, 50, 95, 2);
  metrics.sprintSpeed = randomWalk(metrics.sprintSpeed, (random() - 0.5) * 0.2, 22, 31, 2);

  metrics.barrelPct = metrics.barrelPercent;
  metrics.whiffPct = metrics.whiffPercent;
  metrics.hardHitPct = metrics.hardHitPercent;
  metrics.zoneContactPct = metrics.zoneContactPercent;

  return summary;
};

export const mlbSimulator: SimulatorPlugin = {
  key: 'mlb',
  label: 'MLB',
  expectedEventRange: { min: 800, max: 1500 },
  createInitialGame,
  step: (game, ctx, _history) => {
    const next = advanceClock({ ...game, status: 'running' }, ctx.randomInt(2, 8), 9, 180);
    next.context.inning = next.period;

    if (Number(next.context.outs ?? 0) >= 2) {
      next.context.outs = 0;
      next.context.half = next.context.half === 'top' ? 'bottom' : 'top';
      next.possession = next.context.half === 'top' ? 'away' : 'home';
    }

    const side = (next.possession ?? 'home') as 'home' | 'away';
    const playerIds = Object.values(next.players).filter((player) => player.team === side).map((player) => player.id);
    const playerId = ctx.pick(playerIds);
    const eventType = weightedPick(ctx.random());
    const summary = applyEventToGame(next, eventType, side, playerId, () => ctx.random());

    const { teamLeaders, gameLeaders } = buildLeaders(next.players, 'mlb');
    next.teamLeaders = teamLeaders;
    next.gameLeaders = gameLeaders;
    next.lastEvent = summary;
    next.lastPlay = { type: eventType, description: summary, player: next.players[playerId].name, team: side };
    updateKeyStats(next);

    const event: SimulationEvent = {
      id: ctx.nextId(),
      summary,
      periodLabel: next.periodLabel,
      clockLabel: next.clockDisplay,
      scoreHome: next.scoreHome,
      scoreAway: next.scoreAway,
      eventType,
      team: side === 'home' ? next.homeTeam : next.awayTeam,
      player: next.players[playerId].name,
      payload: {
        inning: next.context.inning,
        half: next.context.half,
        outs: next.context.outs,
        balls: next.context.balls,
        strikes: next.context.strikes,
        exitVelocity: next.advancedMetrics.exitVelocity,
        launchAngle: next.advancedMetrics.launchAngle,
      },
    };

    return { game: next, event };
  },
};

