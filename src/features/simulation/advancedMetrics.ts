import type { GameState, SportKey } from './types';

export const requiredAdvancedMetrics: Record<SportKey, readonly string[]> = {
  mlb: ['exitVelocity', 'launchAngle', 'barrelPct', 'whiffPct', 'chaseRate', 'spinRate', 'hardHitPct', 'xwOBA', 'zoneContactPct', 'sprintSpeed'],
  nfl: ['epa', 'successRate', 'cpoe', 'pressureRate', 'airYards', 'yardsAfterContact', 'adot', 'explosivePlayPct', 'defensiveStuffs', 'neutralPace'],
  nba: ['offensiveRating', 'defensiveRating', 'netRating', 'trueShootingPct', 'pace', 'assistRatio', 'reboundPct', 'usageRate', 'ppp', 'astToRatio'],
  nhl: ['xG', 'corsiForPct', 'fenwickForPct', 'pdo', 'highDangerChances', 'zoneStartsPct', 'takeaways', 'xGA', 'giveaways', 'slotShots'],
  mls: ['xG', 'xA', 'ppda', 'fieldTilt', 'progressivePasses', 'packing', 'ballRecoveries', 'pressures', 'shotEndingSequences', 'bigChancesCreated'],
};

export const getAdvancedMetricEntries = (game: GameState): Array<[string, number]> => {
  return Object.entries(game.advancedMetrics) as Array<[string, number]>;
};

export const validateAdvancedMetrics = (game: GameState): string[] => {
  const required = requiredAdvancedMetrics[game.sport];
  return required.filter((field) => (game.advancedMetrics as unknown as Record<string, unknown>)[field] == null);
};
