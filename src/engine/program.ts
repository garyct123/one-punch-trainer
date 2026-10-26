// 90 天計畫：Day/Week、階段、星期六輪替、每日菜單選擇、進階建議
import type { AppData, CheckIn, DailyLog, EveningDayPlan, GymBlock, MorningDayPlan, Settings, Target, WorkoutLog, ProgressionRules, Exercise } from '../types';
import { addDays, daysBetween, weekdayOf } from '../lib/time';
import { recoveryTemplate } from '../data/plans';
import { clone } from '../data/defaults';

export interface ProgramDay {
  day: number; // 1 起算；<=0 表示尚未開始
  week: number;
  started: boolean;
  finished: boolean; // 超過 90 天
}

export function programDay(startDate: string, today: string): ProgramDay {
  const day = daysBetween(startDate, today) + 1;
  const week = day >= 1 ? Math.floor((day - 1) / 7) + 1 : 0;
  return { day, week, started: day >= 1, finished: day > 90 };
}

export interface Phase {
  id: number;
  fromWeek: number;
  toWeek: number;
  title: string;
  goals: string[];
}

export const PHASES: Phase[] = [
  { id: 1, fromWeek: 1, toWeek: 2, title: '熟悉期', goals: ['使用目前五組菜單', '熟悉每個動作的正確姿勢', '建立早上 07:00 訓練習慣'] },
  { id: 2, fromWeek: 3, toWeek: 4, title: '微幅進階', goals: ['姿勢、恢復與完成度良好時，週二與週五每組 +1–2 下', '保持睡眠紀錄'] },
  { id: 3, fromWeek: 5, toWeek: 8, title: '漸進增量', goals: ['逐步提升標準伏地挺身與深蹲次數', 'HIIT 依恢復情況提高強度'] },
  { id: 4, fromWeek: 9, toWeek: 12, title: '強化挑戰', goals: ['強化日挑戰每組 15–20 下伏地挺身', '每組 20 下深蹲'] },
  { id: 5, fromWeek: 13, toWeek: 13, title: '減量與檢測', goals: ['適當減量（預設 3 輪）', '檢查體重、腰圍、體能與恢復狀況'] },
];

export function phaseForWeek(week: number): Phase {
  if (week <= 1) return PHASES[0];
  return PHASES.find((p) => week >= p.fromWeek && week <= p.toWeek) ?? PHASES[PHASES.length - 1];
}

/** 星期六輪替：以開始日期後第一個星期六為 settings.saturdayFirst，之後隔週交替 */
export function saturdayRotation(startDate: string, date: string, first: 'chest' | 'back' = 'chest'): 'chest' | 'back' {
  const startWd = weekdayOf(startDate);
  const firstSat = addDays(startDate, (6 - startWd + 7) % 7);
  const weeks = Math.floor(daysBetween(firstSat, date) / 7);
  const even = ((weeks % 2) + 2) % 2 === 0;
  if (even) return first;
  return first === 'chest' ? 'back' : 'chest';
}

export function eveningBlockFor(data: AppData, date: string): { plan: EveningDayPlan; block: GymBlock; rotation?: 'chest' | 'back' } {
  const wd = weekdayOf(date);
  const plan = data.eveningPlans.find((p) => p.weekday === wd)!;
  if (plan.kind === 'rotation' && plan.rotation) {
    const r = saturdayRotation(data.settings.startDate, date, data.settings.saturdayFirst);
    return { plan, block: plan.rotation[r], rotation: r };
  }
  return { plan, block: plan.block };
}

// ===== 恢復檢查 =====
export type Readiness = 'stop' | 'recovery' | 'normal';

export interface ReadinessResult {
  level: Readiness;
  reasons: string[];
  allowHighIntensityHiit: boolean;
}

export function assessReadiness(c: Pick<CheckIn, 'sleepHours' | 'energy' | 'soreness' | 'redFlags'>): ReadinessResult {
  if (c.redFlags) {
    return {
      level: 'stop',
      reasons: ['你回報了頭暈、胸痛或明顯身體不適。今天請停止運動；如有胸痛、暈厥感或異常喘不過氣，請立即就醫或撥打 119。'],
      allowHighIntensityHiit: false,
    };
  }
  const reasons: string[] = [];
  if (c.sleepHours < 6) reasons.push(`昨晚只睡 ${c.sleepHours} 小時（少於 6 小時）`);
  if (c.energy <= 2) reasons.push(`精神程度 ${c.energy}/5 偏低`);
  if (c.soreness >= 7) reasons.push(`肌肉痠痛 ${c.soreness}/10 偏高`);
  if (reasons.length) return { level: 'recovery', reasons, allowHighIntensityHiit: false };
  return { level: 'normal', reasons: [], allowHighIntensityHiit: true };
}

// ===== 每日早晨菜單 =====
export interface MorningOptions {
  readiness?: Readiness;
  useRecommended?: boolean; // 預設 true：狀態差時改用恢復版
}

function bumpTarget(t: Target, bonus: number): Target {
  if (t.kind !== 'reps' || bonus <= 0) return t;
  return { ...t, min: t.min + bonus, max: t.max != null ? t.max + bonus : undefined };
}

export function morningPlanFor(data: AppData, date: string, opts: MorningOptions = {}): MorningDayPlan {
  const { settings } = data;
  const wd = weekdayOf(date);
  const useRec = opts.useRecommended ?? true;
  if (opts.readiness === 'recovery' && useRec) return recoveryTemplate(wd);

  const base = clone(data.morningPlans.find((p) => p.weekday === wd)!);
  const pd = programDay(settings.startDate, date);
  const exMap = new Map(data.exercises.map((e) => [e.id, e]));

  // 使用者確認過的加次數，只套用到設定的進階日（預設週二、週五）的推／蹲動作
  if (settings.rules.progressionDays.includes(wd) && settings.progressionBonus > 0) {
    base.items = base.items.map((it) => {
      const cat = exMap.get(it.exerciseId)?.category;
      return cat === 'push' || cat === 'squat' ? { ...it, target: bumpTarget(it.target, settings.progressionBonus) } : it;
    });
  }
  // 第 13 週減量
  if (pd.week === 13 && settings.rules.deloadWeek13) {
    base.rounds = Math.min(base.rounds, settings.rules.deloadRounds);
    base.title += '（第 13 週減量）';
  }
  return base;
}

// ===== 進階建議（不會自動套用，需使用者確認） =====
export interface ProgressionAdvice {
  eligible: boolean;
  reasons: string[];
  stats: { completionRate: number; avgSleep: number | null; avgSoreness: number | null; avgEnergy: number | null; sessions: number };
  suggestedBonus: number;
}

export function completionOf(log: WorkoutLog): number {
  return log.plannedSets > 0 ? log.completedSets / log.plannedSets : 0;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function evaluateProgression(
  settings: Settings,
  logs: WorkoutLog[],
  daily: Record<string, DailyLog>,
  today: string,
  rules: ProgressionRules = settings.rules,
): ProgressionAdvice {
  const pd = programDay(settings.startDate, today);
  const from = addDays(today, -rules.lookbackDays + 1);
  const inRange = (k: string) => k >= from && k <= today;
  const morning = logs.filter((l) => l.kind === 'morning' && inRange(l.dateKey));
  const planned = morning.reduce((a, l) => a + l.plannedSets, 0);
  const done = morning.reduce((a, l) => a + l.completedSets, 0);
  // 回顧期間內「應訓練天數」：以已經過的天數計（最多 lookbackDays）
  const elapsed = Math.max(1, Math.min(rules.lookbackDays, pd.day));
  const daysTrained = new Set(morning.filter((l) => completionOf(l) >= 0.5).map((l) => l.dateKey)).size;
  const setRate = planned > 0 ? done / planned : 0;
  const completionRate = Math.min(setRate, daysTrained / elapsed);

  const days = Object.values(daily).filter((d) => inRange(d.dateKey));
  const sleep = avg(days.map((d) => d.sleepHours ?? d.checkIn?.sleepHours).filter((x): x is number => x != null));
  const sore = avg(days.map((d) => d.soreness ?? d.checkIn?.soreness).filter((x): x is number => x != null));
  const energy = avg(days.map((d) => d.energy ?? d.checkIn?.energy).filter((x): x is number => x != null));
  const redFlag = days.some((d) => d.checkIn?.redFlags);

  const reasons: string[] = [];
  if (pd.week < rules.minWeekToProgress) reasons.push(`目前第 ${Math.max(pd.week, 0)} 週，第 ${rules.minWeekToProgress} 週起才評估升級`);
  if (pd.week >= 13) reasons.push('第 13 週為減量檢測週，不升級');
  if (completionRate < rules.minCompletionRate) reasons.push(`近 ${rules.lookbackDays} 天完成率 ${Math.round(completionRate * 100)}%，未達 ${Math.round(rules.minCompletionRate * 100)}%`);
  if (sleep == null) reasons.push('沒有睡眠紀錄');
  else if (sleep < rules.minAvgSleep) reasons.push(`平均睡眠 ${sleep.toFixed(1)} 小時，低於 ${rules.minAvgSleep}`);
  if (sore != null && sore > rules.maxAvgSoreness) reasons.push(`平均痠痛 ${sore.toFixed(1)}，高於 ${rules.maxAvgSoreness}`);
  if (energy != null && energy < rules.minEnergy) reasons.push(`平均精神 ${energy.toFixed(1)}，低於 ${rules.minEnergy}`);
  if (redFlag) reasons.push('期間內曾回報身體不適');
  if (settings.progressionBonus >= rules.maxBonusReps) reasons.push(`已達加次數上限 +${rules.maxBonusReps}`);

  const eligible = reasons.length === 0;
  return {
    eligible,
    reasons,
    stats: { completionRate, avgSleep: sleep, avgSoreness: sore, avgEnergy: energy, sessions: morning.length },
    suggestedBonus: eligible ? Math.min(rules.maxBonusReps, settings.progressionBonus + rules.bonusStep) : settings.progressionBonus,
  };
}

// ===== 顯示用 =====
export function targetText(t: Target): string {
  const side = t.perSide ? '每側 ' : '';
  if (t.kind === 'time') return `${side}${t.seconds} 秒`;
  return `${side}${t.min}${t.max != null && t.max !== t.min ? `–${t.max}` : ''} 下`;
}

export function targetSpeech(t: Target): string {
  const side = t.perSide ? '每側' : '';
  if (t.kind === 'time') return `${side}${t.seconds}秒`;
  return `${side}${t.min}${t.max != null && t.max !== t.min ? `到${t.max}` : ''}下`;
}

export function exName(exs: Exercise[], id: string): string {
  return exs.find((e) => e.id === id)?.nameZh ?? id;
}
