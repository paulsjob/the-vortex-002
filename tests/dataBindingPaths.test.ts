import { describe, expect, it } from 'vitest';
import {
  getMetricOptions,
  materializeFieldPath,
  parseBindingPathToSelection,
  type BindingFilterContext,
  type FieldDescriptor,
} from '../src/components/design/dataBindingPaths';

const sport = 'nba' as const;
const context = 'live' as const;

const playerDescriptor: FieldDescriptor = {
  id: 'nba:live:player:points',
  label: 'Points',
  pathTemplate: 'boxScore.{side}Players.{playerId}.points',
  level: 'player',
  group: 'Player Boxscore',
  sport,
  context,
  requires: { side: true, player: true },
};

const teamDescriptor: FieldDescriptor = {
  id: 'nba:live:team:points',
  label: 'Points',
  pathTemplate: 'boxScore.teamTotals.{side}.points',
  level: 'team',
  group: 'Team Totals',
  sport,
  context,
  requires: { side: true },
};

const gameDescriptor: FieldDescriptor = {
  id: 'nba:live:game:clock',
  label: 'Clock',
  pathTemplate: 'clock.display',
  level: 'game',
  group: 'Score/Clock',
  sport,
  context,
  requires: {},
};

describe('dataBindingPaths cascading filters', () => {
  it('materializes player paths safely for non-identifier keys', () => {
    const path = materializeFieldPath(playerDescriptor, { side: 'home', playerId: 'L. James' });
    expect(path).toBe('boxScore.homePlayers["L. James"].points');
  });

  it('filters player metrics to the selected player only', () => {
    const catalog = [playerDescriptor];
    const bindingContext: BindingFilterContext = {
      source: 'live',
      sport,
      level: 'player',
      side: 'home',
      playerId: 'L. James',
    };

    const options = getMetricOptions(catalog, 'player', '', { side: 'home', playerId: 'L. James' }, bindingContext);
    expect(options).toHaveLength(1);
    expect(options[0].path).toBe('boxScore.homePlayers["L. James"].points');
  });

  it('keeps game-level metrics free of team/player fields', () => {
    const bindingContext: BindingFilterContext = {
      source: 'live',
      sport,
      level: 'game',
    };
    const game = getMetricOptions([gameDescriptor], 'game', '', {}, bindingContext);
    expect(game).toHaveLength(1);

    const invalid = getMetricOptions([teamDescriptor], 'team', '', { side: 'home' }, { ...bindingContext, level: 'game' });
    expect(invalid).toHaveLength(0);
  });

  it('parses bracketed player keys without regex crashes', () => {
    const parsed = parseBindingPathToSelection([playerDescriptor], 'boxScore.homePlayers["A(B)+"].points');
    expect(parsed?.selections.side).toBe('home');
    expect(parsed?.selections.playerId).toBe('A(B)+');
  });
});
