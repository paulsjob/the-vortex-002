import { formatClock } from '../core';
import type { KeyStat, NflGameState, SimulatorPlugin } from '../types';

const QUARTER_SECONDS = 15 * 60;
const passers = ['P. Mahomes', 'J. Allen'];
const rushers = ['I. Pacheco', 'J. Cook', 'C. Edwards'];
const receivers = ['T. Kelce', 'S. Diggs', 'R. Rice', 'G. Davis'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const yardLineLabel = (yard: number, offense: 'home' | 'away', game: NflGameState) => {
  if (yard === 50) return '50';
  const offenseTeam = offense === 'home' ? game.homeTeam : game.awayTeam;
  const defenseTeam = offense === 'home' ? game.awayTeam : game.homeTeam;
  return yard > 50 ? `${defenseTeam} ${100 - yard}` : `${offenseTeam} ${yard}`;
};

const buildKeyStats = (game: NflGameState): KeyStat[] => [
  { label: 'Down & Dist', value: `${game.down} & ${game.distance}`, emphasis: game.down >= 3 ? 'high' : 'med' },
  { label: 'Yard Line', value: game.yardLine },
  { label: 'Drive', value: game.driveNumber },
  { label: 'Play Clock', value: game.playClock },
  { label: 'Poss', value: game.possessionTeam, emphasis: 'med' },
  { label: 'Drive Yds', value: game.yardsThisDrive },
  { label: 'Drive Plays', value: game.playsThisDrive },
  { label: 'Play Type', value: game.playType },
  { label: 'EPA', value: game.epa.toFixed(2) },
  { label: 'Home WP', value: `${Math.round(game.winProbabilityHome * 100)}%`, emphasis: 'high' },
];

export const nflSimulator: SimulatorPlugin = {
  key: 'nfl',
  label: 'NFL',
  createInitialGame: () => {
    const game: NflGameState = {
      sport: 'nfl',
      homeTeam: 'KC',
      awayTeam: 'BUF',
      scoreHome: 0,
      scoreAway: 0,
      period: 1,
      periodLabel: 'Q1',
      clockSeconds: QUARTER_SECONDS,
      possession: 'away',
      lastEvent: 'Kickoff returned to BUF 23.',
      keyStats: [],
      lastPlay: { type: 'kickoff', description: 'Kickoff returned to BUF 23.', down: 1, distance: 10, yards: 0 },
      down: 1,
      distance: 10,
      yardLine: 'BUF 23',
      ballOn: 23,
      driveNumber: 1,
      playClock: 40,
      possessionTeam: 'BUF',
      yardsThisDrive: 0,
      playsThisDrive: 0,
      timeoutsHome: 3,
      timeoutsAway: 3,
      passerName: passers[1],
      rusherName: rushers[1],
      receiverName: receivers[1],
      playType: 'pass',
      yardsGained: 0,
      epa: 0,
      winProbabilityHome: 0.5,
      redZone: false,
      turnoverCount: 0,
      penaltiesYards: 0,
    };
    game.keyStats = buildKeyStats(game);
    return game;
  },
  step: (previous, ctx, _history) => {
    const game = structuredClone(previous) as NflGameState;
    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(18, 38));
    game.playClock = ctx.randomInt(18, 40);
    const offense = game.possession ?? 'home';
    const previousBallOn = game.ballOn;

    game.possessionTeam = offense === 'home' ? game.homeTeam : game.awayTeam;
    game.passerName = passers[ctx.randomInt(0, passers.length - 1)];
    game.rusherName = rushers[ctx.randomInt(0, rushers.length - 1)];
    game.receiverName = receivers[ctx.randomInt(0, receivers.length - 1)];

    const roll = ctx.random();
    let summary = '';
    let playTypeLabel = "drive-continue";
    let yards = 0;
    let firstDown = false;

    if (roll < 0.07) {
      game.playType = 'turnover';
      game.turnoverCount += 1;
      yards = -ctx.randomInt(2, 8);
      summary = `${game.passerName} picked off at ${game.yardLine}; return to ${game.homeTeam} ${ctx.randomInt(20, 45)}.`;
      playTypeLabel = 'turnover';
      game.possession = offense === 'home' ? 'away' : 'home';
      game.down = 1;
      game.distance = 10;
      game.yardsThisDrive = 0;
      game.playsThisDrive = 0;
      game.driveNumber += 1;
    } else if (roll < 0.14) {
      game.playType = 'sack';
      yards = -ctx.randomInt(5, 11);
      summary = `Sack on ${game.passerName} for ${Math.abs(yards)} yards.`;
      playTypeLabel = 'sack';
      game.down = clamp((game.down + 1) as 1 | 2 | 3 | 4, 1, 4) as 1 | 2 | 3 | 4;
      game.distance += Math.abs(yards);
      game.yardsThisDrive += yards;
      game.playsThisDrive += 1;
    } else if (roll < 0.24) {
      game.playType = 'penalty';
      const penalty = ctx.random() < 0.5 ? 'Holding' : 'Pass interference';
      const py = ctx.randomInt(5, 15);
      game.penaltiesYards += py;
      summary = `Flag: ${penalty}, ${py} yards against ${game.possessionTeam}.`;
      playTypeLabel = 'penalty';
      game.distance += py;
      game.playsThisDrive += 1;
    } else if (roll < 0.37) {
      game.playType = 'run';
      yards = ctx.randomInt(-2, 18);
      summary = `${game.rusherName} rushes for ${yards} yards.`;
      playTypeLabel = 'run';
      game.yardsThisDrive += yards;
      game.playsThisDrive += 1;
      if (yards >= game.distance) firstDown = true;
      else {
        game.down = clamp((game.down + 1) as 1 | 2 | 3 | 4, 1, 4) as 1 | 2 | 3 | 4;
        game.distance -= yards;
      }
    } else if (roll < 0.75) {
      game.playType = 'pass';
      if (ctx.random() < 0.28) {
        yards = 0;
        summary = `${game.passerName} incomplete for ${game.receiverName}.`;
        playTypeLabel = 'pass-incomplete';
        game.down = clamp((game.down + 1) as 1 | 2 | 3 | 4, 1, 4) as 1 | 2 | 3 | 4;
      } else {
        yards = ctx.randomInt(4, 34);
        summary = `${game.passerName} to ${game.receiverName} for ${yards} yards.`;
        playTypeLabel = 'pass';
        game.yardsThisDrive += yards;
        game.playsThisDrive += 1;
        if (yards >= game.distance) firstDown = true;
        else {
          game.down = clamp((game.down + 1) as 1 | 2 | 3 | 4, 1, 4) as 1 | 2 | 3 | 4;
          game.distance -= yards;
        }
      }
    } else if (roll < 0.86) {
      game.playType = 'field_goal';
      const made = ctx.random() < 0.7;
      const kickDistance = ctx.randomInt(31, 57);
      summary = `${game.possessionTeam} ${made ? 'converts' : 'misses'} a ${kickDistance}-yard FG.`;
      playTypeLabel = 'field-goal';
      if (made) {
        if (offense === 'home') game.scoreHome += 3;
        else game.scoreAway += 3;
      }
      game.possession = offense === 'home' ? 'away' : 'home';
      game.down = 1;
      game.distance = 10;
      game.driveNumber += 1;
      game.yardsThisDrive = 0;
      game.playsThisDrive = 0;
    } else {
      game.playType = 'punt';
      const punt = ctx.randomInt(38, 56);
      summary = `${game.possessionTeam} punts ${punt} yards; fair catch at ${ctx.randomInt(9, 35)}.`;
      playTypeLabel = 'punt';
      game.possession = offense === 'home' ? 'away' : 'home';
      game.down = 1;
      game.distance = 10;
      game.driveNumber += 1;
      game.yardsThisDrive = 0;
      game.playsThisDrive = 0;
    }

    if (firstDown) {
      summary += ` First down ${game.possessionTeam}.`;

      game.down = 1;
      game.distance = 10;
    }

    let yardApprox = clamp(previousBallOn + yards, 1, 99);
    if (game.playType === 'punt' || game.playType === 'field_goal' || game.playType === 'turnover') {
      yardApprox = clamp(ctx.randomInt(20, 80), 1, 99);
    }
    game.redZone = yardApprox >= 80;
    if (game.redZone && game.playType === 'pass' && ctx.random() < 0.2) {
      if (offense === 'home') game.scoreHome += 7;
      else game.scoreAway += 7;
      summary = `${game.passerName} finds ${game.receiverName} for a touchdown.`;
      playTypeLabel = 'touchdown';
      game.down = 1;
      game.distance = 10;
      game.possession = offense === 'home' ? 'away' : 'home';
      game.driveNumber += 1;
      game.yardsThisDrive = 0;
      game.playsThisDrive = 0;
    }

    game.ballOn = yardApprox;
    game.yardLine = yardLineLabel(yardApprox, game.possession ?? 'home', game);
    game.yardsGained = yards;
    game.epa = Number((ctx.random() * 1.8 - 0.9 + (firstDown ? 0.5 : 0)).toFixed(2));
    const margin = game.scoreHome - game.scoreAway;
    game.winProbabilityHome = clamp(0.5 + margin * 0.03 + (game.period - 2) * 0.02 + game.epa * 0.04, 0.05, 0.95);

    if (game.down === 4 && game.playType !== 'punt' && game.playType !== 'field_goal') {
      summary += ` ${game.possessionTeam} faces 4th-and-${game.distance}.`;

    }

    if (game.clockSeconds <= 0 && game.period < 4) {
      game.period += 1;
      game.periodLabel = `Q${game.period}`;
      game.clockSeconds = QUARTER_SECONDS;
      if (game.period === 3) {
        game.timeoutsHome = 3;
        game.timeoutsAway = 3;
      }
      summary = `${game.periodLabel} begins.`;
      playTypeLabel = 'quarter-start';
    }

    game.lastEvent = summary;
    game.lastPlay = { type: playTypeLabel, description: summary, down: game.down, distance: game.distance, yards, passer: game.passerName, rusher: game.rusherName, receiver: game.receiverName, isTurnover: game.playType === 'turnover' };
    game.keyStats = buildKeyStats(game);

    return {
      game,
      event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    };
  },
};
