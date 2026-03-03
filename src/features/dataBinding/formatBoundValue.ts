import type { BindingContext, FieldLevel, FieldSide } from '../../components/design/dataBindingPaths';
import type { SportKey } from '../simulation/types';

export type BoundValueContext = {
  sport?: SportKey;
  source?: BindingContext;
  level?: FieldLevel;
  scope?: FieldSide;
  selectedPlayerId?: string;
  selectedPlayerName?: string;
  selectedTeamScope?: FieldSide;
  selectedMetricKey?: string;
  selectedMetricPath?: string;
};

const toDisplayNumber = (value: number, keyHint: string) => {
  if (!Number.isFinite(value)) return '';
  const lower = keyHint.toLowerCase();
  const isPercentHint = /pct|percent|%|rate/.test(lower);
  if (isPercentHint) {
    const normalized = Math.abs(value) <= 1 ? value * 100 : value;
    return `${normalized.toFixed(1)}%`;
  }
  if (/clockseconds|clock|time/.test(lower) && Number.isInteger(value) && value >= 0 && value < 3600) {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
};

const formatPlayerList = (items: unknown[], context: BoundValueContext): string => {
  if (!items.length) return '';
  const mapped = items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const player = String(record.player ?? record.name ?? record.playerName ?? '').trim();
      const value = record.value ?? record.stat ?? record.points ?? record.total;
      return player && (typeof value === 'string' || typeof value === 'number') ? { player, value } : null;
    })
    .filter((entry): entry is { player: string; value: string | number } => Boolean(entry));

  if (!mapped.length) return '';
  const selected = context.selectedPlayerName || context.selectedPlayerId;
  if (selected) {
    const match = mapped.find((entry) => entry.player === selected || entry.player.toLowerCase().includes(selected.toLowerCase()));
    if (match) return typeof match.value === 'number' ? toDisplayNumber(match.value, context.selectedMetricKey ?? '') : String(match.value);
  }

  const top = mapped[0];
  const value = typeof top.value === 'number' ? toDisplayNumber(top.value, context.selectedMetricKey ?? '') : String(top.value);
  return `${top.player} ${value}`.trim();
};

export const formatBoundValue = (value: unknown, context: BoundValueContext): string => {
  try {
    if (value === null || value === undefined) return '';
    const keyHint = `${context.selectedMetricKey ?? ''} ${context.selectedMetricPath ?? ''}`;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return toDisplayNumber(value, keyHint);
    if (typeof value === 'boolean') return value ? 'true' : 'false';

    if (Array.isArray(value)) {
      return formatPlayerList(value, context);
    }

    return '';
  } catch {
    return '';
  }
};
