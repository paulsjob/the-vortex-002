import { formatClock } from '../core';
import type { KeyStat, NhlGameState, SimulatorPlugin } from '../types';

const PERIOD_SECONDS = 20 * 60;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const buildKeyStats = (g: NhlGameState): KeyStat[] => [
  { label: 'Period', value: g.periodLabel, emphasis: 'med' },
  { label: 'Strength', value: g.strengthState, emphasis: g.strengthState === 'EV' ? 'low' : 'high' },
  { label: 'PP Time', value: g.ppTimeRemaining > 0 ? formatClock(g.ppTimeRemaining) : '--:--' },
  { label: 'Shots', value: `${g.shotsHome}-${g.shotsAway}` },
  { label: 'SOG', value: `${g.sogHome}-${g.sogAway}` },
  { label: 'Hits', value: `${g.hitsHome}-${g.hitsAway}` },
  { label: 'Faceoff%', value: `${g.faceoffWinPctHome.toFixed(1)}%` },
  { label: 'Give/Take', value: `${g.giveawaysHome + g.giveawaysAway}/${g.takeawaysHome + g.takeawaysAway}` },
  { label: 'Goalie Saves', value: `${g.goalieSavesHome}-${g.goalieSavesAway}` },
  { label: 'xG', value: `${g.xGHome.toFixed(2)}-${g.xGAway.toFixed(2)}`, emphasis: 'med' },
];

export const nhlSimulator: SimulatorPlugin = {
  key: 'nhl',
  label: 'NHL',
  createInitialGame: () => {
    const game: NhlGameState = {
      sport: 'nhl',
      homeTeam: 'NYR',
      awayTeam: 'TOR',
      scoreHome: 0,
      scoreAway: 0,
      period: 1,
      periodLabel: 'P1',
      clockSeconds: PERIOD_SECONDS,
      possession: null,
      lastEvent: 'Puck drop at center ice.',
      keyStats: [],
      lastPlay: { type: 'faceoff', description: 'Puck drop at center ice.' },
      strengthState: 'EV',
      ppTimeRemaining: 0,
      shotsHome: 0,
      shotsAway: 0,
      sogHome: 0,
      sogAway: 0,
      hitsHome: 0,
      hitsAway: 0,
      faceoffWinPctHome: 50,
      giveawaysHome: 0,
      giveawaysAway: 0,
      takeawaysHome: 0,
      takeawaysAway: 0,
      goalieSavesHome: 0,
      goalieSavesAway: 0,
      pulledGoalie: false,
      xGHome: 0,
      xGAway: 0,
      scoringChancesHome: 0,
      scoringChancesAway: 0,
    };
    game.keyStats = buildKeyStats(game);
    return game;
  },
  step: (previous, ctx, _history) => {
    const game = structuredClone(previous) as NhlGameState;
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(8, 30));
    if (game.ppTimeRemaining > 0) {
      game.ppTimeRemaining = Math.max(0, game.ppTimeRemaining - ctx.randomInt(8, 20));
      if (game.ppTimeRemaining === 0) game.strengthState = 'EV';
    }

    const roll = ctx.random();
    let summary = '';
    let playType = "sequence";
    const attackHome = ctx.random() < 0.5;

    if (roll < 0.16) {
      summary = `${attackHome ? game.homeTeam : game.awayTeam} dumps it in, icing waved off.`;
      playType = 'icing';
    } else if (roll < 0.3) {
      summary = `Offside on ${attackHome ? game.homeTeam : game.awayTeam}. Neutral zone faceoff.`;
      playType = 'offside';
    } else if (roll < 0.45) {
      summary = `${attackHome ? game.homeTeam : game.awayTeam} assessed a minor penalty.`;
      playType = 'penalty';
      game.strengthState = attackHome ? 'PK' : 'PP';
      game.ppTimeRemaining = 2 * 60;
    } else if (roll < 0.76) {
      if (attackHome) {
        game.shotsHome += 1;
        game.sogHome += 1;
        game.goalieSavesAway += 1;
        game.xGHome = Number((game.xGHome + ctx.random() * 0.18).toFixed(2));
      } else {
        game.shotsAway += 1;
        game.sogAway += 1;
        game.goalieSavesHome += 1;
        game.xGAway = Number((game.xGAway + ctx.random() * 0.18).toFixed(2));
      }
      summary = `Shot on goal by ${attackHome ? game.homeTeam : game.awayTeam}; save made.`;
      playType = 'shot-save';
    } else if (roll < 0.9) {
      if (attackHome) {
        game.shotsHome += 1;
        game.sogHome += 1;
        game.scoreHome += 1;
        game.scoringChancesHome += 1;
        game.xGHome = Number((game.xGHome + ctx.random() * 0.35 + 0.1).toFixed(2));
      } else {
        game.shotsAway += 1;
        game.sogAway += 1;
        game.scoreAway += 1;
        game.scoringChancesAway += 1;
        game.xGAway = Number((game.xGAway + ctx.random() * 0.35 + 0.1).toFixed(2));
      }
      summary = `GOAL ${attackHome ? game.homeTeam : game.awayTeam}! One-timer from the slot.`;
      playType = 'goal';
    } else {
      summary = `${attackHome ? game.homeTeam : game.awayTeam} enters with speed; odd-man rush denied.`;
      playType = 'zone-entry';
    }

    game.hitsHome += ctx.randomInt(0, 2);
    game.hitsAway += ctx.randomInt(0, 2);
    game.giveawaysHome += ctx.randomInt(0, 1);
    game.giveawaysAway += ctx.randomInt(0, 1);
    game.takeawaysHome += ctx.randomInt(0, 1);
    game.takeawaysAway += ctx.randomInt(0, 1);
    game.faceoffWinPctHome = clamp(game.faceoffWinPctHome + (ctx.random() * 4 - 2), 35, 65);
    game.pulledGoalie = game.period === 3 && game.clockSeconds < 120 && Math.abs(game.scoreHome - game.scoreAway) === 1;

    if (game.clockSeconds <= 0 && game.period < 3) {
      game.period += 1;
      game.periodLabel = `P${game.period}`;
      game.clockSeconds = PERIOD_SECONDS;
      summary = `${game.periodLabel} begins.`;
      playType = 'period-start';
    } else if (game.clockSeconds <= 0 && game.period >= 3 && game.scoreHome === game.scoreAway) {
      game.period += 1;
      game.periodLabel = 'OT';
      game.clockSeconds = 5 * 60;
      summary = 'Overtime underway at 3-on-3.';
      playType = 'overtime';
    }

    game.lastEvent = summary;
    game.lastPlay = { type: playType, description: summary, strength: game.strengthState, isGoal: playType === 'goal' };
    game.keyStats = buildKeyStats(game);

    return {
      game,
      event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    };
  },
};
