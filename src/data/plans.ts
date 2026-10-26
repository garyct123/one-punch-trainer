import type { EveningDayPlan, MorningDayPlan, PlanItem, Target, Weekday, GymItem } from '../types';

const reps = (min: number, max?: number, perSide = false): Target => ({ kind: 'reps', min, max, perSide });
const secs = (seconds: number, perSide = false): Target => ({ kind: 'time', seconds, perSide });
const item = (wd: number, i: number, exerciseId: string, target: Target, sets = 5): PlanItem => ({
  id: `m${wd}-${i}`, exerciseId, sets, target,
});

const LOW = 'HASfit 低強度跟練：動作放慢、幅度縮小，覺得喘就原地踏步。';
const ADAPT = 'HASfit 依睡眠與恢復調整：狀態好照影片節奏，睡不好就降為低強度。';

const recovery = (wd: Weekday): MorningDayPlan => ({
  weekday: wd, title: '恢復版', variant: 'recovery', rounds: 5, hiitIntensity: 'low', hiitNote: LOW,
  items: [item(wd, 1, 'wall-pushup', reps(5)), item(wd, 2, 'chair-squat', reps(8)), item(wd, 3, 'dead-bug', reps(4, undefined, true))],
});

/** 星期日=0 … 星期六=6 */
export const defaultMorningPlans: MorningDayPlan[] = [
  {
    weekday: 0, title: '輕量版', variant: 'light', rounds: 5, hiitIntensity: 'low', hiitNote: LOW,
    items: [item(0, 1, 'incline-pushup', reps(5, 8)), item(0, 2, 'squat', reps(8)), item(0, 3, 'dead-bug', reps(5, undefined, true))],
  },
  recovery(1),
  {
    weekday: 2, title: '標準版', variant: 'standard', rounds: 5, hiitIntensity: 'adaptive', hiitNote: ADAPT,
    items: [item(2, 1, 'pushup', reps(8, 12)), item(2, 2, 'squat', reps(12, 15)), item(2, 3, 'reverse-crunch', reps(8))],
  },
  {
    weekday: 3, title: '輕量版', variant: 'light', rounds: 5, hiitIntensity: 'low', hiitNote: LOW,
    items: [item(3, 1, 'incline-pushup', reps(6)), item(3, 2, 'squat', reps(8)), item(3, 3, 'plank', secs(15))],
  },
  recovery(4),
  {
    weekday: 5, title: '強化版', variant: 'strong', rounds: 5, hiitIntensity: 'adaptive', hiitNote: ADAPT,
    items: [item(5, 1, 'pushup', reps(10, 15)), item(5, 2, 'squat', reps(15, 20)), item(5, 3, 'reverse-crunch', reps(10))],
  },
  {
    weekday: 6, title: '輕量版', variant: 'light', rounds: 5, hiitIntensity: 'low', hiitNote: LOW,
    items: [item(6, 1, 'incline-pushup', reps(6, 8)), item(6, 2, 'squat', reps(10)), item(6, 3, 'side-plank', secs(15, true))],
  },
];

/** 睡眠不足或疲勞時使用的恢復版（與星期一相同內容） */
export const recoveryTemplate = (wd: Weekday): MorningDayPlan => ({ ...recovery(wd), title: '恢復版（依今日狀態調整）' });

const g = (wd: number, i: number, exerciseId: string, sets: number, repsMin: number, repsMax?: number, extra: Partial<GymItem> = {}): GymItem => ({
  id: `e${wd}-${i}`, exerciseId, sets, repsMin, repsMax, restSec: 90, ...extra,
});

const stretchDay = (wd: Weekday): EveningDayPlan => ({
  weekday: wd, kind: 'stretch', block: { title: '全身伸展', items: [], stretchMin: 30 },
});

export const defaultEveningPlans: EveningDayPlan[] = [
  {
    weekday: 0, kind: 'strength',
    block: {
      title: '腿 B', cardio: { min: 10, max: 15 },
      items: [g(0, 1, 'rdl', 3, 8, 10, { restSec: 120 }), g(0, 2, 'hip-thrust', 2, 10, 12), g(0, 3, 'leg-extension', 2, 12, 15, { restSec: 60 }), g(0, 4, 'calf-raise', 2, 15, undefined, { restSec: 60 })],
    },
  },
  stretchDay(1),
  {
    weekday: 2, kind: 'strength',
    block: {
      title: '胸', cardio: { min: 10, max: 20 },
      items: [g(2, 1, 'bench-press', 3, 8, 10, { restSec: 120 }), g(2, 2, 'incline-db-press', 2, 10, 12), g(2, 3, 'cable-fly', 2, 12, 15, { restSec: 60 }), g(2, 4, 'triceps-pushdown', 2, 10, 12, { restSec: 60 })],
    },
  },
  {
    weekday: 3, kind: 'strength',
    block: {
      title: '腿 A', cardio: { min: 10, max: 15 },
      items: [g(3, 1, 'leg-press', 3, 8, 12, { restSec: 120 }), g(3, 2, 'split-squat', 2, 8, 10, { perSide: true }), g(3, 3, 'leg-curl', 2, 12, undefined, { restSec: 60 }), g(3, 4, 'calf-raise', 2, 15, undefined, { restSec: 60 })],
    },
  },
  stretchDay(4),
  {
    weekday: 5, kind: 'strength',
    block: {
      title: '背', cardio: { min: 10, max: 20 },
      items: [g(5, 1, 'lat-pulldown', 3, 8, 12, { restSec: 120 }), g(5, 2, 'seated-row', 3, 10, 12), g(5, 3, 'face-pull', 2, 12, 15, { restSec: 60 }), g(5, 4, 'biceps-curl', 2, 10, 12, { restSec: 60 })],
    },
  },
  {
    weekday: 6, kind: 'rotation',
    block: { title: '胸／背隔週輪替', items: [] },
    rotation: {
      chest: {
        title: '胸部週（輔助）', cardio: { min: 10, max: 20 },
        items: [g(6, 1, 'incline-db-press', 3, 10, 12), g(6, 2, 'cable-fly', 3, 12, 15, { restSec: 60 })],
      },
      back: {
        title: '背部週（輕重量，不做高強度第二訓）', cardio: { min: 10, max: 20 },
        items: [g(6, 3, 'seated-row', 2, 12, 15, { restSec: 60 }), g(6, 4, 'reverse-fly', 2, 12, 15, { restSec: 60 })],
      },
    },
  },
];

export const WARMUP_MOVES = ['原地踏步＋擺臂', '手臂畫圈（前後）', '髖關節畫圈', '前後擺腿（扶牆）', '軀幹轉體＋徒手早安式'];
export const COOLDOWN_MOVES = ['慢走調整呼吸', '胸大肌門框伸展', '股四頭肌站姿伸展', '腿後肌坐姿前彎', '貓牛式＋嬰兒式'];
