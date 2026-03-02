import type { GameLeaders, LeaderEntry, SportBoxScore, SportKey, TeamLeaders } from './types';

const sortLeaders = (entries: LeaderEntry[]) => [...entries].sort((a, b) => b.value - a.value || a.player.localeCompare(b.player));

export const initializeBoxScore = (sport: SportKey, homePlayers: string[], awayPlayers: string[], tracked: string[]): SportBoxScore => {
  const create = (players: string[]) =>
    Object.fromEntries(players.map((p) => [p, Object.fromEntries(tracked.map((s) => [s, 0]))]));
  return {
    sport,
    homePlayers: create(homePlayers),
    awayPlayers: create(awayPlayers),
    teamTotals: {
      home: Object.fromEntries(tracked.map((s) => [s, 0])),
      away: Object.fromEntries(tracked.map((s) => [s, 0])),
    },
    meta: {},
  };
};

export const bumpPlayerStat = (box: SportBoxScore, team: 'home' | 'away', player: string, stat: string, by = 1) => {
  const players = team === 'home' ? box.homePlayers : box.awayPlayers;
  if (!players[player]) players[player] = {};
  players[player][stat] = (players[player][stat] ?? 0) + by;
};

export const setMeta = (box: SportBoxScore, key: string, value: number | string | boolean) => {
  if (!box.meta) box.meta = {};
  box.meta[key] = value;
};

export const sumTeamTotals = (box: SportBoxScore) => {
  const sum = (players: Record<string, Record<string, number>>) => {
    const totals: Record<string, number> = {};
    Object.values(players).forEach((stats) => {
      Object.entries(stats).forEach(([k, v]) => {
        totals[k] = (totals[k] ?? 0) + v;
      });
    });
    return totals;
  };
  box.teamTotals.home = sum(box.homePlayers);
  box.teamTotals.away = sum(box.awayPlayers);
};

const topForTeam = (players: Record<string, Record<string, number>>, stat: string, team: 'home' | 'away'): LeaderEntry => {
  let best: LeaderEntry = { player: 'N/A', team, value: 0 };
  Object.entries(players).forEach(([player, stats]) => {
    const value = stats[stat] ?? 0;
    if (value > best.value) best = { player, team, value };
  });
  return best;
};

export const computeLeaders = (box: SportBoxScore, categories: string[]): { teamLeaders: TeamLeaders; gameLeaders: GameLeaders } => {
  const home: Record<string, LeaderEntry> = {};
  const away: Record<string, LeaderEntry> = {};
  const gameLeaders: GameLeaders = {};

  categories.forEach((c) => {
    home[c] = topForTeam(box.homePlayers, c, 'home');
    away[c] = topForTeam(box.awayPlayers, c, 'away');
    const entries: LeaderEntry[] = [];
    Object.entries(box.homePlayers).forEach(([player, stats]) => entries.push({ player, team: 'home', value: stats[c] ?? 0 }));
    Object.entries(box.awayPlayers).forEach(([player, stats]) => entries.push({ player, team: 'away', value: stats[c] ?? 0 }));
    gameLeaders[c] = sortLeaders(entries).slice(0, 3);
  });

  return { teamLeaders: { home, away }, gameLeaders };
};

export const validateConsistency = (sport: SportKey, box: SportBoxScore, scoreHome: number, scoreAway: number, extras: Record<string, number> = {}) => {
  const issues: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) issues.push(message);
  };

  if (sport === 'mlb') {
    check((box.teamTotals.home.h ?? 0) >= (box.teamTotals.home.hr ?? 0), 'H_LT_HR_HOME');
    check((box.teamTotals.away.h ?? 0) >= (box.teamTotals.away.hr ?? 0), 'H_LT_HR_AWAY');
  } else if (sport === 'nba') {
    check((box.teamTotals.home.pts ?? 0) === scoreHome, 'SCORE_HOME_MISMATCH');
    check((box.teamTotals.away.pts ?? 0) === scoreAway, 'SCORE_AWAY_MISMATCH');
    check((box.teamTotals.home.fgm ?? 0) <= (box.teamTotals.home.fga ?? 0), 'FGM_GT_FGA_HOME');
    check((box.teamTotals.away.fgm ?? 0) <= (box.teamTotals.away.fga ?? 0), 'FGM_GT_FGA_AWAY');
  } else if (sport === 'nfl') {
    check((box.teamTotals.home.passComp ?? 0) <= (box.teamTotals.home.passAtt ?? 0), 'COMP_GT_ATT_HOME');
    check((box.teamTotals.away.passComp ?? 0) <= (box.teamTotals.away.passAtt ?? 0), 'COMP_GT_ATT_AWAY');
  } else if (sport === 'nhl') {
    check((box.teamTotals.home.goals ?? 0) === scoreHome, 'GOALS_HOME_MISMATCH');
    check((box.teamTotals.away.goals ?? 0) === scoreAway, 'GOALS_AWAY_MISMATCH');
    check((box.teamTotals.home.goals ?? 0) <= (box.teamTotals.home.sog ?? 0), 'GOALS_GT_SOG_HOME');
    check((box.teamTotals.away.goals ?? 0) <= (box.teamTotals.away.sog ?? 0), 'GOALS_GT_SOG_AWAY');
  } else if (sport === 'mls') {
    check((box.teamTotals.home.goals ?? 0) === scoreHome, 'GOALS_HOME_MISMATCH');
    check((box.teamTotals.away.goals ?? 0) === scoreAway, 'GOALS_AWAY_MISMATCH');
    check((box.teamTotals.home.shotsOnTarget ?? 0) <= (box.teamTotals.home.shots ?? 0), 'SOT_GT_SHOTS_HOME');
    check((box.teamTotals.away.shotsOnTarget ?? 0) <= (box.teamTotals.away.shots ?? 0), 'SOT_GT_SHOTS_AWAY');
  }

  Object.values(extras).forEach((v) => check(v >= 0, 'NEGATIVE_DERIVED'));

  return { ok: issues.length === 0, issues };
};
