import type { AppData, Settings } from '../types';
import { defaultExercises } from './exercises';
import { defaultEveningPlans, defaultMorningPlans } from './plans';
import { dateKey } from '../lib/time';

export const DATA_VERSION = 1;

export const defaultSettings = (today = dateKey()): Settings => ({
  startDate: today,
  morningTime: '07:00',
  restSec: 60,
  transitionSec: 15,
  warmupMin: 5,
  cooldownMin: 5,
  hiitMinutes: 15,
  voiceOn: true,
  beepOn: true,
  vibrateOn: true,
  eatStart: '15:30',
  eatEnd: '23:30',
  proteinMin: 135,
  proteinMax: 160,
  waterTargetMl: 3000,
  saturdayFirst: 'chest',
  progressionBonus: 0,
  rules: {
    lookbackDays: 14,
    minCompletionRate: 0.8,
    minAvgSleep: 6,
    maxAvgSoreness: 5,
    minEnergy: 3,
    minWeekToProgress: 3,
    maxBonusReps: 8,
    bonusStep: 1,
    progressionDays: [2, 5],
    deloadWeek13: true,
    deloadRounds: 3,
  },
});

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function createDefaultData(today = dateKey()): AppData {
  return {
    version: DATA_VERSION,
    settings: defaultSettings(today),
    exercises: clone(defaultExercises),
    morningPlans: clone(defaultMorningPlans),
    eveningPlans: clone(defaultEveningPlans),
    dailyLogs: {},
    workoutLogs: [],
    nutrition: {},
  };
}
