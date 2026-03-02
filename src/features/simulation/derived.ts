import { formatClock } from './core';
import type { GameState, NormalizedSimulationPayload, TeamMetricEntry } from './types';

const pct = (made: number, att: number, digits = 1) => `${att > 0 ? ((made / att) * 100).toFixed(digits) : '0.0'}%`;

const asNum = (v: unknown) => Number(v ?? 0);

export const buildTeamMetrics = (game: GameState): TeamMetricEntry[] => {
  const h = game.boxScore?.teamTotals.home ?? {};
  const a = game.boxScore?.teamTotals.away ?? {};

  if (game.sport === 'mlb') {
    const hOps = asNum(h.obp) + asNum(h.slg);
    const aOps = asNum(a.obp) + asNum(a.slg);
    return [
      { label: 'Runs', home: game.scoreHome, away: game.scoreAway },
      { label: 'Hits', home: asNum(h.h), away: asNum(a.h) },
      { label: 'Team OPS', home: hOps.toFixed(3), away: aOps.toFixed(3) },
      { label: 'HR', home: asNum(h.hr), away: asNum(a.hr) },
      { label: 'BA w/ RISP', home: pct(asNum(h.rispH), asNum(h.rispAB), 3), away: pct(asNum(a.rispH), asNum(a.rispAB), 3) },
      { label: 'BB', home: asNum(h.bb), away: asNum(a.bb) },
      { label: 'K', home: asNum(h.k), away: asNum(a.k) },
      { label: 'LOB', home: asNum(h.lob), away: asNum(a.lob) },
      { label: 'Team ERA', home: asNum(h.era).toFixed(2), away: asNum(a.era).toFixed(2) },
      { label: 'Errors', home: asNum(h.err), away: asNum(a.err) },
    ];
  }

  if (game.sport === 'nfl') {
    const hy = asNum(h.passYds) + asNum(h.rushYds);
    const ay = asNum(a.passYds) + asNum(a.rushYds);
    const hPlays = asNum(h.rushAtt) + asNum(h.passAtt);
    const aPlays = asNum(a.rushAtt) + asNum(a.passAtt);
    return [
      { label: 'Total Yards', home: hy, away: ay },
      { label: 'Turnover Margin', home: asNum(a.turnovers) - asNum(h.turnovers), away: asNum(h.turnovers) - asNum(a.turnovers) },
      { label: '3rd Down %', home: pct(asNum(h.thirdConv), asNum(h.thirdAtt)), away: pct(asNum(a.thirdConv), asNum(a.thirdAtt)) },
      { label: 'Red Zone TD %', home: pct(asNum(h.rzTd), asNum(h.rzAtt)), away: pct(asNum(a.rzTd), asNum(a.rzAtt)) },
      { label: 'Time of Possession', home: `${Math.round(asNum(h.topSec) / 60)}:${String(Math.round(asNum(h.topSec) % 60)).padStart(2, '0')}`, away: `${Math.round(asNum(a.topSec) / 60)}:${String(Math.round(asNum(a.topSec) % 60)).padStart(2, '0')}` },
      { label: 'Yards/Play', home: (hy / Math.max(hPlays, 1)).toFixed(1), away: (ay / Math.max(aPlays, 1)).toFixed(1) },
      { label: 'Rushing Yards', home: asNum(h.rushYds), away: asNum(a.rushYds) },
      { label: 'Passing Yards', home: asNum(h.passYds), away: asNum(a.passYds) },
      { label: 'Sacks Allowed', home: asNum(h.sacksAllowed), away: asNum(a.sacksAllowed) },
      { label: 'Penalty Yards', home: asNum(h.penYds), away: asNum(a.penYds) },
    ];
  }

  if (game.sport === 'nba') {
    return [
      { label: 'Points', home: game.scoreHome, away: game.scoreAway },
      { label: 'eFG%', home: pct(asNum(h.fgm) + 0.5 * asNum(h.tpm), asNum(h.fga)), away: pct(asNum(a.fgm) + 0.5 * asNum(a.tpm), asNum(a.fga)) },
      { label: 'Rebounds', home: asNum(h.reb), away: asNum(a.reb) },
      { label: 'Assists', home: asNum(h.ast), away: asNum(a.ast) },
      { label: 'Turnovers', home: asNum(h.turnovers), away: asNum(a.turnovers) },
      { label: '3P%', home: pct(asNum(h.tpm), asNum(h.tpa)), away: pct(asNum(a.tpm), asNum(a.tpa)) },
      { label: 'Free Throw Rate', home: (asNum(h.fta) / Math.max(asNum(h.fga), 1)).toFixed(2), away: (asNum(a.fta) / Math.max(asNum(a.fga), 1)).toFixed(2) },
      { label: 'Steals', home: asNum(h.stl), away: asNum(a.stl) },
      { label: 'Blocks', home: asNum(h.blk), away: asNum(a.blk) },
      { label: 'Points in Paint', home: asNum(h.paintPts), away: asNum(a.paintPts) },
    ];
  }

  if (game.sport === 'nhl') {
    return [
      { label: 'Goals', home: game.scoreHome, away: game.scoreAway },
      { label: 'SOG', home: asNum(h.sog), away: asNum(a.sog) },
      { label: 'Power Play %', home: pct(asNum(h.ppGoals), asNum(h.ppOpps)), away: pct(asNum(a.ppGoals), asNum(a.ppOpps)) },
      { label: 'Penalty Kill %', home: pct(asNum(h.pkKills), asNum(h.pkOpps)), away: pct(asNum(a.pkKills), asNum(a.pkOpps)) },
      { label: 'Faceoff Win %', home: `${asNum(h.foPct).toFixed(1)}%`, away: `${asNum(a.foPct).toFixed(1)}%` },
      { label: 'Blocked Shots', home: asNum(h.blocks), away: asNum(a.blocks) },
      { label: 'Hits', home: asNum(h.hits), away: asNum(a.hits) },
      { label: 'High-Danger Chances', home: asNum(h.hdc), away: asNum(a.hdc) },
      { label: 'Giveaways', home: asNum(h.giveaways), away: asNum(a.giveaways) },
      { label: 'Corsi For %', home: `${asNum(h.corsiPct).toFixed(1)}%`, away: `${asNum(a.corsiPct).toFixed(1)}%` },
    ];
  }

  return [
    { label: 'Goals', home: game.scoreHome, away: game.scoreAway },
    { label: 'xG', home: asNum(h.xg).toFixed(2), away: asNum(a.xg).toFixed(2) },
    { label: 'Possession %', home: `${asNum(h.possPct).toFixed(1)}%`, away: `${asNum(a.possPct).toFixed(1)}%` },
    { label: 'Shots on Target', home: asNum(h.shotsOnTarget), away: asNum(a.shotsOnTarget) },
    { label: 'Pass %', home: pct(asNum(h.passComp), asNum(h.passAtt)), away: pct(asNum(a.passComp), asNum(a.passAtt)) },
    { label: 'Corners', home: asNum(h.corners), away: asNum(a.corners) },
    { label: 'Final Third Entries', home: asNum(h.finalThirdEntries), away: asNum(a.finalThirdEntries) },
    { label: 'Interceptions', home: asNum(h.interceptions), away: asNum(a.interceptions) },
    { label: 'Big Chances Created', home: asNum(h.bigCreated), away: asNum(a.bigCreated) },
    { label: 'Total Distance Covered', home: asNum(h.distanceCovered).toFixed(1), away: asNum(a.distanceCovered).toFixed(1) },
  ];
};

export const buildNormalizedPayload = (game: GameState, gameId = 'demo-001'): NormalizedSimulationPayload => {
  const base = {
    sport: game.sport,
    gameId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    score: { home: game.scoreHome, away: game.scoreAway },
    period: game.periodLabel,
    clock: formatClock(game.clockSeconds),
    possession: game.possession,
    lastEvent: game.lastEvent,
    updatedAt: new Date().toISOString(),
    keyStats: game.keyStats,
    boxScore: game.boxScore,
    teamLeaders: game.teamLeaders,
    gameLeaders: game.gameLeaders,
    teamMetrics: buildTeamMetrics(game),
    consistencyIssues: game.consistencyIssues,
  };

  if (game.sport === 'mlb') return { ...base, sport: 'mlb', mlb: { inning: game.inning, half: game.half, balls: game.balls, strikes: game.strikes, outs: game.outs, pitcher: game.pitcher, batter: game.batter, lastPitch: game.lastPitch, lastPlay: game.lastPlay } };
  if (game.sport === 'nba') return { ...base, sport: 'nba', nba: { shotClock: game.shotClock, teamFoulsHome: game.teamFoulsHome, teamFoulsAway: game.teamFoulsAway, run: game.run, lastPlay: game.lastPlay } };
  if (game.sport === 'nfl') return { ...base, sport: 'nfl', nfl: { down: game.down, distance: game.distance, yardLine: game.yardLine, playType: game.playType, lastPlay: game.lastPlay } };
  if (game.sport === 'nhl') return { ...base, sport: 'nhl', nhl: { strengthState: game.strengthState, ppTimeRemaining: game.ppTimeRemaining, pulledGoalie: game.pulledGoalie, lastPlay: game.lastPlay } };
  return { ...base, sport: 'mls', mls: { matchClock: game.matchClock, stoppageTime: game.stoppageTime, possessionPctHome: game.possessionPctHome, lastPlay: game.lastPlay } };
};
