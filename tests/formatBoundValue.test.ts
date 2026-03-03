import { describe, expect, it } from 'vitest';
import { formatBoundValue } from '../src/features/dataBinding/formatBoundValue';

describe('formatBoundValue', () => {
  it('formats percentages and clock-like seconds', () => {
    expect(formatBoundValue(0.456, { selectedMetricKey: 'trueShootingPct' })).toBe('45.6%');
    expect(formatBoundValue(125, { selectedMetricKey: 'clockSeconds' })).toBe('2:05');
  });

  it('narrows player arrays to selected player and leader fallback', () => {
    const list = [
      { player: 'L. James', value: 16 },
      { player: 'A. Davis', value: 12 },
    ];
    expect(formatBoundValue(list, { selectedPlayerId: 'L. James', selectedMetricKey: 'points' })).toBe('16');
    expect(formatBoundValue(list, { selectedMetricKey: 'points' })).toBe('L. James 16');
  });

  it('suppresses raw objects/arrays that are not displayable', () => {
    expect(formatBoundValue({ nested: true }, {})).toBe('');
    expect(formatBoundValue([{ id: 1 }, { id: 2 }], {})).toBe('');
  });
});
