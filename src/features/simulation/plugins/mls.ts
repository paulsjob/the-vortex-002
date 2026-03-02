import { createDefaultPitch, formatClock } from '../core';
import type { SimulatorPlugin } from '../types';

const HALF_SECONDS = 45 * 60;

export const mlsSimulator: SimulatorPlugin = {
  key: 'mls',
  label: 'MLS',
  createInitialGame: () => ({
    sport: 'mls', homeTeam: 'MIA', awayTeam: 'SEA', scoreHome: 0, scoreAway: 0,
    period: 1, periodLabel: '1H', clockSeconds: HALF_SECONDS, possession: null, lastEvent: 'Kickoff pending.',
    inning: 1, half: 'top', balls: 0, strikes: 0, outs: 0, onFirst: false, onSecond: false, onThird: false,
    pitcher: '', batter: '', lastPitch: createDefaultPitch(),
  }),
  step: (previous, ctx) => {
    const game = structuredClone(previous);
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(10, 40));
    if (ctx.random() < 0.08) {
      const scorer = ctx.random() < 0.5 ? 'home' : 'away';
      if (scorer === 'home') game.scoreHome += 1;
      else game.scoreAway += 1;
      game.lastEvent = `${scorer === 'home' ? game.homeTeam : game.awayTeam} Goal`;
    } else {
      game.lastEvent = 'Midfield build-up';
    }
    if (game.clockSeconds <= 0 && game.period < 2) {
      game.period += 1;
      game.periodLabel = '2H';
      game.clockSeconds = HALF_SECONDS;
      game.lastEvent = 'Second half begins';
    }
    return {
      game,
      event: { id: ctx.nextId(), summary: game.lastEvent, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    };
  },
};
