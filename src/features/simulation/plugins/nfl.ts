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

const homeRoster = ['Mahomes', 'Kelce', 'Pacheco', 'Rice', 'Jones', 'Sneed', 'Bolton', 'Butker'];
const awayRoster = ['Allen', 'Diggs', 'Cook', 'Kincaid', 'Miller', 'Rousseau', 'Milano', 'Bass'];

const playTypes: Array<{ type: string; weight: number }> = [
  { type: 'snap', weight: 8 },
  { type: 'run-attempt', weight: 18 },
  { type: 'pass-attempt', weight: 24 },
  { type: 'tackle', weight: 12 },
  { type: 'penalty', weight: 10 },
  { type: 'field-goal', weight: 8 },
  { type: 'punt', weight: 8 },
  { type: 'touchdown', weight: 6 },
  { type: 'turnover', weight: 6 },
];

const pickPlayType = (roll: number) => {
  const total = playTypes.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of playTypes) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.type;
  }
  return playTypes[playTypes.length - 1]!.type;
};

const metricsTemplate = {
  EPA: 0.04,
  successRate: 47,
  CPOE: 1.8,
  pressureRate: 27,
  airYards: 7.9,
  yardsAfterContact: 3.4,
  aDOT: 8.1,
  explosivePlayPercent: 11,
  defensiveStuffs: 5,
  neutralPace: 26,
  epa: 0.04,
  cpoe: 1.8,
  adot: 8.1,
  explosivePlayPct: 11,
};

const createInitialGame = (): GameState => {
  const players = mergePlayers(createPlayers(homeRoster, 'home'), createPlayers(awayRoster, 'away'));
  const boxScore = createEmptyBoxScore('nfl', players);

  const game: GameState = {
    id: 'sim-nfl-001',
    sport: 'nfl',
    status: 'scheduled',
    homeTeam: 'Kansas City Chiefs',
    awayTeam: 'Buffalo Bills',
    homeAbbr: 'KC',
    awayAbbr: 'BUF',
    scoreHome: 0,
    scoreAway: 0,
    period: 1,
    periodLabel: 'Q1',
    clockSeconds: 900,
    clockDisplay: formatClock(900),
    possession: 'home',
    lastEvent: 'Kickoff received',
    lastPlay: { type: 'init', description: 'Simulation initialized' },
    context: {
      down: 1,
      distance: 10,
      yardLine: 25,
    },
    players,
    keyStats: [],
    teamLeaders: { home: {}, away: {} },
    gameLeaders: {},
    advancedMetrics: { ...metricsTemplate },
    boxScore,
  };

  const leaders = buildLeaders(players, 'nfl');
  game.teamLeaders = leaders.teamLeaders;
  game.gameLeaders = leaders.gameLeaders;
  updateKeyStats(game);
  return game;
};

const updateMetrics = (game: GameState, rand: () => number) => {
  const metrics = game.advancedMetrics;
  metrics.EPA = randomWalk(metrics.EPA, (rand() - 0.5) * 0.02, -0.4, 0.6, 3);
  metrics.successRate = randomWalk(metrics.successRate, (rand() - 0.5) * 0.6, 20, 80, 2);
  metrics.CPOE = randomWalk(metrics.CPOE, (rand() - 0.5) * 0.5, -20, 20, 2);
  metrics.pressureRate = randomWalk(metrics.pressureRate, (rand() - 0.5) * 0.6, 10, 50, 2);
  metrics.airYards = randomWalk(metrics.airYards, (rand() - 0.5) * 0.2, 2, 14, 2);
  metrics.yardsAfterContact = randomWalk(metrics.yardsAfterContact, (rand() - 0.5) * 0.15, 0.5, 6.5, 2);
  metrics.aDOT = randomWalk(metrics.aDOT, (rand() - 0.5) * 0.25, 2, 16, 2);
  metrics.explosivePlayPercent = randomWalk(metrics.explosivePlayPercent, (rand() - 0.5) * 0.4, 1, 30, 2);
  metrics.defensiveStuffs = randomWalk(metrics.defensiveStuffs, (rand() - 0.5) * 0.2, 0, 15, 2);
  metrics.neutralPace = randomWalk(metrics.neutralPace, (rand() - 0.5) * 0.2, 18, 35, 2);

  metrics.epa = metrics.EPA;
  metrics.cpoe = metrics.CPOE;
  metrics.adot = metrics.aDOT;
  metrics.explosivePlayPct = metrics.explosivePlayPercent;
};

export const nflSimulator: SimulatorPlugin = {
  key: 'nfl',
  label: 'NFL',
  expectedEventRange: { min: 150, max: 250 },
  createInitialGame,
  step: (game, ctx, _history) => {
    const next = advanceClock({ ...game, status: 'running' }, ctx.randomInt(18, 38), 4, 900);
    const side = (next.possession ?? 'home') as 'home' | 'away';
    const offense = side === 'home' ? next.homeTeam : next.awayTeam;
    const defense = side === 'home' ? next.awayTeam : next.homeTeam;

    const playerIds = Object.values(next.players).filter((player) => player.team === side).map((player) => player.id);
    const playerId = ctx.pick(playerIds);
    const player = next.players[playerId]!;

    const playType = pickPlayType(ctx.random());
    let points = 0;
    let yards = 0;
    let summary = '';

    if (playType === 'touchdown') {
      points = 7;
      yards = ctx.randomInt(5, 35);
      summary = `${player.name} breaks free for a touchdown`; 
      next.context.down = 1;
      next.context.distance = 10;
      next.context.yardLine = 25;
      next.possession = side === 'home' ? 'away' : 'home';
    } else if (playType === 'field-goal') {
      points = 3;
      summary = `${offense} drills a field goal`; 
      next.context.down = 1;
      next.context.distance = 10;
      next.context.yardLine = 25;
      next.possession = side === 'home' ? 'away' : 'home';
    } else if (playType === 'pass-attempt') {
      yards = ctx.randomInt(-5, 30);
      const target = ctx.pick(playerIds);
      const targetName = next.players[target].name;
      summary = `${player.name} connects with ${targetName} for ${Math.max(0, yards)} yards`;
      next.players[target].stats.completions = (next.players[target].stats.completions ?? 0) + 1;
    } else if (playType === 'run-attempt') {
      yards = ctx.randomInt(-2, 18);
      summary = `${player.name} rushes for ${Math.max(0, yards)} yards`;
    } else if (playType === 'turnover') {
      yards = -ctx.randomInt(0, 10);
      summary = `${offense} coughs it up and ${defense} takes over`;
      next.possession = side === 'home' ? 'away' : 'home';
      next.context.down = 1;
      next.context.distance = 10;
    } else if (playType === 'penalty') {
      yards = -ctx.randomInt(5, 15);
      summary = `Penalty on ${offense}, ${Math.abs(yards)} yards`;
    } else if (playType === 'punt') {
      yards = -ctx.randomInt(35, 55);
      summary = `${offense} punts and flips field position`;
      next.possession = side === 'home' ? 'away' : 'home';
      next.context.down = 1;
      next.context.distance = 10;
      next.context.yardLine = ctx.randomInt(20, 40);
    } else if (playType === 'tackle') {
      yards = 0;
      summary = `${defense} wraps up immediately`;
    } else {
      summary = `${offense} snaps the ball`;
    }

    applyScore(next, side, points);
    player.stats.yards = (player.stats.yards ?? 0) + Math.max(0, yards);
    player.stats.points = (player.stats.points ?? 0) + points;

    if (playType !== 'punt' && playType !== 'touchdown' && playType !== 'field-goal' && playType !== 'turnover') {
      next.context.yardLine = Math.max(1, Math.min(99, Number(next.context.yardLine ?? 25) + yards));
      const distance = Math.max(1, Number(next.context.distance ?? 10) - Math.max(0, yards));
      if (distance <= 1) {
        next.context.down = 1;
        next.context.distance = 10;
      } else {
        next.context.distance = distance;
        next.context.down = Math.min(4, Number(next.context.down ?? 1) + 1);
      }
    }

    const box = side === 'home' ? next.boxScore.homePlayers[player.name] : next.boxScore.awayPlayers[player.name];
    box.yards += Math.max(0, yards);
    box.points += points;
    box.attempts += 1;

    updateMetrics(next, () => ctx.random());
    updateBoxTotals(next);
    const leaders = buildLeaders(next.players, 'nfl');
    next.teamLeaders = leaders.teamLeaders;
    next.gameLeaders = leaders.gameLeaders;
    next.lastEvent = summary;
    next.lastPlay = { type: playType, description: summary, player: player.name, team: side, yards, points };
    updateKeyStats(next);

    const event: SimulationEvent = {
      id: ctx.nextId(),
      summary,
      periodLabel: next.periodLabel,
      clockLabel: next.clockDisplay,
      scoreHome: next.scoreHome,
      scoreAway: next.scoreAway,
      eventType: playType,
      team: offense,
      player: player.name,
      payload: {
        down: next.context.down,
        distance: next.context.distance,
        yardline: next.context.yardLine,
        yards,
      },
    };

    return { game: next, event };
  },
};
