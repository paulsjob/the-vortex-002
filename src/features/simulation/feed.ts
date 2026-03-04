import type {
  GameState,
  SimPlayByPlayEvent,
  SimulationAnalyticsLayer,
  SimulationContextLayer,
  SimulationEvent,
  SimulationFrame,
  SimulationGraphicsLayer,
  SimulationSnapshot,
  SimulationStoryLayer,
  SimulationStoryTrigger,
} from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scoreDiff = (game: GameState) => game.scoreHome - game.scoreAway;

const readMetric = (metrics: Record<string, number>, keys: string[], fallback = 0) => {
  for (const key of keys) {
    const value = metrics[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return fallback;
};

const inferEventType = (game: GameState, legacyEvent: SimulationEvent) => {
  if (legacyEvent.eventType) return legacyEvent.eventType;
  const candidate = game.lastPlay.type;
  if (candidate) return candidate;
  return `${game.sport}-event`;
};

const inferTeam = (game: GameState, legacyEvent: SimulationEvent): string => {
  if (legacyEvent.team) return legacyEvent.team;
  if (game.possession === 'home') return game.homeTeam;
  if (game.possession === 'away') return game.awayTeam;
  return game.homeTeam;
};

const inferPlayer = (game: GameState, legacyEvent: SimulationEvent): string => {
  if (legacyEvent.player) return legacyEvent.player;
  if (typeof game.lastPlay.player === 'string' && game.lastPlay.player) return game.lastPlay.player;
  const first = Object.values(game.players)[0];
  return first?.name ?? 'N/A';
};

const buildPlayerAnalytics = (game: GameState): SimulationAnalyticsLayer['player'] => {
  const players: SimulationAnalyticsLayer['player'] = {};
  Object.values(game.players).forEach((player) => {
    players[player.name] = {
      team: player.team === 'home' ? game.homeTeam : game.awayTeam,
      ...player.stats,
    };
  });
  return players;
};

const buildTeamAnalytics = (game: GameState): SimulationAnalyticsLayer['team'] => {
  const homeTotals = game.boxScore?.teamTotals.home ?? {};
  const awayTotals = game.boxScore?.teamTotals.away ?? {};

  const home = {
    ...homeTotals,
  } as SimulationAnalyticsLayer['team']['home'];

  const away = {
    ...awayTotals,
  } as SimulationAnalyticsLayer['team']['away'];

  if (game.sport === 'mlb') {
    const hardHit = readMetric(game.advancedMetrics, ['hardHitPercent', 'hardHitPct'], 34);
    const barrel = readMetric(game.advancedMetrics, ['barrelPercent', 'barrelPct'], 8);
    const xwoba = readMetric(game.advancedMetrics, ['xwOBA'], 0.32);

    home.teamHardHitPercent = clamp(hardHit + scoreDiff(game) * 0.6, 0, 100);
    away.teamHardHitPercent = clamp(hardHit - scoreDiff(game) * 0.6, 0, 100);
    home.teamBarrelPercent = clamp(barrel + scoreDiff(game) * 0.3, 0, 100);
    away.teamBarrelPercent = clamp(barrel - scoreDiff(game) * 0.3, 0, 100);
    home.teamXwOBA = Number(clamp(xwoba + scoreDiff(game) * 0.004, 0.1, 0.9).toFixed(3));
    away.teamXwOBA = Number(clamp(xwoba - scoreDiff(game) * 0.004, 0.1, 0.9).toFixed(3));
  }

  return { home, away };
};

const withRequestedMetricAliases = (game: GameState, metrics: Record<string, number>) => {
  if (game.sport === 'mlb') {
    return {
      ...metrics,
      barrelPercent: readMetric(metrics, ['barrelPercent', 'barrelPct']),
      whiffPercent: readMetric(metrics, ['whiffPercent', 'whiffPct']),
      hardHitPercent: readMetric(metrics, ['hardHitPercent', 'hardHitPct']),
      zoneContactPercent: readMetric(metrics, ['zoneContactPercent', 'zoneContactPct']),
      barrelPct: readMetric(metrics, ['barrelPercent', 'barrelPct']),
      whiffPct: readMetric(metrics, ['whiffPercent', 'whiffPct']),
      hardHitPct: readMetric(metrics, ['hardHitPercent', 'hardHitPct']),
      zoneContactPct: readMetric(metrics, ['zoneContactPercent', 'zoneContactPct']),
    };
  }

  if (game.sport === 'nfl') {
    return {
      ...metrics,
      EPA: readMetric(metrics, ['EPA', 'epa']),
      CPOE: readMetric(metrics, ['CPOE', 'cpoe']),
      aDOT: readMetric(metrics, ['aDOT', 'adot']),
      explosivePlayPercent: readMetric(metrics, ['explosivePlayPercent', 'explosivePlayPct']),
      epa: readMetric(metrics, ['EPA', 'epa']),
      cpoe: readMetric(metrics, ['CPOE', 'cpoe']),
      adot: readMetric(metrics, ['aDOT', 'adot']),
      explosivePlayPct: readMetric(metrics, ['explosivePlayPercent', 'explosivePlayPct']),
    };
  }

  if (game.sport === 'nba') {
    return {
      ...metrics,
      trueShootingPercent: readMetric(metrics, ['trueShootingPercent', 'trueShootingPct']),
      pointsPerPossession: readMetric(metrics, ['pointsPerPossession', 'ppp']),
      assistToTurnoverRatio: readMetric(metrics, ['assistToTurnoverRatio', 'astToRatio']),
      trueShootingPct: readMetric(metrics, ['trueShootingPercent', 'trueShootingPct']),
      ppp: readMetric(metrics, ['pointsPerPossession', 'ppp']),
      astToRatio: readMetric(metrics, ['assistToTurnoverRatio', 'astToRatio']),
    };
  }

  if (game.sport === 'nhl') {
    return {
      ...metrics,
      expectedGoals: readMetric(metrics, ['expectedGoals', 'xG']),
      corsiPercent: readMetric(metrics, ['corsiPercent', 'corsiForPct']),
      fenwickPercent: readMetric(metrics, ['fenwickPercent', 'fenwickForPct']),
      expectedGoalsAgainst: readMetric(metrics, ['expectedGoalsAgainst', 'xGA']),
      zoneStartPercent: readMetric(metrics, ['zoneStartPercent', 'zoneStartsPct']),
      xG: readMetric(metrics, ['expectedGoals', 'xG']),
      corsiForPct: readMetric(metrics, ['corsiPercent', 'corsiForPct']),
      fenwickForPct: readMetric(metrics, ['fenwickPercent', 'fenwickForPct']),
      xGA: readMetric(metrics, ['expectedGoalsAgainst', 'xGA']),
      zoneStartsPct: readMetric(metrics, ['zoneStartPercent', 'zoneStartsPct']),
    };
  }

  return {
    ...metrics,
    expectedGoals: readMetric(metrics, ['expectedGoals', 'xG']),
    expectedAssists: readMetric(metrics, ['expectedAssists', 'xA']),
    PPDA: readMetric(metrics, ['PPDA', 'ppda']),
    xG: readMetric(metrics, ['expectedGoals', 'xG']),
    xA: readMetric(metrics, ['expectedAssists', 'xA']),
    ppda: readMetric(metrics, ['PPDA', 'ppda']),
  };
};

const buildGameAnalytics = (game: GameState): SimulationAnalyticsLayer['game'] => {
  const advanced = withRequestedMetricAliases(game, game.advancedMetrics);
  return {
    ...advanced,
    scoreDiff: scoreDiff(game),
    period: game.periodLabel,
    clockSeconds: game.clockSeconds,
    possession: game.possession,
    lastEvent: game.lastEvent,
  };
};

const buildAnalyticsLayer = (game: GameState): SimulationAnalyticsLayer => ({
  game: buildGameAnalytics(game),
  team: buildTeamAnalytics(game),
  player: buildPlayerAnalytics(game),
});

const computeMomentum = (game: GameState, recentEvents: SimPlayByPlayEvent[]) => {
  const scoreComponent = scoreDiff(game) * 7;
  const recentComponent = recentEvents.slice(-12).reduce((acc, event) => {
    const lower = event.eventType.toLowerCase();
    const swing = lower.includes('goal') || lower.includes('touchdown') || lower.includes('home-run') || lower.includes('made')
      ? 10
      : lower.includes('turnover') || lower.includes('penalty') || lower.includes('foul')
        ? -6
        : 0;

    if (event.team === game.homeTeam) return acc + swing;
    if (event.team === game.awayTeam) return acc - swing;
    return acc;
  }, 0);

  const homeMomentum = clamp(Math.round(scoreComponent + recentComponent), -100, 100);
  return { home: homeMomentum, away: -homeMomentum };
};

const computePressureIndex = (recentEvents: SimPlayByPlayEvent[]) => {
  const weighted = recentEvents.slice(-15).reduce((acc, event) => {
    const type = event.eventType.toLowerCase();
    if (type.includes('shot') || type.includes('goal') || type.includes('touchdown')) return acc + 8;
    if (type.includes('foul') || type.includes('penalty') || type.includes('turnover')) return acc + 6;
    if (type.includes('save') || type.includes('rebound') || type.includes('tackle')) return acc + 4;
    return acc + 2;
  }, 0);
  return clamp(Math.round(weighted / Math.max(Math.min(recentEvents.length, 15), 1)), 0, 100);
};

const detectHottestPlayer = (game: GameState) => {
  const metricBySport: Record<GameState['sport'], string> = {
    mlb: 'rbi',
    nba: 'points',
    nfl: 'yards',
    nhl: 'goals',
    mls: 'goals',
  };

  const key = metricBySport[game.sport];
  const players = Object.values(game.players);
  const top = [...players].sort((a, b) => (b.stats[key] ?? 0) - (a.stats[key] ?? 0))[0];
  if (!top) return { name: 'N/A', metric: 'No data' };
  return { name: top.name, metric: `${key}: ${top.stats[key] ?? 0}` };
};

const computeDominance = (game: GameState, momentum: { home: number; away: number }) => {
  const possessionBias = game.possession === 'home' ? 8 : game.possession === 'away' ? -8 : 0;
  const diff = clamp(scoreDiff(game) * 9 + possessionBias + momentum.home * 0.2, -100, 100);
  const home = clamp(Math.round(50 + diff / 2), 0, 100);
  return { home, away: 100 - home };
};

const computeClutch = (game: GameState, hottest: { name: string; metric: string }) => {
  const inning = Number(game.context.inning ?? game.period);
  const latePeriod =
    (game.sport === 'nba' && game.period >= 4 && game.clockSeconds <= 180)
    || (game.sport === 'nfl' && game.period >= 4 && game.clockSeconds <= 180)
    || (game.sport === 'nhl' && game.period >= 3 && game.clockSeconds <= 180)
    || (game.sport === 'mls' && game.period >= 2 && game.clockSeconds <= 300)
    || (game.sport === 'mlb' && inning >= 8);

  const closeGame = Math.abs(scoreDiff(game)) <= 8;
  const score = clamp((latePeriod ? 55 : 25) + (closeGame ? 25 : 0), 0, 100);
  return {
    player: hottest.name,
    score,
  };
};

const buildGraphicsLayer = (game: GameState, recentEvents: SimPlayByPlayEvent[]): SimulationGraphicsLayer => {
  const momentum = computeMomentum(game, recentEvents);
  const pressure = { index: computePressureIndex(recentEvents) };
  const hottestPlayer = detectHottestPlayer(game);
  const dominance = computeDominance(game, momentum);
  const clutch = computeClutch(game, hottestPlayer);

  return {
    momentum,
    pressure,
    hottestPlayer,
    dominance,
    clutch,
  };
};

const trigger = (
  active: boolean,
  description: string,
  extras: Omit<SimulationStoryTrigger, 'active' | 'description'> = {},
): SimulationStoryTrigger => ({
  active,
  description,
  ...extras,
});

const buildStoryLayer = (
  game: GameState,
  recentEvents: SimPlayByPlayEvent[],
  graphics: SimulationGraphicsLayer,
): SimulationStoryLayer => {
  const hottest = graphics.hottestPlayer;
  const hotStreak = trigger(
    hottest.name !== 'N/A',
    hottest.name === 'N/A' ? 'No hot streak detected yet.' : `${hottest.name} is surging (${hottest.metric}).`,
    hottest.name === 'N/A' ? {} : { player: hottest.name },
  );

  const momentumShiftTeam = graphics.momentum.home > 15 ? game.homeTeam : graphics.momentum.away > 15 ? game.awayTeam : undefined;
  const momentumShift = trigger(
    Boolean(momentumShiftTeam),
    momentumShiftTeam ? `${momentumShiftTeam} has seized momentum.` : 'Momentum is balanced.',
    momentumShiftTeam ? { team: momentumShiftTeam } : {},
  );

  const recordCandidate = Object.values(game.players)
    .sort((a, b) => (b.stats.points ?? 0) - (a.stats.points ?? 0))[0];
  const recordWatch = trigger(
    Boolean(recordCandidate && (recordCandidate.stats.points ?? 0) >= 8),
    recordCandidate ? `${recordCandidate.name} is approaching a notable benchmark.` : 'No record watch active.',
    recordCandidate ? { player: recordCandidate.name } : {},
  );

  const trailingTeam = scoreDiff(game) > 0 ? game.awayTeam : scoreDiff(game) < 0 ? game.homeTeam : undefined;
  const comebackProbability = trailingTeam
    ? clamp(Math.round(40 - Math.abs(scoreDiff(game)) * 4 + graphics.pressure.index * 0.35), 1, 99)
    : 50;
  const comeback = trigger(
    Boolean(trailingTeam),
    trailingTeam ? `${trailingTeam} comeback probability is ${comebackProbability}%.` : 'No comeback scenario.',
    trailingTeam ? { team: trailingTeam, probability: comebackProbability } : {},
  );

  const defenseTeam = graphics.pressure.index >= 45
    ? (graphics.momentum.home < 0 ? game.homeTeam : game.awayTeam)
    : undefined;
  const defense = trigger(
    Boolean(defenseTeam),
    defenseTeam ? `${defenseTeam} defensive unit is tightening the game.` : 'No lockdown trend yet.',
    defenseTeam ? { team: defenseTeam } : {},
  );

  const paceLike = readMetric(game.advancedMetrics, ['pace', 'neutralPace', 'PPDA', 'ppda'], 0);
  const historicPace = trigger(
    paceLike > 95,
    paceLike > 95
      ? `${hottest.name !== 'N/A' ? hottest.name : 'Key players'} are operating at a historic pace.`
      : 'Pace remains within normal range.',
    hottest.name !== 'N/A' ? { player: hottest.name } : {},
  );

  return {
    hotStreak,
    momentumShift,
    recordWatch,
    comeback,
    defense,
    historicPace,
  };
};

export const buildCanonicalEvent = (input: {
  game: GameState;
  legacyEvent: SimulationEvent;
  sequence: number;
  simTimeMs: number;
}): SimPlayByPlayEvent => {
  const { game, legacyEvent, sequence, simTimeMs } = input;
  const team = inferTeam(game, legacyEvent);
  const player = inferPlayer(game, legacyEvent);
  const eventType = inferEventType(game, legacyEvent);

  return {
    id: legacyEvent.id,
    sequence,
    simTimeMs,
    clock: legacyEvent.clockLabel || game.periodLabel,
    eventType,
    team,
    player,
    payload: {
      sport: game.sport,
      periodLabel: game.periodLabel,
      clockSeconds: game.clockSeconds,
      scoreHome: game.scoreHome,
      scoreAway: game.scoreAway,
      context: game.context,
      ...legacyEvent.payload,
    },
    summary: legacyEvent.summary || game.lastEvent,
    periodLabel: legacyEvent.periodLabel || game.periodLabel,
    clockLabel: legacyEvent.clockLabel,
    scoreHome: legacyEvent.scoreHome,
    scoreAway: legacyEvent.scoreAway,
  };
};

export const validateFrameInvariants = (
  previous: SimulationFrame | null,
  nextEvent: SimPlayByPlayEvent,
  nextSnapshot: SimulationSnapshot,
): string[] => {
  const issues: string[] = [];

  if (previous) {
    if (nextEvent.sequence <= previous.sequence) issues.push('SEQUENCE_NON_MONOTONIC');
    if (nextEvent.simTimeMs <= previous.simTimeMs) issues.push('SIM_TIME_NON_MONOTONIC');
    if (nextSnapshot.scoreHome < previous.snapshot.scoreHome) issues.push('HOME_SCORE_DECREASED');
    if (nextSnapshot.scoreAway < previous.snapshot.scoreAway) issues.push('AWAY_SCORE_DECREASED');
  }

  if (nextSnapshot.clockSeconds < 0) issues.push('CLOCK_NEGATIVE');

  if (nextSnapshot.sport === 'nfl') {
    const down = Number(nextSnapshot.context.down ?? 1);
    if (down < 1 || down > 4) issues.push('NFL_DOWN_INVALID');
  }

  if (nextSnapshot.sport === 'mlb') {
    const outs = Number(nextSnapshot.context.outs ?? 0);
    if (outs < 0 || outs > 2) issues.push('MLB_OUTS_INVALID');
  }

  if (nextSnapshot.sport === 'nba') {
    const shotClock = Number(nextSnapshot.context.shotClock ?? 24);
    if (shotClock < 0 || shotClock > 24) issues.push('NBA_SHOTCLOCK_INVALID');
  }

  return issues;
};

export const buildSimulationFrame = (input: {
  game: GameState;
  canonicalEvent: SimPlayByPlayEvent;
  recentEvents: SimPlayByPlayEvent[];
  seed: number;
  speed: 'slow' | 'normal' | 'fast';
  status: 'running' | 'paused' | 'external';
}): SimulationFrame => {
  const { game, canonicalEvent, recentEvents, seed, speed, status } = input;
  const snapshot = structuredClone(game) as SimulationSnapshot;
  const analytics = buildAnalyticsLayer(snapshot);
  const graphics = buildGraphicsLayer(snapshot, recentEvents);
  const story = buildStoryLayer(snapshot, recentEvents, graphics);

  const context: SimulationContextLayer = {
    seed,
    league: snapshot.sport,
    speed,
    status,
    eventCount: recentEvents.length,
    sequence: canonicalEvent.sequence,
    simTimeMs: canonicalEvent.simTimeMs,
  };

  return {
    sequence: canonicalEvent.sequence,
    simTimeMs: canonicalEvent.simTimeMs,
    event: canonicalEvent,
    snapshot,
    analytics,
    graphics,
    story,
    events: { recent: recentEvents },
    context,
  };
};

export const buildLiveBindingPayload = (frame: SimulationFrame) => {
  const game = frame.snapshot;
  const teams = {
    home: {
      name: game.homeTeam,
      abbr: game.homeAbbr,
      score: game.scoreHome,
      analytics: frame.analytics.team.home,
    },
    away: {
      name: game.awayTeam,
      abbr: game.awayAbbr,
      score: game.scoreAway,
      analytics: frame.analytics.team.away,
    },
  };

  return {
    simFeed: {
      game,
      teams,
      players: frame.analytics.player,
      analytics: frame.analytics,
      graphics: frame.graphics,
      story: frame.story,
      events: {
        recent: frame.events.recent,
        latest: frame.event,
      },
      context: frame.context,
    },

    game,
    teams,
    players: frame.analytics.player,
    analytics: frame.analytics,
    graphics: frame.graphics,
    story: frame.story,
    events: {
      recent: frame.events.recent,
      latest: frame.event,
    },
    context: frame.context,

    scoreHome: game.scoreHome,
    scoreAway: game.scoreAway,
    periodLabel: game.periodLabel,
    clockSeconds: game.clockSeconds,
    possession: game.possession,
    lastEvent: game.lastEvent,
    advancedMetrics: game.advancedMetrics,
    boxScore: game.boxScore,
    teamLeaders: game.teamLeaders,
    gameLeaders: game.gameLeaders,
  };
};

export const createPlaceholderEvent = (game: GameState): SimPlayByPlayEvent => ({
  id: 0,
  sequence: 0,
  simTimeMs: 0,
  clock: game.periodLabel,
  eventType: 'init',
  team: game.homeTeam,
  player: 'N/A',
  payload: {
    sport: game.sport,
    periodLabel: game.periodLabel,
    clockSeconds: game.clockSeconds,
  },
  summary: game.lastEvent,
  periodLabel: game.periodLabel,
  clockLabel: game.periodLabel,
  scoreHome: game.scoreHome,
  scoreAway: game.scoreAway,
});
