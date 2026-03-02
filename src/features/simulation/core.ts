import type { LastPitch, SimulatorContext } from './types';

const defaultPitch: LastPitch = {
  pitchNumber: 0,
  pitchType: 'FF',
  velocityMph: 0,
  location: 'Mid-Center',
  result: 'Game initialized',
  batSpeedMph: null,
  exitVelocityMph: null,
  launchAngleDeg: null,
  projectedDistanceFt: null,
};

export const createDefaultPitch = () => ({ ...defaultPitch });

let rngState = 123456789;
let sequence = 0;

export const resetSimulationCore = () => {
  rngState = 123456789;
  sequence = 0;
};

export const createSimulatorContext = (): SimulatorContext => ({
  nextId: () => {
    sequence += 1;
    return sequence;
  },
  random: () => {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296;
  },
  randomInt: (min, max) => {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return Math.floor(min + (rngState / 4294967296) * (max - min + 1));
  },
});

export const formatClock = (clockSeconds: number) => {
  const minutes = Math.floor(clockSeconds / 60);
  const seconds = clockSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
