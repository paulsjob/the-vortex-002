import { buildNormalizedPayload, buildTeamMetrics } from '../../features/simulation/derived';
import { formatBoundValue } from '../../features/dataBinding/formatBoundValue';
import { simulatorRegistry } from '../../features/simulation/registry';
import type { SportBoxScore, SportKey } from '../../features/simulation/types';
import type { TextLayer } from '../../types/domain';

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
  getValue?: (payload: unknown, selections: PathSelections) => unknown;
  format?: (value: unknown, context: BindingFilterContext & PathSelections) => string;
  displayableForText?: boolean;
};

export type FieldCatalogSelection = {
  sport: SportKey;
  context: BindingContext;
};

export type PathSelections = {
  side?: FieldSide;
  playerId?: string;
};

export type BindingFilterContext = {
  source: BindingContext;
  sport: SportKey;
  level: FieldLevel;
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

const toLabelFromPath = (path: string) => {
  const tokens = tokenizePath(path).map((token) => token.replace(/\{side\}|\{playerId\}/g, '').replace(/[\[\]"]+/g, '')).filter(Boolean);
  const tail = tokens.length ? tokens[tokens.length - 1] : path;
  const parent = tokens.length > 1 ? tokens[tokens.length - 2] : undefined;
  if (parent && /^(home|away)$/i.test(tail) && /(score|goals?|runs?|clock|shots?|hits?|errors?|cards?|corners?|fouls?|timeouts?)/i.test(parent)) {
    return `${titleCase(parent)} ${titleCase(tail)}`;
  }
  return titleCase(tail);
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
  const tokens = tokenizePath(path);

  if (tokens[0] === 'boxScore' && tokens[1] === 'homePlayers' && tokens.length > 3) {
    const statKey = tokens.slice(3).reduce((acc, token) => appendPath(acc, token), '');
    return [{
      id: `${sport}:${context}:player:${statKey}`,
      label: titleCase(statKey),
      pathTemplate: `boxScore.{side}Players.{playerId}.${statKey}`,
      level: 'player',
      group: 'Player Boxscore',
      sport,
      context,
      requires: { side: true, player: true },
      displayableForText: true,
      getValue: (payload, selections) => resolvePathValue(payload, `boxScore.${selections.side ?? 'home'}Players.${isIdentifier(selections.playerId ?? '') ? selections.playerId : `[${JSON.stringify(selections.playerId ?? '')}]`}.${statKey}`),
    }];
  }

  if (tokens[0] === 'boxScore' && tokens[1] === 'awayPlayers') return [];

  if (tokens[0] === 'boxScore' && tokens[1] === 'teamTotals' && tokens[2] === 'home' && tokens.length > 3) {
    const statKey = tokens.slice(3).reduce((acc, token) => appendPath(acc, token), '');
    return [{
      id: `${sport}:${context}:teamtotals:${statKey}`,
      label: titleCase(statKey),
      pathTemplate: `boxScore.teamTotals.{side}.${statKey}`,
      level: 'team',
      group: 'Team Totals',
      sport,
      context,
      requires: { side: true },
      displayableForText: true,
      getValue: (payload, selections) => resolvePathValue(payload, `boxScore.teamTotals.${selections.side ?? 'home'}.${statKey}`),
    }];
  }

  if (tokens[0] === 'boxScore' && tokens[1] === 'teamTotals' && tokens[2] === 'away') return [];

  if (tokens[0] === 'teamLeaders' && tokens[1] === 'home' && tokens.length > 2) {
    const tail = tokens.slice(2).reduce((acc, token) => appendPath(acc, token), '');
    return [{
      id: `${sport}:${context}:leaders:${tail}`,
      label: `${titleCase(tokens[2] ?? tail)} ${titleCase(tokens[3] ?? '')}`.trim(),
      pathTemplate: `teamLeaders.{side}.${tail}`,
      level: 'team',
      group: 'Leaders',
      sport,
      context,
      requires: { side: true },
      displayableForText: false,
      getValue: (payload, selections) => resolvePathValue(payload, `teamLeaders.${selections.side ?? 'home'}.${tail}`),
    }];
  }

  if (tokens[0] === 'teamLeaders' && tokens[1] === 'away') return [];

  return [{
    id: `${sport}:${context}:${path}`,
    label: toLabelFromPath(path),
    pathTemplate: path,
    level: levelFromPath(path),
    group: groupFromPath(path),
    sport,
    context,
    requires: {},
    displayableForText: false,
    getValue: (payload) => resolvePathValue(payload, path),
  }];
};

const CORE_SCORE_METRICS = (sport: SportKey, context: BindingContext): FieldDescriptor[] => ([
  { id: `${sport}:${context}:core:scoreHome`, label: 'Score Home', pathTemplate: 'scoreHome', level: 'game', group: 'Score/Clock', sport, context, requires: {}, displayableForText: true, getValue: (payload) => resolvePathValue(payload, 'scoreHome') },
  { id: `${sport}:${context}:core:scoreAway`, label: 'Score Away', pathTemplate: 'scoreAway', level: 'game', group: 'Score/Clock', sport, context, requires: {}, displayableForText: true, getValue: (payload) => resolvePathValue(payload, 'scoreAway') },
  { id: `${sport}:${context}:core:clock`, label: 'Clock', pathTemplate: 'clockSeconds', level: 'game', group: 'Score/Clock', sport, context, requires: {}, displayableForText: true, getValue: (payload) => resolvePathValue(payload, 'clockSeconds') },
  { id: `${sport}:${context}:core:period`, label: 'Period', pathTemplate: 'periodLabel', level: 'game', group: 'Score/Clock', sport, context, requires: {}, displayableForText: true, getValue: (payload) => resolvePathValue(payload, 'periodLabel') },
]);

const markDisplayableDescriptors = (descriptors: FieldDescriptor[], samplePayload: unknown): FieldDescriptor[] => (
  descriptors.map((descriptor) => {
    if (descriptor.displayableForText) return descriptor;
    const samplePath = materializeFieldPath(descriptor, { side: 'home', playerId: 'sample' }) ?? descriptor.pathTemplate;
    const sampleValue = resolvePathValue(samplePayload, samplePath);
    const displayable = sampleValue === null
      || sampleValue === undefined
      || ['string', 'number', 'boolean'].includes(typeof sampleValue);
    return { ...descriptor, displayableForText: displayable };
  })
);

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
      CORE_SCORE_METRICS(sport, context).forEach((descriptor) => {
        if (!byId.has(descriptor.id)) byId.set(descriptor.id, descriptor);
      });

      const descriptors: FieldDescriptor[] = [];
      extractBindingPaths(payloadByContext[context]).forEach((path) => {
        buildDescriptorsForPath(sport, context, path).forEach((descriptor) => {
          descriptors.push(descriptor);
        });
      });

      markDisplayableDescriptors(descriptors, payloadByContext[context]).forEach((descriptor) => {
        if (!byId.has(descriptor.id)) byId.set(descriptor.id, descriptor);
      });
    });
  });

  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
};

const catalogRegistry = buildCatalogRegistry();

export const getFieldCatalog = ({ sport, context }: FieldCatalogSelection): FieldDescriptor[] => (
  catalogRegistry.filter((entry) => entry.sport === sport && entry.context === context)
);

const escapeRegexLiteral = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CHOICE_SEGMENT_REGEX = /^[^\\()[\]{}.*+?^$|]+$/;

const buildPathMatcher = (pathTemplate: string): { regex: RegExp; tokenNames: string[] } => {
  const tokenNames: string[] = [];
  let pattern = '^';

  for (let i = 0; i < pathTemplate.length;) {
    const current = pathTemplate[i];

    if (current === '{') {
      const closeIndex = pathTemplate.indexOf('}', i + 1);
      if (closeIndex > i + 1) {
        const token = pathTemplate.slice(i + 1, closeIndex);
        tokenNames.push(token);
        pattern += '(.+?)';
        i = closeIndex + 1;
        continue;
      }
    }

    if (current === '(') {
      const closeIndex = pathTemplate.indexOf(')', i + 1);
      if (closeIndex > i + 1) {
        const groupBody = pathTemplate.slice(i + 1, closeIndex);
        const alternatives = groupBody.split('|').filter(Boolean);
        const isSafeChoiceGroup = alternatives.length >= 2 && alternatives.every((segment) => CHOICE_SEGMENT_REGEX.test(segment));
        if (isSafeChoiceGroup) {
          pattern += `(?:${alternatives.map((segment) => escapeRegexLiteral(segment)).join('|')})`;
          i = closeIndex + 1;
          continue;
        }
      }
    }

    pattern += escapeRegexLiteral(current);
    i += 1;
  }

  pattern += '$';
  return { regex: new RegExp(pattern), tokenNames };
};

export const materializeFieldPath = (descriptor: FieldDescriptor, selections: PathSelections): string | null => {
  if (descriptor.requires.side && !selections.side) return null;
  if (descriptor.requires.player && !selections.playerId) return null;

  let materialized = descriptor.pathTemplate
    .replace(/\{side\}/g, selections.side ?? '')
    .replace(/\{team\}/g, selections.side ?? '');

  if (descriptor.requires.player && selections.playerId) {
    const playerAccess = isIdentifier(selections.playerId)
      ? `.${selections.playerId}`
      : `[${JSON.stringify(selections.playerId)}]`;
    materialized = materialized
      .replace(/\.\{playerId\}/g, playerAccess)
      .replace(/\{playerId\}/g, selections.playerId);
  }

  return materialized;
};

export const parseBindingPathToSelection = (catalog: FieldDescriptor[], path: string): { descriptor: FieldDescriptor; selections: PathSelections } | null => {
  for (const descriptor of catalog) {
    let matcher: { regex: RegExp; tokenNames: string[] };
    try {
      matcher = buildPathMatcher(descriptor.pathTemplate);
    } catch {
      continue;
    }

    const match = path.match(matcher.regex);
    if (!match) continue;

    const selections: PathSelections = {};
    matcher.tokenNames.forEach((token, index) => {
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

const matchesBindingContext = (path: string, context: BindingFilterContext): boolean => {
  const tokens = tokenizePath(path);
  if (context.level === 'player') {
    if (tokens[0] !== 'boxScore' || !['homePlayers', 'awayPlayers'].includes(tokens[1] ?? '')) return false;
    if (context.side && tokens[1] !== `${context.side}Players`) return false;
    if (context.playerId && tokens[2] !== context.playerId) return false;
    return true;
  }

  if (context.level === 'team') {
    const isTeamTotals = tokens[0] === 'boxScore' && tokens[1] === 'teamTotals';
    const isTeamLeaders = tokens[0] === 'teamLeaders';
    if (!isTeamTotals && !isTeamLeaders) return false;
    if (!context.side) return true;
    return isTeamTotals ? tokens[2] === context.side : tokens[1] === context.side;
  }

  if (tokens[0] === 'boxScore' && ['homePlayers', 'awayPlayers', 'teamTotals'].includes(tokens[1] ?? '')) return false;
  if (tokens[0] === 'teamLeaders') return false;
  return true;
};

export const getMetricOptions = (catalog: FieldDescriptor[], level: FieldLevel, query: string, selections: PathSelections, context?: BindingFilterContext): MaterializedMetricOption[] => {
  const normalized = query.trim().toLowerCase();
  return catalog
    .filter((descriptor) => descriptor.level === level)
    .filter((descriptor) => descriptor.displayableForText !== false)
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
    .filter((entry) => !context || matchesBindingContext(entry.path, context))
    .filter((entry) => !normalized || `${entry.label} ${entry.path}`.toLowerCase().includes(normalized))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const groupMetricOptions = (options: MaterializedMetricOption[]) => (
  GROUP_ORDER
    .map((group) => ({ group, fields: options.filter((option) => option.group === group) }))
    .filter((entry) => entry.fields.length > 0)
);

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
  if (typeof value === 'object') return '';
  return String(value);
};

const sourceToContext = (source: string): BindingContext => {
  if (source === 'live-feed') return 'live';
  if (source === 'stats-service') return 'derived';
  return 'scorebug';
};

type BindingPayloads = {
  liveFeedPayload: unknown;
  derivedPayload: unknown;
  scorebugPayload: unknown;
};

export const resolveTextBinding = (
  layer: TextLayer,
  { liveFeedPayload, derivedPayload, scorebugPayload }: BindingPayloads,
): string => {
  const source = sourceToContext(layer.dataBindingSource);
  const payload = source === 'live'
    ? liveFeedPayload
    : source === 'derived'
      ? derivedPayload
      : scorebugPayload;
  const payloadSport = (payload && typeof payload === 'object' && 'sport' in (payload as Record<string, unknown>))
    ? ((payload as { sport?: SportKey }).sport ?? 'nba')
    : 'nba';
  const catalog = getFieldCatalog({ sport: payloadSport, context: source });
  const matched = parseBindingPathToSelection(catalog, layer.dataBindingField);
  const selectedMetric = matched?.descriptor;
  const selections = matched?.selections ?? {};

  const context: BindingFilterContext & PathSelections = {
    source,
    sport: payloadSport,
    level: selectedMetric?.level ?? 'game',
    side: selections.side,
    playerId: selections.playerId,
    ...selections,
  };

  try {
    const rawValue = selectedMetric?.getValue
      ? selectedMetric.getValue(payload, selections)
      : resolvePathValue(payload, layer.dataBindingField);
    if (selectedMetric?.format) return selectedMetric.format(rawValue, context);
    return formatBoundValue(rawValue, {
      sport: payloadSport,
      source,
      level: context.level,
      scope: selections.side,
      selectedPlayerId: selections.playerId,
      selectedPlayerName: selections.playerId,
      selectedMetricKey: selectedMetric?.id,
      selectedMetricPath: layer.dataBindingField,
    });
  } catch {
    return '';
  }
};

export const resolveTextLayerBindingValue = (
  layer: TextLayer,
  { liveFeedPayload, derivedPayload, scorebugPayload }: BindingPayloads,
): string => {
  if (layer.dataBindingSource === 'manual' || !layer.dataBindingField) return layer.text;
  try {
    return resolveTextBinding(layer, { liveFeedPayload, derivedPayload, scorebugPayload });
  } catch {
    return '';
  }
};
