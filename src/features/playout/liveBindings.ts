import type { Layer } from '../../types/domain';
import type { GameState } from '../../store/useDataEngineStore';

export const resolveBindingValue = (game: GameState, field: string): string => {
  const mlb = game.sport === 'mlb' ? game : null;
  const map: Record<string, string> = {
    'score.home': String(game.scoreHome),
    'score.away': String(game.scoreAway),
    'inning.number': String(mlb?.inning ?? '-'),
    'inning.state': mlb?.half ?? '-',
    'count.balls': String(mlb?.balls ?? '-'),
    'count.strikes': String(mlb?.strikes ?? '-'),
    'count.outs': String(mlb?.outs ?? '-'),
    'runners.first': mlb ? (mlb.onFirst ? 'On' : 'Off') : '-',
    'runners.second': mlb ? (mlb.onSecond ? 'On' : 'Off') : '-',
    'runners.third': mlb ? (mlb.onThird ? 'On' : 'Off') : '-',
    'pitch.type': mlb?.lastPitch.pitchType ?? '-',
    'pitch.velocity': String(mlb?.lastPitch.velocityMph ?? '-'),
    'pitch.location': mlb?.lastPitch.location ?? '-',
    'bat.batspeed': String(mlb?.lastPitch.batSpeedMph ?? '-'),
    'bat.exitvelo': String(mlb?.lastPitch.exitVelocityMph ?? '-'),
    'bat.launchangle': String(mlb?.lastPitch.launchAngleDeg ?? '-'),
    'bat.distance': String(mlb?.lastPitch.projectedDistanceFt ?? '-'),
    'matchup.pitcher': mlb?.pitcher ?? '-',
    'matchup.batter': mlb?.batter ?? '-',
  };
  return map[field] ?? '';
};

export const getLiveTextContent = (layer: Extract<Layer, { kind: 'text' }>, game: GameState): string => {
  if (layer.dataBindingSource === 'manual') return layer.text;
  return resolveBindingValue(game, layer.dataBindingField) || layer.text;
};
