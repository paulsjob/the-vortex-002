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

const homeRoster = ['Matthews', 'Marner', 'Nylander', 'Rielly', 'Tavares', 'Bertuzzi', 'Woll', 'Benoit'];
const awayRoster = ['Panarin', 'Zibanejad', 'Fox', 'Kreider', 'Trocheck', 'Lafreniere', 'Shesterkin', 'Trouba'];

const eventTypes: Array<{ type: string; weight: number }> = [
  { type: 'faceoff', weight: 10 },
  { type: 'shot-attempt', weight: 20 },
  { type: 'save', weight: 18 },
  { type: 'goal', weight: 8 },
  { type: 'penalty', weight: 10 },
  { type: 'takeaway', weight: 12 },
  { type: 'giveaway', weight: 12 },
  { type: 'slot-shot', weight: 10 },
];

const pickEvent = (roll: number) => {
  const total = eventTypes.reduce((sum, item) => sum + item.weight, 0);
  let cursor = roll * total;
  for (const item of eventTypes) {
    cursor -= item.weight;
    if (cursor <= 0) return item.type;
  }
  return eventTypes[eventTypes.length - 1]!.type;
};

const metricsTemplate = {
  expectedGoals: 1.3,
  corsiPercent: 50,
  fenwickPercent: 50,
  PDO: 100,
  highDangerChances: 4,
  zoneStartPercent: 50,
  takeaways: 6,
  expectedGoalsAgainst: 1.1,
  giveaways: 5,
  slotShots: 3,
  xG: 1.3,
  corsiForPct: 50,
  fenwickForPct: 50,
  pdo: 100,
  xGA: 1.1,
  zoneStartsPct: 50,
};

const createInitialGame = (): GameState => {
  const players = mergePlayers(createPlayers(homeRoster, 'home'), createPlayers(awayRoster, 'away'));
  const boxScore = createEmptyBoxScore('nhl', players);

  const game: GameState = {
    id: 'sim-nhl-001',
    sport: 'nhl',
    status: 'scheduled',
    homeTeam: 'Toronto Maple Leafs',
    awayTeam: 'New York Rangers',
    homeAbbr: 'TOR',
    awayAbbr: 'NYR',
    scoreHome: 0,
    scoreAway: 0,
    period: 1,
    periodLabel: 'P1',
    clockSeconds: 1200,
    clockDisplay: formatClock(1200),
    possession: 'home',
    lastEvent: 'Puck dropped',
    lastPlay: { type: 'init', description: 'Simulation initialized' },
    context: {
      strengthState: 'EV',
      powerPlaySeconds: 0,
      shotsHome: 0,
      shotsAway: 0,
    },
    players,
    keyStats: [],
    teamLeaders: { home: {}, away: {} },
    gameLeaders: {},
    advancedMetrics: { ...metricsTemplate },
    boxScore,
  };

  const leaders = buildLeaders(players, 'nhl');
  game.teamLeaders = leaders.teamLeaders;
  game.gameLeaders = leaders.gameLeaders;
  updateKeyStats(game);
  return game;
};

const updateMetrics = (game: GameState, rand: () => number) => {
  const metrics = game.advancedMetrics;
  metrics.expectedGoals = randomWalk(metrics.expectedGoals, (rand() - 0.5) * 0.08, 0, 6, 3);
  metrics.corsiPercent = randomWalk(metrics.corsiPercent, (rand() - 0.5) * 0.8, 20, 80, 2);
  metrics.fenwickPercent = randomWalk(metrics.fenwickPercent, (rand() - 0.5) * 0.8, 20, 80, 2);
  metrics.PDO = randomWalk(metrics.PDO, (rand() - 0.5) * 0.6, 90, 110, 2);
  metrics.highDangerChances = randomWalk(metrics.highDangerChances, (rand() - 0.5) * 0.5, 0, 25, 2);
  metrics.zoneStartPercent = randomWalk(metrics.zoneStartPercent, (rand() - 0.5) * 0.8, 20, 80, 2);
  metrics.takeaways = randomWalk(metrics.takeaways, (rand() - 0.5) * 0.6, 0, 30, 2);
  metrics.expectedGoalsAgainst = randomWalk(metrics.expectedGoalsAgainst, (rand() - 0.5) * 0.08, 0, 6, 3);
  metrics.giveaways = randomWalk(metrics.giveaways, (rand() - 0.5) * 0.6, 0, 30, 2);
  metrics.slotShots = randomWalk(metrics.slotShots, (rand() - 0.5) * 0.5, 0, 25, 2);

  metrics.xG = metrics.expectedGoals;
  metrics.corsiForPct = metrics.corsiPercent;
  metrics.fenwickForPct = metrics.fenwickPercent;
  metrics.pdo = metrics.PDO;
  metrics.xGA = metrics.expectedGoalsAgainst;
  metrics.zoneStartsPct = metrics.zoneStartPercent;
};

export const nhlSimulator: SimulatorPlugin = {
  key: 'nhl',
  label: 'NHL',
  expectedEventRange: { min: 600, max: 1000 },
  createInitialGame,
  step: (game, ctx, _history) => {
    const next = advanceClock({ ...game, status: 'running' }, ctx.randomInt(6, 20), 3, 1200);
    const side = (next.possession ?? 'home') as 'home' | 'away';
    const attack = side === 'home' ? next.homeTeam : next.awayTeam;
    const playerIds = Object.values(next.players).filter((player) => player.team === side).map((player) => player.id);
    const playerId = ctx.pick(playerIds);
    const player = next.players[playerId]!;
    const box = side === 'home' ? next.boxScore.homePlayers[player.name] : next.boxScore.awayPlayers[player.name];

    const eventType = pickEvent(ctx.random());
    let summary = '';
    let goals = 0;

    if (eventType === 'goal') {
      goals = 1;
      summary = `${player.name} scores for ${attack}`;
      box.goals += 1;
      box.shots += 1;
    } else if (eventType === 'save') {
      summary = `${player.name} forces a highlight save`;
      box.saves += 1;
    } else if (eventType === 'penalty') {
      next.context.strengthState = side === 'home' ? 'PP' : 'PK';
      next.context.powerPlaySeconds = 120;
      summary = `${attack} draws a power play`;
    } else if (eventType === 'takeaway') {
      summary = `${player.name} strips the puck in neutral ice`;
      box.tackles += 1;
    } else if (eventType === 'giveaway') {
      summary = `${player.name} turns it over under pressure`;
    } else if (eventType === 'slot-shot') {
      summary = `${player.name} gets a dangerous look from the slot`;
      box.shots += 1;
    } else if (eventType === 'shot-attempt') {
      summary = `${player.name} fires from the point`;
      box.shots += 1;
    } else {
      summary = `${attack} wins the faceoff cleanly`;
    }

    applyScore(next, side, goals);
    player.stats.goals = (player.stats.goals ?? 0) + goals;
    player.stats.shots = (player.stats.shots ?? 0) + Number(eventType.includes('shot') || eventType === 'goal');
    player.stats.touches = (player.stats.touches ?? 0) + 1;

    if (eventType === 'goal' || eventType === 'takeaway' || eventType === 'giveaway') {
      next.possession = side === 'home' ? 'away' : 'home';
    }

    next.context.shotsHome = Number(next.context.shotsHome ?? 0) + Number(side === 'home' && (eventType.includes('shot') || eventType === 'goal'));
    next.context.shotsAway = Number(next.context.shotsAway ?? 0) + Number(side === 'away' && (eventType.includes('shot') || eventType === 'goal'));

    if (Number(next.context.powerPlaySeconds ?? 0) > 0) {
      next.context.powerPlaySeconds = Math.max(0, Number(next.context.powerPlaySeconds) - ctx.randomInt(5, 12));
      if (next.context.powerPlaySeconds === 0) next.context.strengthState = 'EV';
    }

    updateMetrics(next, () => ctx.random());
    updateBoxTotals(next);
    const leaders = buildLeaders(next.players, 'nhl');
    next.teamLeaders = leaders.teamLeaders;
    next.gameLeaders = leaders.gameLeaders;
    next.lastEvent = summary;
    next.lastPlay = { type: eventType, description: summary, player: player.name, team: side, goals };
    updateKeyStats(next);

    const event: SimulationEvent = {
      id: ctx.nextId(),
      summary,
      periodLabel: next.periodLabel,
      clockLabel: next.clockDisplay,
      scoreHome: next.scoreHome,
      scoreAway: next.scoreAway,
      eventType,
      team: attack,
      player: player.name,
      payload: {
        strengthState: next.context.strengthState,
        powerPlaySeconds: next.context.powerPlaySeconds,
        slotShots: next.advancedMetrics.slotShots,
      },
    };

    return { game: next, event };
  },
};
