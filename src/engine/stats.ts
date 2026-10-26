import type { WorkoutLog, DailyLog, Exercise } from '../types';
import { addDays, mondayOf, daysBetween } from '../lib/time';
import { completionOf } from './program';

/** 一天算「完成」：當天有早晨訓練且完成 ≥ 80% 組數 */
export function dayCompleted(logs: WorkoutLog[], key: string, threshold = 0.8): boolean {
  return logs.some((l) => l.kind === 'morning' && l.dateKey === key && completionOf(l) >= threshold);
}

export interface WeekStats {
  monday: string;
  completedDays: number;
  elapsedDays: number;
  rate: number;
}

/** 本週（週一到週日）完成率；分母為本週已經過的天數 */
export function weekStats(logs: WorkoutLog[], today: string, startDate?: string): WeekStats {
  const monday = mondayOf(today);
  let completed = 0;
  let elapsed = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(monday, i);
    if (k > today) break;
    if (startDate && k < startDate) continue;
    elapsed++;
    if (dayCompleted(logs, k)) completed++;
  }
  return { monday, completedDays: completed, elapsedDays: elapsed, rate: elapsed ? completed / elapsed : 0 };
}

export function weeklyRates(logs: WorkoutLog[], today: string, weeks = 8, startDate?: string) {
  const out: { label: string; value: number }[] = [];
  const thisMon = mondayOf(today);
  for (let w = weeks - 1; w >= 0; w--) {
    const mon = addDays(thisMon, -7 * w);
    const end = w === 0 ? today : addDays(mon, 6);
    if (startDate && end < startDate) continue;
    const s = weekStats(logs, end, startDate);
    out.push({ label: mon.slice(5), value: s.rate });
  }
  return out;
}

/** 某次訓練某類動作的總次數 */
export function totalReps(log: WorkoutLog, exercises: Exercise[], category: Exercise['category']): number {
  const cat = new Map(exercises.map((e) => [e.id, e.category]));
  return log.sets.filter((s) => s.status === 'done' && s.unit === 'reps' && cat.get(s.exerciseId) === category).reduce((a, s) => a + (s.actual ?? 0), 0);
}

export function avgSleep(daily: Record<string, DailyLog>, today: string, days = 7): number | null {
  const xs: number[] = [];
  for (const d of Object.values(daily)) {
    const diff = daysBetween(d.dateKey, today);
    const v = d.sleepHours ?? d.checkIn?.sleepHours;
    if (diff >= 0 && diff < days && v != null) xs.push(v);
  }
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
