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

const homeRoster = ['Tatum', 'Brown', 'Holiday', 'Porzingis', 'White', 'Horford', 'Pritchard', 'Hauser'];
const awayRoster = ['Durant', 'Booker', 'Beal', 'Nurkic', 'Allen', 'Gordon', 'O\'Neale', 'Bol'];

const outcomes: Array<{ type: string; weight: number }> = [
  { type: 'shot-attempt', weight: 30 },
  { type: 'made-2', weight: 14 },
  { type: 'made-3', weight: 10 },
  { type: 'free-throw', weight: 10 },
  { type: 'rebound', weight: 14 },
  { type: 'assist', weight: 8 },
  { type: 'turnover', weight: 8 },
  { type: 'foul', weight: 6 },
];

const pickOutcome = (r: number) => {
  const total = outcomes.reduce((sum, item) => sum + item.weight, 0);
  let cursor = r * total;
  for (const item of outcomes) {
    cursor -= item.weight;
    if (cursor <= 0) return item.type;
  }
  return outcomes[outcomes.length - 1]!.type;
};

const metricsTemplate = {
  offensiveRating: 113,
  defensiveRating: 111,
  netRating: 2,
  trueShootingPercent: 57,
  pace: 98,
  assistRatio: 18,
  reboundPercent: 50,
  usageRate: 22,
  pointsPerPossession: 1.09,
  assistToTurnoverRatio: 1.8,
  trueShootingPct: 57,
  ppp: 1.09,
  astToRatio: 1.8,
};

const createInitialGame = (): GameState => {
  const players = mergePlayers(createPlayers(homeRoster, 'home'), createPlayers(awayRoster, 'away'));
  const boxScore = createEmptyBoxScore('nba', players);
  const game: GameState = {
    id: 'sim-nba-001',
    sport: 'nba',
    status: 'scheduled',
    homeTeam: 'Boston Celtics',
    awayTeam: 'Phoenix Suns',
    homeAbbr: 'BOS',
    awayAbbr: 'PHX',
    scoreHome: 0,
    scoreAway: 0,
    period: 1,
    periodLabel: 'Q1',
    clockSeconds: 720,
    clockDisplay: formatClock(720),
    possession: 'home',
    lastEvent: 'Opening tip complete',
    lastPlay: { type: 'init', description: 'Simulation initialized' },
    context: {
      shotClock: 24,
      teamFoulsHome: 0,
      teamFoulsAway: 0,
    },
    players,
    keyStats: [],
    teamLeaders: { home: {}, away: {} },
    gameLeaders: {},
    advancedMetrics: { ...metricsTemplate },
    boxScore,
  };

  const leaders = buildLeaders(players, 'nba');
  game.teamLeaders = leaders.teamLeaders;
  game.gameLeaders = leaders.gameLeaders;
  updateKeyStats(game);
  return game;
};

const updateMetrics = (game: GameState, rand: () => number) => {
  const metrics = game.advancedMetrics;
  metrics.offensiveRating = randomWalk(metrics.offensiveRating, (rand() - 0.5) * 0.9, 85, 135, 2);
  metrics.defensiveRating = randomWalk(metrics.defensiveRating, (rand() - 0.5) * 0.9, 85, 135, 2);
  metrics.netRating = clampMetric(metrics.offensiveRating - metrics.defensiveRating, -35, 35, 2);
  metrics.trueShootingPercent = randomWalk(metrics.trueShootingPercent, (rand() - 0.5) * 0.4, 40, 75, 2);
  metrics.pace = randomWalk(metrics.pace, (rand() - 0.5) * 0.6, 85, 115, 2);
  metrics.assistRatio = randomWalk(metrics.assistRatio, (rand() - 0.5) * 0.3, 5, 35, 2);
  metrics.reboundPercent = randomWalk(metrics.reboundPercent, (rand() - 0.5) * 0.4, 30, 70, 2);
  metrics.usageRate = randomWalk(metrics.usageRate, (rand() - 0.5) * 0.3, 10, 45, 2);
  metrics.pointsPerPossession = randomWalk(metrics.pointsPerPossession, (rand() - 0.5) * 0.02, 0.7, 1.6, 3);
  metrics.assistToTurnoverRatio = randomWalk(metrics.assistToTurnoverRatio, (rand() - 0.5) * 0.03, 0.5, 3.5, 3);

  metrics.trueShootingPct = metrics.trueShootingPercent;
  metrics.ppp = metrics.pointsPerPossession;
  metrics.astToRatio = metrics.assistToTurnoverRatio;
};

export const nbaSimulator: SimulatorPlugin = {
  key: 'nba',
  label: 'NBA',
  expectedEventRange: { min: 500, max: 900 },
  createInitialGame,
  step: (game, ctx, _history) => {
    const next = advanceClock({ ...game, status: 'running' }, ctx.randomInt(4, 14), 4, 720);

    const side = (next.possession ?? 'home') as 'home' | 'away';
    const offenseName = side === 'home' ? next.homeTeam : next.awayTeam;
    const defenseName = side === 'home' ? next.awayTeam : next.homeTeam;
    const playerIds = Object.values(next.players).filter((player) => player.team === side).map((player) => player.id);
    const playerId = ctx.pick(playerIds);
    const player = next.players[playerId]!;
    const box = side === 'home' ? next.boxScore.homePlayers[player.name] : next.boxScore.awayPlayers[player.name];

    const eventType = pickOutcome(ctx.random());
    let points = 0;
    let summary = '';

    if (eventType === 'made-3') {
      points = 3;
      summary = `${player.name} hits a 3 from the right wing`;
      box.shots += 1;
    } else if (eventType === 'made-2') {
      points = 2;
      summary = `${player.name} scores at the rim for ${offenseName}`;
      box.shots += 1;
    } else if (eventType === 'free-throw') {
      points = 1;
      summary = `${player.name} converts at the line`;
      box.attempts += 1;
    } else if (eventType === 'turnover') {
      summary = `${player.name} turns it over to ${defenseName}`;
      box.attempts += 1;
      next.possession = side === 'home' ? 'away' : 'home';
    } else if (eventType === 'assist') {
      box.assists += 1;
      summary = `${player.name} finds a cutter for an easy two`;
    } else if (eventType === 'rebound') {
      box.rebounds += 1;
      summary = `${player.name} secures the board`;
    } else if (eventType === 'foul') {
      if (side === 'home') {
        next.context.teamFoulsAway = Number(next.context.teamFoulsAway ?? 0) + 1;
      } else {
        next.context.teamFoulsHome = Number(next.context.teamFoulsHome ?? 0) + 1;
      }
      summary = `${player.name} draws contact`;
    } else {
      summary = `${player.name} attempts a jumper`;
      box.shots += 1;
    }

    if (points > 0) {
      applyScore(next, side, points);
      player.stats.points = (player.stats.points ?? 0) + points;
      box.points += points;
      next.possession = side === 'home' ? 'away' : 'home';
    }

    player.stats.touches = (player.stats.touches ?? 0) + 1;
    next.context.shotClock = points > 0 || eventType === 'turnover' ? 24 : Math.max(0, Number(next.context.shotClock ?? 24) - ctx.randomInt(1, 5));

    updateMetrics(next, () => ctx.random());
    updateBoxTotals(next);
    const leaders = buildLeaders(next.players, 'nba');
    next.teamLeaders = leaders.teamLeaders;
    next.gameLeaders = leaders.gameLeaders;
    next.lastEvent = summary;
    next.lastPlay = { type: eventType, description: summary, player: player.name, team: side, points };
    updateKeyStats(next);

    const event: SimulationEvent = {
      id: ctx.nextId(),
      summary,
      periodLabel: next.periodLabel,
      clockLabel: next.clockDisplay,
      scoreHome: next.scoreHome,
      scoreAway: next.scoreAway,
      eventType,
      team: offenseName,
      player: player.name,
      payload: {
        shotClock: next.context.shotClock,
        points,
        possession: next.possession,
      },
    };

    return { game: next, event };
  },
};

