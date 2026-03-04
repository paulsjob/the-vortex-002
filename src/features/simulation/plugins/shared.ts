import { formatClock } from '../core';
import type { GameState, GameLeaders, LeaderEntry, PlayerState, SportBoxScore, TeamLeaders } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const createPlayers = (names: string[], side: 'home' | 'away') => {
  const players: Record<string, PlayerState> = {};
  names.forEach((name, index) => {
    const id = `${side}-${index + 1}`;
    players[id] = {
      id,
      name,
      team: side,
      stats: {
        touches: 0,
        points: 0,
      },
    };
  });
  return players;
};

export const mergePlayers = (home: Record<string, PlayerState>, away: Record<string, PlayerState>) => ({
  ...home,
  ...away,
});

export const createEmptyBoxScore = (sport: GameState['sport'], players: Record<string, PlayerState>): SportBoxScore => {
  const homePlayers: Record<string, Record<string, number>> = {};
  const awayPlayers: Record<string, Record<string, number>> = {};

  Object.values(players).forEach((player) => {
    const bucket = player.team === 'home' ? homePlayers : awayPlayers;
    bucket[player.name] = {
      points: 0,
      attempts: 0,
      assists: 0,
      rebounds: 0,
      tackles: 0,
      shots: 0,
      passes: 0,
      saves: 0,
      rbi: 0,
      completions: 0,
      yards: 0,
      goals: 0,
    };
  });

  return {
    sport,
    homePlayers,
    awayPlayers,
    teamTotals: {
      home: { points: 0, possessions: 0, shots: 0, attempts: 0 },
      away: { points: 0, possessions: 0, shots: 0, attempts: 0 },
    },
  };
};

const highestBy = (players: Record<string, PlayerState>, key: string, side: 'home' | 'away'): LeaderEntry => {
  const candidates = Object.values(players).filter((player) => player.team === side);
  const sorted = [...candidates].sort((a, b) => (b.stats[key] ?? 0) - (a.stats[key] ?? 0));
  const top = sorted[0] ?? candidates[0];
  return {
    player: top?.name ?? 'N/A',
    team: side,
    value: Number(top?.stats[key] ?? 0),
  };
};

export const buildLeaders = (players: Record<string, PlayerState>, sport: GameState['sport']): { teamLeaders: TeamLeaders; gameLeaders: GameLeaders } => {
  const metricBySport: Record<GameState['sport'], string[]> = {
    mlb: ['rbi', 'points', 'touches'],
    nba: ['points', 'assists', 'rebounds'],
    nfl: ['yards', 'completions', 'tackles'],
    nhl: ['goals', 'shots', 'saves'],
    mls: ['goals', 'passes', 'shots'],
  };

  const metrics = metricBySport[sport];
  const teamLeaders: TeamLeaders = {
    home: {},
    away: {},
  };

  const gameLeaders: GameLeaders = {};

  metrics.forEach((metric) => {
    teamLeaders.home[metric] = highestBy(players, metric, 'home');
    teamLeaders.away[metric] = highestBy(players, metric, 'away');

    const topTwo = Object.values(players)
      .sort((a, b) => (b.stats[metric] ?? 0) - (a.stats[metric] ?? 0))
      .slice(0, 2)
      .map((player) => ({
        player: player.name,
        team: player.team,
        value: Number(player.stats[metric] ?? 0),
      }));
    gameLeaders[metric] = topTwo;
  });

  return { teamLeaders, gameLeaders };
};

export const advanceClock = (game: GameState, stepSeconds: number, maxPeriods: number, periodDuration: number) => {
  const next = structuredClone(game);
  next.clockSeconds = Math.max(0, next.clockSeconds - stepSeconds);

  if (next.clockSeconds === 0) {
    if (next.period >= maxPeriods) {
      next.status = 'final';
    } else {
      next.period += 1;
      next.clockSeconds = periodDuration;
    }
  }

  next.periodLabel = periodLabel(next.sport, next.period);
  next.clockDisplay = formatClock(next.clockSeconds);
  return next;
};

const periodLabel = (sport: GameState['sport'], period: number) => {
  if (sport === 'mlb') return period <= 9 ? `Inning ${period}` : `Inning ${period}`;
  if (sport === 'nfl') return `Q${period}`;
  if (sport === 'nba') return period <= 4 ? `Q${period}` : `OT${period - 4}`;
  if (sport === 'nhl') return period <= 3 ? `P${period}` : `OT${period - 3}`;
  return period <= 2 ? `Half ${period}` : `Extra ${period - 2}`;
};

export const applyScore = (game: GameState, side: 'home' | 'away', amount: number) => {
  if (amount <= 0) return;
  if (side === 'home') game.scoreHome += amount;
  else game.scoreAway += amount;
};

export const updateBoxTotals = (game: GameState) => {
  game.boxScore.teamTotals.home.points = game.scoreHome;
  game.boxScore.teamTotals.away.points = game.scoreAway;
};

export const clampMetric = (value: number, min: number, max: number, precision = 2) => Number(clamp(value, min, max).toFixed(precision));

export const randomWalk = (current: number, drift: number, min: number, max: number, precision = 2) => {
  return clampMetric(current + drift, min, max, precision);
};

export const updateKeyStats = (game: GameState) => {
  game.keyStats = [
    { label: 'Score Diff', value: game.scoreHome - game.scoreAway, emphasis: Math.abs(game.scoreHome - game.scoreAway) > 10 ? 'high' : 'med' },
    { label: 'Clock', value: game.clockDisplay },
    { label: 'Possession', value: game.possession ?? 'neutral' },
  ];
};
