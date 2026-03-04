import { mlbSimulator } from './plugins/mlb';
import { mlsSimulator } from './plugins/mls';
import { nbaSimulator } from './plugins/nba';
import { nflSimulator } from './plugins/nfl';
import { nhlSimulator } from './plugins/nhl';
import type { SimulatorPlugin, SportKey } from './types';

export const simulatorRegistry: Record<SportKey, SimulatorPlugin> = {
  mlb: mlbSimulator,
  nba: nbaSimulator,
  nfl: nflSimulator,
  nhl: nhlSimulator,
  mls: mlsSimulator,
};

export const simulatorOptions = (Object.keys(simulatorRegistry) as SportKey[]).map((key) => ({
  key,
  label: simulatorRegistry[key].label,
}));
