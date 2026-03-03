import { describe, expect, it } from 'vitest';

import { getFieldCatalog, materializeFieldPath, parseBindingPathToSelection, type FieldDescriptor } from '../src/components/design/dataBindingPaths';
import type { BindingContext } from '../src/components/design/dataBindingPaths';
import { simulatorRegistry } from '../src/features/simulation/registry';
import type { SportKey } from '../src/features/simulation/types';

const baseDescriptor = (pathTemplate: string): FieldDescriptor => ({
  id: `test:${pathTemplate}`,
  label: 'Test',
  pathTemplate,
  level: 'team',
  group: 'Team Totals',
  sport: 'nba',
  context: 'live',
  requires: {},
});

describe('parseBindingPathToSelection', () => {
  it('supports explicit choice groups for teamTotals without throwing', () => {
    const catalog = [baseDescriptor('boxScore.teamTotals.(home|away).ast')];
    expect(() => parseBindingPathToSelection(catalog, 'boxScore.teamTotals.home.ast')).not.toThrow();
    expect(() => parseBindingPathToSelection(catalog, 'boxScore.teamTotals.away.ast')).not.toThrow();

    expect(parseBindingPathToSelection(catalog, 'boxScore.teamTotals.home.ast')?.descriptor.pathTemplate).toBe('boxScore.teamTotals.(home|away).ast');
    expect(parseBindingPathToSelection(catalog, 'boxScore.teamTotals.away.ast')?.descriptor.pathTemplate).toBe('boxScore.teamTotals.(home|away).ast');
  });

  it('treats malformed groups as literals so invalid regex is never emitted', () => {
    const catalog = [baseDescriptor('boxScore.teamTotals.(home|away.ast')];
    expect(() => parseBindingPathToSelection(catalog, 'boxScore.teamTotals.home.ast')).not.toThrow();
    expect(parseBindingPathToSelection(catalog, 'boxScore.teamTotals.home.ast')).toBeNull();
  });

  it('parses player indexed homePlayers and captures playerId selection', () => {
    const catalog = [baseDescriptor('boxScore.homePlayers.{playerId}.ast')];
    const result = parseBindingPathToSelection(catalog, 'boxScore.homePlayers.jdoe.ast');
    expect(result?.selections.playerId).toBe('jdoe');
  });

  it('parses player indexed awayPlayers and captures playerId selection', () => {
    const catalog = [baseDescriptor('boxScore.awayPlayers.{playerId}.reb')];
    const result = parseBindingPathToSelection(catalog, 'boxScore.awayPlayers.player-1.reb');
    expect(result?.selections.playerId).toBe('player-1');
  });

  it('matches paths with bracket and quote syntax safely', () => {
    const catalog = [baseDescriptor('meta["split(home)"]')];
    const result = parseBindingPathToSelection(catalog, 'meta["split(home)"]');
    expect(result?.descriptor.pathTemplate).toBe('meta["split(home)"]');
  });

  it('does not throw for any materialized catalog field used by the Design dropdown', () => {
    const sports = Object.keys(simulatorRegistry) as SportKey[];
    const contexts: BindingContext[] = ['live', 'derived', 'scorebug'];

    sports.forEach((sport) => {
      contexts.forEach((context) => {
        const catalog = getFieldCatalog({ sport, context });
        catalog.forEach((descriptor) => {
          const path = materializeFieldPath(descriptor, { side: 'home', playerId: 'sample-player' });
          if (!path) return;
          expect(() => parseBindingPathToSelection(catalog, path)).not.toThrow();
        });
      });
    });
  });
});
