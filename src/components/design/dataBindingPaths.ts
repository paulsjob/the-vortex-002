import { buildNormalizedPayload, buildTeamMetrics } from '../../features/simulation/derived';
import { simulatorRegistry } from '../../features/simulation/registry';
import type { SportKey } from '../../features/simulation/types';

const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean']);

export type BindingContext = 'live' | 'derived' | 'scorebug';
export type FieldLevel = 'game' | 'team' | 'player';
export type FieldGroup = 'core' | 'pbp' | 'advanced' | 'state';

export type DataBindingFieldMetadata = {
  path: string;
  label: string;
  level: FieldLevel;
  group: FieldGroup;
  sports: SportKey[];
  contexts: BindingContext[];
};

export type GroupedFieldOptions = {
  level: FieldLevel;
  group: FieldGroup;
  label: string;
  fields: DataBindingFieldMetadata[];
};

const LEVEL_ORDER: FieldLevel[] = ['game', 'team', 'player'];
const GROUP_ORDER: FieldGroup[] = ['core', 'pbp', 'advanced', 'state'];

const LEVEL_LABEL: Record<FieldLevel, string> = { game: 'Game', team: 'Team', player: 'Player' };
const GROUP_LABEL: Record<FieldGroup, string> = { core: 'Core', pbp: 'Play-by-play', advanced: 'Advanced', state: 'Situation/State' };

const isIdentifier = (segment: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment);

const appendPath = (base: string, segment: string) => {
  if (!base) return isIdentifier(segment) ? segment : `[${JSON.stringify(segment)}]`;
  return isIdentifier(segment) ? `${base}.${segment}` : `${base}[${JSON.stringify(segment)}]`;
};

const shouldTreatAsLeaf = (value: unknown) => (
  value === null || value === undefined || PRIMITIVE_TYPES.has(typeof value)
);

const toLabel = (path: string) => {
  const tail = path.split('.').pop() ?? path;
  const normalized = tail.replace(/\[\d+\]/g, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').trim();
  if (!normalized) return path;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const classifyLevel = (path: string): FieldLevel => {
  if (/(player|batter|pitcher|shooter|passer|rusher|receiver|goalie|assister|target|leader|homePlayers|awayPlayers)/i.test(path)) return 'player';
  if (/(homeTeam|awayTeam|team|scoreHome|scoreAway|teamMetrics|teamLeaders|teamFouls|timeouts|home|away)/i.test(path)) return 'team';
  return 'game';
};

const classifyGroup = (path: string): FieldGroup => {
  if (/(lastPlay|lastPitch|lastEvent|playType|shotResult|shotType)/i.test(path)) return 'pbp';
  if (/(advancedMetrics|winProbability|pace|rating|xg|xwoba|epa|corsi|fenwick|ppda|barrel|usage|trueShooting|astToRatio)/i.test(path)) return 'advanced';
  if (/(clock|period|inning|half|down|distance|yardLine|outs|strikes|balls|possession|powerPlay|strengthState|stoppage|shotClock|redZone|bonus)/i.test(path)) return 'state';
  return 'core';
};

const SPORT_CONTEXT_OVERRIDES: Array<Partial<Pick<DataBindingFieldMetadata, 'label' | 'level' | 'group'>> & {
  path: string;
  sports?: SportKey[];
  contexts?: BindingContext[];
}> = [
  { path: 'homeTeam', label: 'Home Team', level: 'team', group: 'core' },
  { path: 'awayTeam', label: 'Away Team', level: 'team', group: 'core' },
  { path: 'scoreHome', label: 'Home Score', level: 'team', group: 'core', contexts: ['live'] },
  { path: 'scoreAway', label: 'Away Score', level: 'team', group: 'core', contexts: ['live'] },
  { path: 'periodLabel', label: 'Period Label', level: 'game', group: 'state', contexts: ['live'] },
  { path: 'clockSeconds', label: 'Clock Seconds', level: 'game', group: 'state', contexts: ['live'] },
  { path: 'lastEvent', label: 'Last Event', level: 'game', group: 'pbp', contexts: ['live', 'scorebug'] },
  { path: 'advancedMetrics.epa', label: 'EPA', level: 'game', group: 'advanced', sports: ['nfl'] },
  { path: 'advancedMetrics.netRating', label: 'Net Rating', level: 'game', group: 'advanced', sports: ['nba'] },
  { path: 'advancedMetrics.xG', label: 'Expected Goals', level: 'game', group: 'advanced', sports: ['nhl', 'mls'] },
  { path: 'advancedMetrics.exitVelocity', label: 'Exit Velocity', level: 'game', group: 'advanced', sports: ['mlb'] },
  { path: 'lastPlay.description', label: 'Last Play Description', level: 'game', group: 'pbp', contexts: ['live'] },
  { path: 'teamMetrics', label: 'Team Metrics', level: 'team', group: 'core', contexts: ['derived', 'scorebug'] },
  { path: 'teamLeaders.home', label: 'Home Team Leaders', level: 'team', group: 'core', contexts: ['live', 'scorebug'] },
  { path: 'teamLeaders.away', label: 'Away Team Leaders', level: 'team', group: 'core', contexts: ['live', 'scorebug'] },
  { path: 'pitcher', label: 'Pitcher', level: 'player', group: 'core', sports: ['mlb'], contexts: ['live'] },
  { path: 'batter', label: 'Batter', level: 'player', group: 'core', sports: ['mlb'], contexts: ['live'] },
  { path: 'pointsLeader', label: 'Points Leader', level: 'player', group: 'core', sports: ['nba'], contexts: ['live'] },
  { path: 'passerName', label: 'Passer', level: 'player', group: 'core', sports: ['nfl'], contexts: ['live'] },
  { path: 'lastPlay.shooter', label: 'Shooter', level: 'player', group: 'pbp', sports: ['nba', 'nhl'], contexts: ['live'] },
  { path: 'lastPlay.player', label: 'Player', level: 'player', group: 'pbp', sports: ['mls'], contexts: ['live'] },
];

const isOverrideMatch = (override: (typeof SPORT_CONTEXT_OVERRIDES)[number], sport: SportKey, context: BindingContext) => {
  const sportMatch = !override.sports || override.sports.includes(sport);
  const contextMatch = !override.contexts || override.contexts.includes(context);
  return sportMatch && contextMatch;
};

export const extractBindingPaths = (value: unknown, path = ''): string[] => {
  if (Array.isArray(value)) {
    if (!value.length) return path ? [path] : [];
    return path ? [path] : [];
  }

  if (shouldTreatAsLeaf(value)) {
    return path ? [path] : [];
  }

  if (!value || typeof value !== 'object') {
    return path ? [path] : [];
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) {
    return path ? [path] : [];
  }

  const paths = path ? [path] : [];
  entries.forEach(([key, nextValue]) => {
    paths.push(...extractBindingPaths(nextValue, appendPath(path, key)));
  });

  return paths;
};

export const buildFieldOptions = (value: unknown): string[] => {
  const deduped = new Set(extractBindingPaths(value));
  return [...deduped].sort((a, b) => a.localeCompare(b));
};

const buildRegistry = (): DataBindingFieldMetadata[] => {
  const byPath = new Map<string, { label: string; level: FieldLevel; group: FieldGroup; sports: Set<SportKey>; contexts: Set<BindingContext> }>();
  const contexts: BindingContext[] = ['live', 'derived', 'scorebug'];

  (Object.keys(simulatorRegistry) as SportKey[]).forEach((sport) => {
    const live = simulatorRegistry[sport].createInitialGame();
    const payloadByContext: Record<BindingContext, unknown> = {
      live,
      derived: {
        teamMetrics: buildTeamMetrics(live),
        advancedMetrics: live.advancedMetrics,
        consistencyIssues: live.consistencyIssues ?? [],
        sport: live.sport,
      },
      scorebug: buildNormalizedPayload(live, 'live-scorebug'),
    };

    contexts.forEach((context) => {
      const paths = extractBindingPaths(payloadByContext[context]);
      paths.forEach((path) => {
        const override = SPORT_CONTEXT_OVERRIDES.find((candidate) => candidate.path === path && isOverrideMatch(candidate, sport, context));
        const existing = byPath.get(path);
        if (!existing) {
          byPath.set(path, {
            label: override?.label ?? toLabel(path),
            level: override?.level ?? classifyLevel(path),
            group: override?.group ?? classifyGroup(path),
            sports: new Set([sport]),
            contexts: new Set([context]),
          });
          return;
        }

        existing.sports.add(sport);
        existing.contexts.add(context);
      });
    });
  });

  return [...byPath.entries()]
    .map(([path, value]) => ({
      path,
      label: value.label,
      level: value.level,
      group: value.group,
      sports: [...value.sports].sort(),
      contexts: [...value.contexts].sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
};

const registry = buildRegistry();

export const getDataBindingFieldRegistry = () => registry;

export const getFieldsForSportContext = (sport: SportKey, context: BindingContext, query = '') => {
  const normalized = query.trim().toLowerCase();
  return registry.filter((field) => {
    if (!field.sports.includes(sport) || !field.contexts.includes(context)) return false;
    if (!normalized) return true;
    return `${field.path} ${field.label}`.toLowerCase().includes(normalized);
  });
};

export const getGroupedFieldsForSportContext = (sport: SportKey, context: BindingContext, query = ''): GroupedFieldOptions[] => {
  const fields = getFieldsForSportContext(sport, context, query);
  return LEVEL_ORDER.flatMap((level) => GROUP_ORDER.map((group) => {
    const matches = fields
      .filter((field) => field.level === level && field.group === group)
      .sort((a, b) => a.label.localeCompare(b.label));
    if (!matches.length) return null;
    return {
      level,
      group,
      label: `${LEVEL_LABEL[level]} · ${GROUP_LABEL[group]}`,
      fields: matches,
    };
  }).filter(Boolean) as GroupedFieldOptions[]);
};

export const isFieldAvailableForSportContext = (path: string, sport: SportKey, context: BindingContext) => {
  const field = registry.find((entry) => entry.path === path);
  if (!field) return false;
  return field.sports.includes(sport) && field.contexts.includes(context);
};

export const getFieldBreadcrumb = (path: string, sport: SportKey, context: BindingContext) => {
  const field = registry.find((entry) => entry.path === path && entry.sports.includes(sport) && entry.contexts.includes(context));
  if (!field) return null;
  return `${LEVEL_LABEL[field.level]} › ${GROUP_LABEL[field.group]} › ${field.label}`;
};
