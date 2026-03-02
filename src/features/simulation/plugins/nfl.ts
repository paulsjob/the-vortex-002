import { createDefaultPitch, formatClock } from '../core';
import type { SimulatorPlugin } from '../types';

const QUARTER_SECONDS = 15 * 60;

export const nflSimulator: SimulatorPlugin = {
  key: 'nfl',
  label: 'NFL',
  createInitialGame: () => ({
    sport: 'nfl', homeTeam: 'KC', awayTeam: 'BUF', scoreHome: 0, scoreAway: 0,
    period: 1, periodLabel: 'Q1', clockSeconds: QUARTER_SECONDS, possession: 'away', lastEvent: 'Kickoff pending.',
    inning: 1, half: 'top', balls: 0, strikes: 0, outs: 0, onFirst: false, onSecond: false, onThird: false,
    pitcher: '', batter: '', lastPitch: createDefaultPitch(),
  }),
  step: (previous, ctx) => {
    const game = structuredClone(previous);
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(20, 45));
    if (ctx.random() < 0.35) game.possession = game.possession === 'home' ? 'away' : 'home';
    const offense = game.possession ?? 'home';
    const r = ctx.random();
    if (r < 0.08) {
      if (offense === 'home') game.scoreHome += 7;
      else game.scoreAway += 7;
      game.lastEvent = `${offense === 'home' ? game.homeTeam : game.awayTeam} TD + PAT`;
    } else if (r < 0.14) {
      if (offense === 'home') game.scoreHome += 3;
      else game.scoreAway += 3;
      game.lastEvent = `${offense === 'home' ? game.homeTeam : game.awayTeam} Field Goal`;
    } else {
      game.lastEvent = `${offense === 'home' ? game.homeTeam : game.awayTeam} drive continues`;
    }
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
