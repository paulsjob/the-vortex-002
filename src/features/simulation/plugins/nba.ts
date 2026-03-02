import { formatClock } from '../core';
import type { KeyStat, NbaGameState, SimulatorPlugin } from '../types';

const QUARTER_SECONDS = 12 * 60;
const shotClockMax = 24;
const scorers = ['L. James', 'A. Davis', 'J. Tatum', 'J. Brown'];
const distributors = ['L. James', 'D. White', 'J. Holiday'];
const rebounders = ['A. Davis', 'K. Porzingis', 'A. Horford'];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const buildKeyStats = (g: NbaGameState): KeyStat[] => [
  { label: 'Quarter', value: g.periodLabel, emphasis: 'med' },
  { label: 'Game Clock', value: formatClock(g.clockSeconds) },
  { label: 'Shot Clock', value: g.shotClock, emphasis: g.shotClock < 7 ? 'high' : 'low' },
  { label: 'Possession', value: g.possession === 'home' ? g.homeTeam : g.awayTeam },
  { label: 'Team Fouls', value: `${g.teamFoulsHome}-${g.teamFoulsAway}` },
  { label: 'Bonus', value: g.bonusHome || g.bonusAway ? 'ON' : 'OFF', emphasis: g.bonusHome || g.bonusAway ? 'high' : 'low' },
  { label: 'Points Leader', value: g.pointsLeader },
  { label: 'Assists Leader', value: g.assistsLeader },
  { label: 'Rebounds Leader', value: g.reboundsLeader },
  { label: 'Run', value: g.run, emphasis: 'med' },
];

export const nbaSimulator: SimulatorPlugin = {
  key: 'nba',
  label: 'NBA',
  createInitialGame: () => {
    const game: NbaGameState = {
      sport: 'nba',
      homeTeam: 'LAL',
      awayTeam: 'BOS',
      scoreHome: 0,
      scoreAway: 0,
      period: 1,
      periodLabel: 'Q1',
      clockSeconds: QUARTER_SECONDS,
      possession: 'away',
      lastEvent: 'Tip-off controlled by BOS.',
      keyStats: [],
      lastPlay: { type: 'tipoff', description: 'Tip-off controlled by BOS.', points: 0, shooter: 'N/A' },
      shotClock: shotClockMax,
      teamFoulsHome: 0,
      teamFoulsAway: 0,
      bonusHome: false,
      bonusAway: false,
      turnoversHome: 0,
      turnoversAway: 0,
      pointsLeader: 'L. James 0',
      assistsLeader: 'L. James 0',
      reboundsLeader: 'A. Davis 0',
      lastShot: 'NONE',
      shotResult: 'none',
      run: '0-0 run',
      paceEstimate: 99,
      offensiveRatingEstimate: 110,
      winProbabilityHome: 0.5,
    };
    game.keyStats = buildKeyStats(game);
    return game;
  },
  step: (previous, ctx, _history) => {
    const game = structuredClone(previous) as NbaGameState;
    const offense = game.possession ?? 'home';
    const offenseTeam = offense === 'home' ? game.homeTeam : game.awayTeam;

    game.clockSeconds = Math.max(0, game.clockSeconds - ctx.randomInt(4, 20));
    game.shotClock = clamp(game.shotClock - ctx.randomInt(4, 10), 0, shotClockMax);

    const roll = ctx.random();
    let summary = '';
    game.lastShot = 'NONE';
    game.shotResult = 'none';
    let playType = 'possession';
    let playPoints = 0;
    const shooter = scorers[ctx.randomInt(0, scorers.length - 1)];
    let assist: string | undefined;
    let playIsThree = false;
    let isFoul = false;

    if (roll < 0.12) {
      const foulOnHome = offense === 'away';
      if (foulOnHome) game.teamFoulsHome += 1;
      else game.teamFoulsAway += 1;
      game.shotClock = shotClockMax;
      summary = `Shooting foul on ${foulOnHome ? game.homeTeam : game.awayTeam}; two free throws.`;
      game.lastShot = 'FT';
      game.shotResult = 'foul';
      isFoul = true;
      if (ctx.random() < 0.76) {
        if (offense === 'home') game.scoreHome += 2;
        else game.scoreAway += 2;
        summary = `${offenseTeam} knocks down both free throws.`;
        playType = 'free-throw';
        playPoints = 2;
      }
    } else if (roll < 0.22) {
      game.shotClock = shotClockMax;
      summary = `${offenseTeam} timeout to settle the offense.`;
      playType = 'timeout';
    } else if (roll < 0.34) {
      const defense = offense === 'home' ? 'away' : 'home';
      if (offense === 'home') game.turnoversHome += 1;
      else game.turnoversAway += 1;
      game.shotClock = shotClockMax;
      summary = `Steal by ${defense === 'home' ? game.homeTeam : game.awayTeam}; transition chance.`;
      game.lastShot = 'NONE';
      game.shotResult = 'turnover';
      playType = 'turnover';
    } else if (roll < 0.42) {
      summary = `${offenseTeam} push in transition for a fast-break layup.`;
      if (offense === 'home') game.scoreHome += 2;
      else game.scoreAway += 2;
      game.lastShot = '2PT';
      game.shotResult = 'made';
      playType = 'made-shot';
      playPoints = 2;
      game.shotClock = shotClockMax;
    } else if (roll < 0.76) {
      const isThree = ctx.random() < 0.42;
      const made = ctx.random() < (isThree ? 0.37 : 0.51);
      const points = isThree ? 3 : 2;
      playIsThree = isThree;
      game.lastShot = isThree ? '3PT' : '2PT';
      game.shotResult = made ? 'made' : 'missed';
      game.shotClock = shotClockMax;
      if (made) {
        if (offense === 'home') game.scoreHome += points;
        else game.scoreAway += points;
        playType = 'made-shot';
        playPoints = points;
        assist = distributors[ctx.randomInt(0, distributors.length - 1)];
        summary = `${offenseTeam} ${isThree ? 'drills a three' : 'scores at the rim'}.`;
        if (ctx.random() < 0.08) {
          if (offense === 'home') game.scoreHome += 1;
          else game.scoreAway += 1;
          playPoints += 1;
          summary = `${offenseTeam} converts the and-1.`;
        }
      } else {
        summary = `${offenseTeam} ${isThree ? 'misses from deep' : 'misses the pull-up jumper'}.`;
      }
    } else {
      summary = `Chase-down block at the rim; ${offenseTeam} reset.`;
      game.shotClock = 14;
      game.lastShot = '2PT';
      game.shotResult = 'missed';
      playType = 'block';
    }

    game.bonusHome = game.teamFoulsAway >= 5;
    game.bonusAway = game.teamFoulsHome >= 5;
    game.pointsLeader = `${scorers[ctx.randomInt(0, scorers.length - 1)]} ${ctx.randomInt(14, 38)}`;
    game.assistsLeader = `${distributors[ctx.randomInt(0, distributors.length - 1)]} ${ctx.randomInt(4, 13)}`;
    game.reboundsLeader = `${rebounders[ctx.randomInt(0, rebounders.length - 1)]} ${ctx.randomInt(5, 17)}`;
    const possessions = (game.scoreHome + game.scoreAway) / 2;
    game.paceEstimate = clamp(Math.round(95 + possessions / Math.max(1, game.period) + ctx.randomInt(-3, 3)), 90, 110);
    game.offensiveRatingEstimate = clamp(Math.round(102 + (game.scoreHome + game.scoreAway) / Math.max(1, game.period) + ctx.randomInt(-4, 5)), 96, 132);
    game.winProbabilityHome = clamp(0.5 + (game.scoreHome - game.scoreAway) * 0.025 + (game.period - 2) * 0.01, 0.05, 0.95);

    if (game.clockSeconds <= 0 && game.period < 4) {
      game.period += 1;
      game.periodLabel = `Q${game.period}`;
      game.clockSeconds = QUARTER_SECONDS;
      game.teamFoulsHome = 0;
      game.teamFoulsAway = 0;
      game.bonusHome = false;
      game.bonusAway = false;
      summary = `${game.periodLabel} begins.`;
      playType = 'quarter-start';
    } else if (game.clockSeconds <= 0 && game.period >= 4) {
      game.period += 1;
      game.periodLabel = 'OT';
      game.clockSeconds = 5 * 60;
      summary = 'Overtime starts.';
      playType = 'overtime';
    }

    game.lastEvent = summary;
    game.lastPlay = { type: playType, description: summary, points: playPoints, shooter, assist, isThree: playIsThree, isFoul };
    game.keyStats = buildKeyStats(game);
    game.possession = offense === 'home' ? 'away' : 'home';

    return {
      game,
      event: { id: ctx.nextId(), summary, periodLabel: game.periodLabel, clockLabel: formatClock(game.clockSeconds), scoreHome: game.scoreHome, scoreAway: game.scoreAway },
    };
  },
};
