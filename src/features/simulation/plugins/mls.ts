import { formatClock } from '../core';
import type { KeyStat, MlsGameState, SimulatorPlugin } from '../types';

const HALF_SECONDS = 45 * 60;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const buildKeyStats = (g: MlsGameState): KeyStat[] => [
  { label: 'Half', value: g.periodLabel, emphasis: 'med' },
  { label: 'Match Clock', value: formatClock(g.matchClock) },
  { label: 'Stoppage', value: g.stoppageTime > 0 ? `+${g.stoppageTime}'` : '0' },
  { label: 'Possession', value: `${g.possessionPctHome}% ${g.homeTeam}` },
  { label: 'Shots', value: `${g.shotsHome}-${g.shotsAway}` },
  { label: 'On Target', value: `${g.shotsOnTargetHome}-${g.shotsOnTargetAway}` },
  { label: 'xG', value: `${g.xGHome.toFixed(2)}-${g.xGAway.toFixed(2)}` },
  { label: 'Corners', value: `${g.cornersHome}-${g.cornersAway}` },
  { label: 'Cards', value: `${g.yellowCardsHome + g.redCardsHome}-${g.yellowCardsAway + g.redCardsAway}` },
  { label: 'Big Chances', value: `${g.bigChancesHome}-${g.bigChancesAway}`, emphasis: 'high' },
];

export const mlsSimulator: SimulatorPlugin = {
  key: 'mls',
  label: 'MLS',
  createInitialGame: () => {
    const game: MlsGameState = {
      sport: 'mls',
      homeTeam: 'MIA',
      awayTeam: 'SEA',
      scoreHome: 0,
      scoreAway: 0,
      period: 1,
      periodLabel: '1H',
      clockSeconds: HALF_SECONDS,
      possession: null,
      lastEvent: 'Kickoff from the center circle.',
      keyStats: [],
      lastPlay: { summary: 'Kickoff from the center circle.', tags: ['kickoff'] },
      matchClock: 0,
      stoppageTime: 0,
      possessionPctHome: 50,
      shotsHome: 0,
      shotsAway: 0,
      shotsOnTargetHome: 0,
      shotsOnTargetAway: 0,
      xGHome: 0,
      xGAway: 0,
      cornersHome: 0,
      cornersAway: 0,
      passesCompletedPctHome: 86,
      passesCompletedPctAway: 85,
      foulsHome: 0,
      foulsAway: 0,
      yellowCardsHome: 0,
      yellowCardsAway: 0,
      redCardsHome: 0,
      redCardsAway: 0,
      bigChancesHome: 0,
      bigChancesAway: 0,
      goalkeeperSavesHome: 0,
      goalkeeperSavesAway: 0,
    };
    game.keyStats = buildKeyStats(game);
    return game;
  },
  step: (previous, ctx) => {
    const game = structuredClone(previous) as MlsGameState;
    const tick = ctx.randomInt(12, 34);
    game.clockSeconds = Math.max(0, game.clockSeconds - tick);
    game.matchClock += Math.round(tick / 60);

    const attackHome = ctx.random() < 0.5;
    const attackTeam = attackHome ? game.homeTeam : game.awayTeam;

    const roll = ctx.random();
    let summary = '';
    let tags: string[] = [];

    if (roll < 0.14) {
      summary = `Foul by ${attackHome ? game.awayTeam : game.homeTeam} in midfield.`;
      tags = ['foul'];
      if (attackHome) game.foulsAway += 1;
      else game.foulsHome += 1;
    } else if (roll < 0.24) {
      summary = `Yellow card shown to ${attackHome ? game.awayTeam : game.homeTeam}.`;
      tags = ['card'];
      if (attackHome) game.yellowCardsAway += 1;
      else game.yellowCardsHome += 1;
    } else if (roll < 0.34) {
      summary = `Corner won by ${attackTeam}.`;
      tags = ['corner'];
      if (attackHome) game.cornersHome += 1;
      else game.cornersAway += 1;
    } else if (roll < 0.44) {
      summary = `VAR check for possible handball... no penalty.`;
      tags = ['var'];
      game.stoppageTime = clamp(game.stoppageTime + 1, 0, 8);
    } else if (roll < 0.56) {
      summary = `Substitution: fresh legs for ${attackTeam}.`;
      tags = ['sub'];
    } else if (roll < 0.79) {
      if (attackHome) {
        game.shotsHome += 1;
        game.shotsOnTargetHome += 1;
        game.goalkeeperSavesAway += 1;
        game.xGHome = Number((game.xGHome + ctx.random() * 0.14).toFixed(2));
      } else {
        game.shotsAway += 1;
        game.shotsOnTargetAway += 1;
        game.goalkeeperSavesHome += 1;
        game.xGAway = Number((game.xGAway + ctx.random() * 0.14).toFixed(2));
      }
      summary = `Shot on target by ${attackTeam}; strong save.`;
      tags = ['shot', 'save'];
    } else if (roll < 0.92) {
      if (attackHome) {
        game.shotsHome += 1;
        game.shotsOnTargetHome += 1;
        game.scoreHome += 1;
        game.bigChancesHome += 1;
        game.xGHome = Number((game.xGHome + ctx.random() * 0.4 + 0.1).toFixed(2));
      } else {
        game.shotsAway += 1;
        game.shotsOnTargetAway += 1;
        game.scoreAway += 1;
        game.bigChancesAway += 1;
        game.xGAway = Number((game.xGAway + ctx.random() * 0.4 + 0.1).toFixed(2));
      }
      summary = `GOAL ${attackTeam}! Clinical finish after a quick combination.`;
      tags = ['goal', 'big-chance'];
    } else {
      summary = `${attackTeam} strike whistles wide from distance.`;
      tags = ['shot-missed'];
      if (attackHome) {
        game.shotsHome += 1;
        game.xGHome = Number((game.xGHome + ctx.random() * 0.08).toFixed(2));
      } else {
        game.shotsAway += 1;
        game.xGAway = Number((game.xGAway + ctx.random() * 0.08).toFixed(2));
      }
    }

    game.possessionPctHome = clamp(game.possessionPctHome + (ctx.random() * 4 - 2), 38, 62);
    game.passesCompletedPctHome = clamp(game.passesCompletedPctHome + (ctx.random() * 2 - 1), 76, 92);
    game.passesCompletedPctAway = clamp(100 - game.passesCompletedPctHome + (ctx.random() * 1.2 - 0.6), 76, 92);

    if (game.clockSeconds <= 0 && game.period < 2) {
      game.period = 2;
      game.periodLabel = '2H';
      game.clockSeconds = HALF_SECONDS;
      game.matchClock = 45;
      game.stoppageTime = ctx.randomInt(1, 4);
      summary = 'Second half begins.';
      tags = ['half-start'];
    }

    game.lastEvent = summary;
    game.lastPlay = { summary, tags };
    game.keyStats = buildKeyStats(game);

    return {
      game,
      event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    };
  },
};
