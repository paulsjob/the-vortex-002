import { afterEach, describe, expect, it } from 'vitest';
import { useDataEngineStore } from '../src/store/useDataEngineStore';

const resetHarness = () => {
  const store = useDataEngineStore.getState();
  store.stop();
  store.setExternalMode(false);
  store.clearExternalGame();
  store.setSeed(20260304);
  store.setSport('nba');
  store.setSpeed('normal');
  store.reset();
};

const runScenario = (seed: number, speed: 'slow' | 'normal' | 'fast', steps: number) => {
  const store = useDataEngineStore.getState();
  store.stop();
  store.setExternalMode(false);
  store.clearExternalGame();
  store.setSeed(seed);
  useDataEngineStore.getState().setSport('nba');
  useDataEngineStore.getState().setSpeed(speed);
  useDataEngineStore.getState().reset();

  for (let i = 0; i < steps; i += 1) {
    useDataEngineStore.getState().stepPitch();
  }

  const state = useDataEngineStore.getState();
  return {
    scoreHome: state.game.scoreHome,
    scoreAway: state.game.scoreAway,
    sequence: state.sequence,
    summaries: state.history.slice(0, 20).map((event) => event.summary),
    events: [...state.history].reverse(),
  };
};

afterEach(() => {
  resetHarness();
});

describe('data engine deterministic simulation', () => {
  it('replays identical outcomes for the same seed', () => {
    const a = runScenario(880301, 'normal', 35);
    const b = runScenario(880301, 'normal', 35);

    expect(b).toEqual(a);
  });

  it('keeps outcomes stable across speeds for same seed and step count', () => {
    const slow = runScenario(445566, 'slow', 30);
    const fast = runScenario(445566, 'fast', 30);

    expect(fast.scoreHome).toBe(slow.scoreHome);
    expect(fast.scoreAway).toBe(slow.scoreAway);
    expect(fast.summaries).toEqual(slow.summaries);
  });

  it('emits canonical event fields with monotonic sequence and simTime', () => {
    const result = runScenario(1177, 'normal', 40);

    let previousSequence = 0;
    let previousSimTime = 0;

    result.events.forEach((event) => {
      expect(event.sequence).toBeGreaterThan(previousSequence);
      expect(event.simTimeMs).toBeGreaterThan(previousSimTime);
      expect(typeof event.clock).toBe('string');
      expect(event.eventType.length).toBeGreaterThan(0);
      expect(event.team.length).toBeGreaterThan(0);
      expect(event.player.length).toBeGreaterThan(0);
      expect(typeof event.payload).toBe('object');
      expect(event.summary.length).toBeGreaterThan(0);

      previousSequence = event.sequence;
      previousSimTime = event.simTimeMs;
    });
  });
});
