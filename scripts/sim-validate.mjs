import { readFileSync } from 'node:fs';

const required = {
  mlb: ['exitVelocity', 'launchAngle', 'barrelPct', 'whiffPct', 'chaseRate', 'spinRate', 'hardHitPct', 'xwOBA', 'zoneContactPct', 'sprintSpeed'],
  nfl: ['epa', 'successRate', 'cpoe', 'pressureRate', 'airYards', 'yardsAfterContact', 'adot', 'explosivePlayPct', 'defensiveStuffs', 'neutralPace'],
  nba: ['offensiveRating', 'defensiveRating', 'netRating', 'trueShootingPct', 'pace', 'assistRatio', 'reboundPct', 'usageRate', 'ppp', 'astToRatio'],
  nhl: ['xG', 'corsiForPct', 'fenwickForPct', 'pdo', 'highDangerChances', 'zoneStartsPct', 'takeaways', 'xGA', 'giveaways', 'slotShots'],
  mls: ['xG', 'xA', 'ppda', 'fieldTilt', 'progressivePasses', 'packing', 'ballRecoveries', 'pressures', 'shotEndingSequences', 'bigChancesCreated'],
};

const pluginFiles = {
  mlb: 'src/features/simulation/plugins/mlb.ts',
  nfl: 'src/features/simulation/plugins/nfl.ts',
  nba: 'src/features/simulation/plugins/nba.ts',
  nhl: 'src/features/simulation/plugins/nhl.ts',
  mls: 'src/features/simulation/plugins/mls.ts',
};

const derived = readFileSync('src/features/simulation/derived.ts', 'utf8');
const failures = [];

for (const [sport, fields] of Object.entries(required)) {
  const plugin = readFileSync(pluginFiles[sport], 'utf8');
  for (const field of fields) {
    if (!plugin.includes(field)) failures.push(`${sport}: ${field} missing in plugin state`);
  }
  if (!derived.includes(`sport: '${sport}', advancedMetrics: game.advancedMetrics`)) {
    failures.push(`${sport}: normalized payload missing advancedMetrics`);
  }
}

if (failures.length > 0) {
  console.error('Simulation advanced metrics validation failed:\n' + failures.join('\n'));
  process.exit(1);
}

console.log('Simulation advanced metrics validation passed for all sports.');
