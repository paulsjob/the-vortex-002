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

const homeRoster = ['Messi', 'Suarez', 'Busquets', 'Alba', 'Gressel', 'Cremaschi', 'Callender', 'Taylor'];
const awayRoster = ['Mukhtar', 'Surridge', 'Godoy', 'Shaffelburg', 'Maher', 'Davis', 'Willis', 'Zimmerman'];

const actions: Array<{ type: string; weight: number }> = [
  { type: 'pass', weight: 26 },
  { type: 'progressive-pass', weight: 12 },
  { type: 'shot', weight: 14 },
  { type: 'big-chance', weight: 8 },
  { type: 'goal', weight: 6 },
  { type: 'foul', weight: 10 },
  { type: 'tackle', weight: 10 },
  { type: 'corner', weight: 8 },
  { type: 'substitution', weight: 6 },
];

const pickAction = (roll: number) => {
  const total = actions.reduce((sum, action) => sum + action.weight, 0);
  let cursor = roll * total;
  for (const action of actions) {
    cursor -= action.weight;
    if (cursor <= 0) return action.type;
  }
  return actions[actions.length - 1]!.type;
};

const metricsTemplate = {
  expectedGoals: 1.1,
  expectedAssists: 0.8,
  PPDA: 10.5,
  fieldTilt: 51,
  progressivePasses: 16,
  packing: 9,
  ballRecoveries: 22,
  pressures: 44,
  shotEndingSequences: 7,
  bigChancesCreated: 2,
  xG: 1.1,
  xA: 0.8,
  ppda: 10.5,
};

const createInitialGame = (): GameState => {
  const players = mergePlayers(createPlayers(homeRoster, 'home'), createPlayers(awayRoster, 'away'));
  const boxScore = createEmptyBoxScore('mls', players);

  const game: GameState = {
    id: 'sim-mls-001',
    sport: 'mls',
    status: 'scheduled',
    homeTeam: 'Inter Miami',
    awayTeam: 'Nashville SC',
    homeAbbr: 'MIA',
    awayAbbr: 'NSH',
    scoreHome: 0,
    scoreAway: 0,
    period: 1,
    periodLabel: 'Half 1',
    clockSeconds: 2700,
    clockDisplay: formatClock(2700),
    possession: 'home',
    lastEvent: 'Kickoff',
    lastPlay: { type: 'init', description: 'Simulation initialized' },
    context: {
      stoppageTime: 0,
      cornersHome: 0,
      cornersAway: 0,
    },
    players,
    keyStats: [],
    teamLeaders: { home: {}, away: {} },
    gameLeaders: {},
    advancedMetrics: { ...metricsTemplate },
    boxScore,
  };

  const leaders = buildLeaders(players, 'mls');
  game.teamLeaders = leaders.teamLeaders;
  game.gameLeaders = leaders.gameLeaders;
  updateKeyStats(game);
  return game;
};

const updateMetrics = (game: GameState, rand: () => number) => {
  const metrics = game.advancedMetrics;
  metrics.expectedGoals = randomWalk(metrics.expectedGoals, (rand() - 0.5) * 0.06, 0, 5, 3);
  metrics.expectedAssists = randomWalk(metrics.expectedAssists, (rand() - 0.5) * 0.05, 0, 4, 3);
  metrics.PPDA = randomWalk(metrics.PPDA, (rand() - 0.5) * 0.15, 4, 25, 2);
  metrics.fieldTilt = randomWalk(metrics.fieldTilt, (rand() - 0.5) * 0.7, 20, 80, 2);
  metrics.progressivePasses = randomWalk(metrics.progressivePasses, (rand() - 0.5) * 0.6, 0, 70, 2);
  metrics.packing = randomWalk(metrics.packing, (rand() - 0.5) * 0.4, 0, 40, 2);
  metrics.ballRecoveries = randomWalk(metrics.ballRecoveries, (rand() - 0.5) * 0.8, 0, 80, 2);
  metrics.pressures = randomWalk(metrics.pressures, (rand() - 0.5) * 1.2, 0, 120, 2);
  metrics.shotEndingSequences = randomWalk(metrics.shotEndingSequences, (rand() - 0.5) * 0.4, 0, 30, 2);
  metrics.bigChancesCreated = randomWalk(metrics.bigChancesCreated, (rand() - 0.5) * 0.2, 0, 15, 2);

  metrics.xG = metrics.expectedGoals;
  metrics.xA = metrics.expectedAssists;
  metrics.ppda = metrics.PPDA;
};

export const mlsSimulator: SimulatorPlugin = {
  key: 'mls',
  label: 'MLS / Soccer',
  expectedEventRange: { min: 400, max: 700 },
  createInitialGame,
  step: (game, ctx, _history) => {
    const next = advanceClock({ ...game, status: 'running' }, ctx.randomInt(8, 18), 2, 2700);
    const side = (next.possession ?? 'home') as 'home' | 'away';
    const teamName = side === 'home' ? next.homeTeam : next.awayTeam;
    const playerIds = Object.values(next.players).filter((player) => player.team === side).map((player) => player.id);
    const playerId = ctx.pick(playerIds);
    const player = next.players[playerId]!;
    const box = side === 'home' ? next.boxScore.homePlayers[player.name] : next.boxScore.awayPlayers[player.name];

    const action = pickAction(ctx.random());
    let goals = 0;
    let summary = '';

    if (action === 'goal') {
      goals = 1;
      summary = `${player.name} finishes from inside the box for ${teamName}`;
      box.goals += 1;
      box.shots += 1;
      next.possession = side === 'home' ? 'away' : 'home';
    } else if (action === 'big-chance') {
      summary = `${player.name} creates a big chance after a cutback`;
      box.shots += 1;
      next.advancedMetrics.bigChancesCreated += 1;
    } else if (action === 'progressive-pass') {
      summary = `${player.name} threads a progressive pass`;
      box.passes += 1;
      next.advancedMetrics.progressivePasses += 1;
    } else if (action === 'shot') {
      summary = `${player.name} takes a shot from distance`;
      box.shots += 1;
    } else if (action === 'corner') {
      summary = `${teamName} wins a corner kick`;
      if (side === 'home') next.context.cornersHome = Number(next.context.cornersHome ?? 0) + 1;
      else next.context.cornersAway = Number(next.context.cornersAway ?? 0) + 1;
    } else if (action === 'foul') {
      summary = `${player.name} commits a tactical foul`;
      next.possession = side === 'home' ? 'away' : 'home';
    } else if (action === 'tackle') {
      summary = `${player.name} wins the tackle in midfield`;
    } else if (action === 'substitution') {
      summary = `${teamName} makes a substitution`;
    } else {
      summary = `${player.name} recycles possession`;
      box.passes += 1;
    }

    applyScore(next, side, goals);
    player.stats.goals = (player.stats.goals ?? 0) + goals;
    player.stats.passes = (player.stats.passes ?? 0) + Number(action === 'pass' || action === 'progressive-pass');
    player.stats.shots = (player.stats.shots ?? 0) + Number(action === 'shot' || action === 'goal' || action === 'big-chance');
    player.stats.touches = (player.stats.touches ?? 0) + 1;

    updateMetrics(next, () => ctx.random());
    updateBoxTotals(next);
    const leaders = buildLeaders(next.players, 'mls');
    next.teamLeaders = leaders.teamLeaders;
    next.gameLeaders = leaders.gameLeaders;
    next.lastEvent = summary;
    next.lastPlay = { type: action, description: summary, player: player.name, team: side, goals };
    updateKeyStats(next);

    const event: SimulationEvent = {
      id: ctx.nextId(),
      summary,
      periodLabel: next.periodLabel,
      clockLabel: next.clockDisplay,
      scoreHome: next.scoreHome,
      scoreAway: next.scoreAway,
      eventType: action,
      team: teamName,
      player: player.name,
      payload: {
        stoppageTime: next.context.stoppageTime,
        cornersHome: next.context.cornersHome,
        cornersAway: next.context.cornersAway,
      },
    };

    return { game: next, event };
  },
};
