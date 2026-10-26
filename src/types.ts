// ===== 共用資料模型 =====

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = 星期日

export type ExerciseCategory = 'push' | 'squat' | 'core' | 'chest' | 'back' | 'arms' | 'legs' | 'stretch' | 'cardio';

/** verified：已驗證直達影片；search：YouTube 搜尋連結（未驗證）；custom：使用者自訂 */
export type VideoStatus = 'verified' | 'search' | 'custom';

export interface Exercise {
  id: string;
  nameZh: string;
  nameEn: string;
  category: ExerciseCategory;
  muscles: string[];
  videoUrl: string;
  videoStatus: VideoStatus;
  defaultSets: number;
  defaultTarget: string;
  cues: string[];
  mistakes: string[];
  easier: string;
  harder: string;
}

export type Target =
  | { kind: 'reps'; min: number; max?: number; perSide?: boolean }
  | { kind: 'time'; seconds: number; perSide?: boolean };

export interface PlanItem {
  id: string;
  exerciseId: string;
  sets: number;
  target: Target;
}

export type MorningVariant = 'recovery' | 'standard' | 'light' | 'strong';

export interface MorningDayPlan {
  weekday: Weekday;
  title: string;
  variant: MorningVariant;
  rounds: number;
  items: PlanItem[];
  hiitIntensity: 'low' | 'adaptive';
  hiitNote: string;
}

export interface GymItem {
  id: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax?: number;
  perSide?: boolean;
  weightKg?: number;
  restSec: number;
}

export interface GymBlock {
  title: string;
  items: GymItem[];
  cardio?: { min: number; max: number };
  stretchMin?: number;
}

export interface EveningDayPlan {
  weekday: Weekday;
  kind: 'stretch' | 'strength' | 'rotation';
  block: GymBlock;
  /** 只有星期六：胸／背隔週輪替 */
  rotation?: { chest: GymBlock; back: GymBlock };
}

export interface ProgressionRules {
  lookbackDays: number;
  minCompletionRate: number; // 0–1
  minAvgSleep: number;
  maxAvgSoreness: number;
  minEnergy: number;
  minWeekToProgress: number;
  maxBonusReps: number;
  bonusStep: number;
  progressionDays: Weekday[];
  deloadWeek13: boolean;
  deloadRounds: number;
}

export interface Settings {
  startDate: string; // YYYY-MM-DD（Day 1）
  morningTime: string; // "07:00"
  restSec: number; // 每輪之間休息
  transitionSec: number; // 同一輪動作之間的轉換時間
  warmupMin: number;
  cooldownMin: number;
  hiitMinutes: number;
  voiceOn: boolean;
  beepOn: boolean;
  vibrateOn: boolean;
  eatStart: string;
  eatEnd: string;
  proteinMin: number;
  proteinMax: number;
  waterTargetMl: number;
  saturdayFirst: 'chest' | 'back';
  progressionBonus: number; // 使用者確認後套用的加次數
  rules: ProgressionRules;
  heightCm?: number;
  onboarded?: boolean;
  weightKg?: number;
}

export interface CheckIn {
  sleepHours: number;
  energy: number; // 1–5
  soreness: number; // 0–10
  redFlags: boolean;
  at: number;
}

export interface GymRecord {
  id: string;
  exerciseId: string;
  weightKg: number;
  sets: number;
  reps: number;
}

export interface DailyLog {
  dateKey: string;
  weightKg?: number;
  waistCm?: number;
  sleepHours?: number;
  energy?: number;
  soreness?: number;
  checkIn?: CheckIn;
  gym?: GymRecord[];
  note?: string;
}

export interface SetRecord {
  stepId: string;
  exerciseId: string;
  round: number;
  side?: 'L' | 'R';
  targetText: string;
  status: 'done' | 'skipped';
  actual?: number; // 次數或秒數
  unit: 'reps' | 'sec';
  weightKg?: number;
}

export interface WorkoutLog {
  id: string;
  dateKey: string;
  kind: 'morning' | 'evening';
  title: string;
  variant?: MorningVariant;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  endedEarly: boolean;
  plannedSets: number;
  completedSets: number;
  sets: SetRecord[];
  hiit?: { done: boolean; minutes?: number };
  warmupDone?: boolean;
  cooldownDone?: boolean;
}

export interface Meal {
  id: string;
  time: string;
  name: string;
  proteinG: number;
}

export interface NutritionDay {
  dateKey: string;
  waterMl: number;
  meals: Meal[];
}

export interface AppData {
  version: number;
  settings: Settings;
  exercises: Exercise[];
  morningPlans: MorningDayPlan[];
  eveningPlans: EveningDayPlan[];
  dailyLogs: Record<string, DailyLog>;
  workoutLogs: WorkoutLog[];
  nutrition: Record<string, NutritionDay>;
}
