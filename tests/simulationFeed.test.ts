import { describe, expect, it } from 'vitest';
import { DEFAULT_SIM_SEED } from '../src/features/simulation/core';
import {
  buildCanonicalEvent,
  buildLiveBindingPayload,
  buildSimulationFrame,
  createPlaceholderEvent,
  validateFrameInvariants,
} from '../src/features/simulation/feed';
import { simulatorRegistry } from '../src/features/simulation/registry';

describe('simulation feed frame contract', () => {
  it('builds semantic binding hierarchy for live payload', () => {
    const game = simulatorRegistry.nba.createInitialGame();
    const event = buildCanonicalEvent({
      game,
      legacyEvent: {
        id: 1,
        summary: game.lastEvent,
        periodLabel: game.periodLabel,
        clockLabel: '12:00',
        scoreHome: game.scoreHome,
        scoreAway: game.scoreAway,
        eventType: 'tip-off',
        team: game.homeTeam,
        player: 'Tatum',
        payload: {},
      },
      sequence: 1,
      simTimeMs: 500,
    });

    const frame = buildSimulationFrame({
      game,
      canonicalEvent: event,
      recentEvents: [event],
      seed: DEFAULT_SIM_SEED,
      speed: 'normal',
      status: 'running',
    });

    const payload = buildLiveBindingPayload(frame) as Record<string, unknown>;
    const simFeed = payload.simFeed as Record<string, unknown>;

    expect(simFeed).toBeTruthy();
    expect(simFeed.game).toBeTruthy();
    expect(simFeed.teams).toBeTruthy();
    expect(simFeed.players).toBeTruthy();
    expect(simFeed.analytics).toBeTruthy();
    expect(simFeed.graphics).toBeTruthy();
    expect(simFeed.story).toBeTruthy();
    expect(simFeed.events).toBeTruthy();
    expect(simFeed.context).toBeTruthy();
  });

  it('provides requested metric aliases for analytics.game.*', () => {
    const game = simulatorRegistry.nba.createInitialGame();
    const frame = buildSimulationFrame({
      game,
      canonicalEvent: createPlaceholderEvent(game),
      recentEvents: [],
      seed: DEFAULT_SIM_SEED,
      speed: 'normal',
      status: 'paused',
    });

    expect(frame.analytics.game.trueShootingPercent).toBeDefined();
    expect(frame.analytics.game.pointsPerPossession).toBeDefined();
    expect(frame.analytics.game.assistToTurnoverRatio).toBeDefined();
  });

  it('flags non-monotonic sequence and simTime invariants', () => {
    const game = simulatorRegistry.mlb.createInitialGame();
    const firstEvent = buildCanonicalEvent({
      game,
      legacyEvent: {
        id: 1,
        summary: game.lastEvent,
        periodLabel: game.periodLabel,
        clockLabel: '--:--',
        scoreHome: game.scoreHome,
        scoreAway: game.scoreAway,
        eventType: 'pitch',
        team: game.awayTeam,
        player: 'Judge',
        payload: {},
      },
      sequence: 1,
      simTimeMs: 100,
    });

    const firstFrame = buildSimulationFrame({
      game,
      canonicalEvent: firstEvent,
      recentEvents: [firstEvent],
      seed: DEFAULT_SIM_SEED,
      speed: 'normal',
      status: 'running',
    });

    const nextEvent = { ...firstEvent, id: 2, sequence: 1, simTimeMs: 100 };
    const issues = validateFrameInvariants(firstFrame, nextEvent, game);

    expect(issues).toContain('SEQUENCE_NON_MONOTONIC');
    expect(issues).toContain('SIM_TIME_NON_MONOTONIC');
  });
});
