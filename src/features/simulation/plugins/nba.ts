import { createDefaultPitch, formatClock } from '../core';
import type { SimulatorPlugin } from '../types';

const QUARTER_SECONDS = 12 * 60;

export const nbaSimulator: SimulatorPlugin = {
  key: 'nba',
  label: 'NBA',
  createInitialGame: () => ({
    sport: 'nba', homeTeam: 'LAL', awayTeam: 'BOS', scoreHome: 0, scoreAway: 0,
    period: 1, periodLabel: 'Q1', clockSeconds: QUARTER_SECONDS, possession: 'away', lastEvent: 'Tip-off pending.',
    inning: 1, half: 'top', balls: 0, strikes: 0, outs: 0, onFirst: false, onSecond: false, onThird: false,
    pitcher: '', batter: '', lastPitch: createDefaultPitch(),
  }),
  step: (previous, ctx) => {
    const game = structuredClone(previous);
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(4, 24));
    if (ctx.random() < 0.45) {
      const team = game.possession ?? 'home';
      const outcome = ctx.random();
      let points = 1;
      let label = 'Free Throw';
      if (outcome > 0.65) {
        points = 2;
        label = '2PT FG';
      }
      if (outcome > 0.9) {
        points = 3;
        label = '3PT FG';
      }
      if (team === 'home') game.scoreHome += points;
      else game.scoreAway += points;
      game.lastEvent = `${team === 'home' ? game.homeTeam : game.awayTeam} ${label}`;
    } else {
      game.lastEvent = 'Empty possession';
    }
    game.possession = game.possession === 'home' ? 'away' : 'home';
    if (game.clockSeconds <= 0 && game.period < 4) {
      game.period += 1;
      game.periodLabel = `Q${game.period}`;
      game.clockSeconds = QUARTER_SECONDS;
      game.lastEvent = `${game.periodLabel} starts`;
    }
    return {
      game,
      event: { id: ctx.nextId(), summary: game.lastEvent, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    };
  },
};
