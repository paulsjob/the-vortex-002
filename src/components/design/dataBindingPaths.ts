import { buildNormalizedPayload, buildTeamMetrics } from '../../features/simulation/derived';
import { simulatorRegistry } from '../../features/simulation/registry';
import type { SportBoxScore, SportKey } from '../../features/simulation/types';

export type BindingContext = 'live' | 'derived' | 'scorebug';
export type FieldLevel = 'game' | 'team' | 'player';
export type FieldGroup =
  | 'Score/Clock'
  | 'Possession/State'
  | 'Team Totals'
  | 'Leaders'
  | 'Advanced Metrics'
  | 'Player Boxscore';
export type FieldSide = 'home' | 'away';

export type FieldDescriptor = {
  id: string;
  label: string;
  pathTemplate: string;
  level: FieldLevel;
  group: FieldGroup;
  sport: SportKey;
  context: BindingContext;
  requires: { side?: boolean; team?: boolean; player?: boolean };
};

export type FieldCatalogSelection = {
  sport: SportKey;
  context: BindingContext;
};

export type PathSelections = {
  side?: FieldSide;
  playerId?: string;
};

export type MaterializedMetricOption = {
  descriptor: FieldDescriptor;
  path: string;
  label: string;
  group: FieldGroup;
};

export type PlayerOption = {
  id: string;
  label: string;
};

const GROUP_ORDER: FieldGroup[] = [
  'Score/Clock',
  'Possession/State',
  'Team Totals',
  'Leaders',
  'Advanced Metrics',
  'Player Boxscore',
];

const hasPrimitive = (value: unknown) => value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value);
const isIdentifier = (segment: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment);

const appendPath = (base: string, segment: string) => {
  if (!base) return isIdentifier(segment) ? segment : `[${JSON.stringify(segment)}]`;
  return isIdentifier(segment) ? `${base}.${segment}` : `${base}[${JSON.stringify(segment)}]`;
};

const extractBindingPaths = (value: unknown, path = ''): string[] => {
  if (Array.isArray(value)) return path ? [path] : [];
  if (hasPrimitive(value)) return path ? [path] : [];
  if (!value || typeof value !== 'object') return path ? [path] : [];

  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return path ? [path] : [];

  const paths = path ? [path] : [];
  entries.forEach(([key, next]) => {
    paths.push(...extractBindingPaths(next, appendPath(path, key)));
  });
  return paths;
};

const titleCase = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());

const toLabelFromPath = (path: string) => {
  const tail = path.split('.').pop() ?? path;
  return titleCase(tail.replace(/\{side\}/g, '').replace(/\{playerId\}/g, '').replace(/[\[\]"]+/g, ''));
};

const groupFromPath = (path: string): FieldGroup => {
  if (/(score|clock|period|inning|matchClock)/i.test(path)) return 'Score/Clock';
  if (/(possession|down|distance|yardLine|outs|strikes|balls|shotClock|strengthState|stoppage|half|playClock|bonus|redZone)/i.test(path)) return 'Possession/State';
  if (/teamTotals|teamMetrics|fouls|turnovers|shotsHome|shotsAway|corners|cards|saves|hits|timeouts/i.test(path)) return 'Team Totals';
  if (/leaders|Leader|gameLeaders|teamLeaders/i.test(path)) return 'Leaders';
  if (/advancedMetrics|xg|xwoba|epa|netRating|corsi|fenwick|ppda|usage|trueShooting|astToRatio|pace|rating/i.test(path)) return 'Advanced Metrics';
  if (/boxScore\.(homePlayers|awayPlayers)/.test(path)) return 'Player Boxscore';
  return 'Score/Clock';
};

const levelFromPath = (path: string): FieldLevel => {
  if (/boxScore\.(homePlayers|awayPlayers)|\{playerId\}|pitcher|batter|passerName|pointsLeader|assistsLeader|reboundsLeader|lastPlay\.(shooter|player|passer|rusher|target)/i.test(path)) return 'player';
  if (/home|away|team|teamTotals|teamMetrics|teamLeaders/i.test(path)) return 'team';
  return 'game';
};

const buildDescriptorsForPath = (sport: SportKey, context: BindingContext, path: string): FieldDescriptor[] => {
  if (/^boxScore\.homePlayers\./.test(path)) {
    const statKey = path.slice('boxScore.homePlayers.'.length);
    return [{
      id: `${sport}:${context}:player:${statKey}`,
      label: titleCase(statKey),
      pathTemplate: `boxScore.{side}Players.{playerId}.${statKey}`,
      level: 'player',
      group: 'Player Boxscore',
      sport,
      context,
      requires: { side: true, player: true },
    }];
  }

  if (/^boxScore\.awayPlayers\./.test(path)) return [];

  if (/^boxScore\.teamTotals\.home\./.test(path)) {
    const statKey = path.slice('boxScore.teamTotals.home.'.length);
    return [{
      id: `${sport}:${context}:teamtotals:${statKey}`,
      label: titleCase(statKey),
      pathTemplate: `boxScore.teamTotals.{side}.${statKey}`,
      level: 'team',
      group: 'Team Totals',
      sport,
      context,
      requires: { side: true },
    }];
  }

  if (/^boxScore\.teamTotals\.away\./.test(path)) return [];

  if (/^teamLeaders\.home\./.test(path)) {
    const tail = path.slice('teamLeaders.home.'.length);
    return [{
      id: `${sport}:${context}:leaders:${tail}`,
      label: `${titleCase(tail.split('.')[0] ?? tail)} ${titleCase(tail.split('.')[1] ?? '')}`.trim(),
      pathTemplate: `teamLeaders.{side}.${tail}`,
      level: 'team',
      group: 'Leaders',
      sport,
      context,
      requires: { side: true },
    }];
  }

  if (/^teamLeaders\.away\./.test(path)) return [];

  return [{
    id: `${sport}:${context}:${path}`,
    label: toLabelFromPath(path),
    pathTemplate: path,
    level: levelFromPath(path),
    group: groupFromPath(path),
    sport,
    context,
    requires: {},
  }];
};

const buildCatalogRegistry = () => {
  const byId = new Map<string, FieldDescriptor>();
  const contexts: BindingContext[] = ['live', 'derived', 'scorebug'];

  (Object.keys(simulatorRegistry) as SportKey[]).forEach((sport) => {
    const live = simulatorRegistry[sport].createInitialGame();
    const payloadByContext: Record<BindingContext, unknown> = {
      live,
      derived: { teamMetrics: buildTeamMetrics(live), advancedMetrics: live.advancedMetrics, consistencyIssues: live.consistencyIssues ?? [], sport: live.sport },
      scorebug: buildNormalizedPayload(live, 'live-scorebug'),
    };

    contexts.forEach((context) => {
      extractBindingPaths(payloadByContext[context]).forEach((path) => {
        buildDescriptorsForPath(sport, context, path).forEach((descriptor) => {
          if (!byId.has(descriptor.id)) byId.set(descriptor.id, descriptor);
        });
      });
    });
  });

  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
};

const catalogRegistry = buildCatalogRegistry();

export const getFieldCatalog = ({ sport, context }: FieldCatalogSelection): FieldDescriptor[] => (
  catalogRegistry.filter((entry) => entry.sport === sport && entry.context === context)
);

const PATH_TOKEN_REGEX = /\{([^}]+)\}/g;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const materializeFieldPath = (descriptor: FieldDescriptor, selections: PathSelections): string | null => {
  if (descriptor.requires.side && !selections.side) return null;
  if (descriptor.requires.player && !selections.playerId) return null;
  return descriptor.pathTemplate
    .replace(/\{side\}/g, selections.side ?? '')
    .replace(/\{team\}/g, selections.side ?? '')
    .replace(/\{playerId\}/g, selections.playerId ?? '');
};

export const parseBindingPathToSelection = (catalog: FieldDescriptor[], path: string): { descriptor: FieldDescriptor; selections: PathSelections } | null => {
  for (const descriptor of catalog) {
    const tokenNames: string[] = [];
    const pattern = `^${escapeRegex(descriptor.pathTemplate).replace(PATH_TOKEN_REGEX, (_, token: string) => {
      tokenNames.push(token);
      return '([^\\.]+)';
    })}$`;
    const match = path.match(new RegExp(pattern));
    if (!match) continue;

    const selections: PathSelections = {};
    tokenNames.forEach((token, index) => {
      const value = match[index + 1];
      if (token === 'side' || token === 'team') {
        if (value === 'home' || value === 'away') selections.side = value;
      }
      if (token === 'playerId') selections.playerId = value;
    });
    return { descriptor, selections };
  }
  return null;
};

const getBoxScorePlayers = (boxScore: SportBoxScore | undefined, side: FieldSide): PlayerOption[] => {
  const map = side === 'home' ? boxScore?.homePlayers : boxScore?.awayPlayers;
  if (!map) return [];
  return Object.keys(map).map((name) => ({ id: name, label: name })).sort((a, b) => a.label.localeCompare(b.label));
};

export const getPlayersForSide = (payload: unknown, side: FieldSide): PlayerOption[] => {
  if (!payload || typeof payload !== 'object') return [];
  const boxScore = (payload as { boxScore?: SportBoxScore }).boxScore;
  return getBoxScorePlayers(boxScore, side);
};

export const getMetricOptions = (catalog: FieldDescriptor[], level: FieldLevel, query: string, selections: PathSelections): MaterializedMetricOption[] => {
  const normalized = query.trim().toLowerCase();
  return catalog
    .filter((descriptor) => descriptor.level === level)
    .map((descriptor) => {
      const path = materializeFieldPath(descriptor, selections);
      if (!path) return null;
      const sidePrefix = descriptor.requires.side && selections.side ? `${selections.side === 'home' ? 'Home' : 'Away'} · ` : '';
      return {
        descriptor,
        path,
        label: `${sidePrefix}${descriptor.label}`,
        group: descriptor.group,
      };
    })
    .filter((entry): entry is MaterializedMetricOption => Boolean(entry))
    .filter((entry) => !normalized || `${entry.label} ${entry.path}`.toLowerCase().includes(normalized))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const groupMetricOptions = (options: MaterializedMetricOption[]) => (
  GROUP_ORDER
    .map((group) => ({ group, fields: options.filter((option) => option.group === group) }))
    .filter((entry) => entry.fields.length > 0)
);

const tokenizePath = (path: string): string[] => {
  const tokens: string[] = [];
  const regex = /([^.[\]]+)|\[(\d+|"[^"]+")\]/g;
  path.match(regex)?.forEach((part) => {
    if (part.startsWith('[')) {
      const inner = part.slice(1, -1);
      tokens.push(inner.startsWith('"') ? inner.slice(1, -1) : inner);
      return;
    }
    tokens.push(part);
  });
  return tokens;
};

export const resolvePathValue = (source: unknown, path: string): unknown => {
  if (!path) return source;
  return tokenizePath(path).reduce<unknown>((acc, token) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const index = Number(token);
      return Number.isNaN(index) ? undefined : acc[index];
    }
    if (typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[token];
  }, source);
};

export const formatPreviewValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
