import { createDefaultPitch, formatClock } from '../core';
import type { SimulatorPlugin } from '../types';

const PERIOD_SECONDS = 20 * 60;

export const nhlSimulator: SimulatorPlugin = {
  key: 'nhl',
  label: 'NHL',
  createInitialGame: () => ({
    sport: 'nhl', homeTeam: 'NYR', awayTeam: 'TOR', scoreHome: 0, scoreAway: 0,
    period: 1, periodLabel: 'P1', clockSeconds: PERIOD_SECONDS, possession: null, lastEvent: 'Puck drop pending.',
    inning: 1, half: 'top', balls: 0, strikes: 0, outs: 0, onFirst: false, onSecond: false, onThird: false,
    pitcher: '', batter: '', lastPitch: createDefaultPitch(),
  }),
  step: (previous, ctx) => {
    const game = structuredClone(previous);
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(8, 30));
    if (ctx.random() < 0.1) {
      const scorer = ctx.random() < 0.5 ? 'home' : 'away';
      if (scorer === 'home') game.scoreHome += 1;
      else game.scoreAway += 1;
      game.lastEvent = `${scorer === 'home' ? game.homeTeam : game.awayTeam} Goal`;
    } else {
      game.lastEvent = 'Zone pressure / save';
    }
    if (game.clockSeconds <= 0 && game.period < 3) {
      game.period += 1;
      game.periodLabel = `P${game.period}`;
      game.clockSeconds = PERIOD_SECONDS;
      game.lastEvent = `${game.periodLabel} begins`;
    }
    return {
      game,
      event: { id: ctx.nextId(), summary: game.lastEvent, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    };
  },
};
