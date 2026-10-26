// 備份與還原：JSON（完整資料）、CSV（每日紀錄／訓練組數）
import type { AppData, DailyLog, WorkoutLog, SetRecord } from '../types';
import { createDefaultData, DATA_VERSION } from '../data/defaults';

export function exportJSON(data: AppData): string {
  return JSON.stringify({ app: 'one-punch-trainer', exportedAt: new Date().toISOString(), ...data }, null, 2);
}

/** 解析 JSON 備份並補上缺少的欄位；格式錯誤時丟出中文錯誤 */
export function parseBackup(text: string): AppData {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('檔案不是有效的 JSON');
  }
  if (!raw || typeof raw !== 'object' || !raw.settings || !Array.isArray(raw.workoutLogs)) throw new Error('不是 ONE PUNCH TRAINER 的備份檔');
  if (typeof raw.version === 'number' && raw.version > DATA_VERSION) throw new Error('備份檔版本比 App 新，請先更新 App');
  const base = createDefaultData(raw.settings.startDate);
  return {
    version: DATA_VERSION,
    settings: { ...base.settings, ...raw.settings, rules: { ...base.settings.rules, ...(raw.settings.rules ?? {}) } },
    exercises: Array.isArray(raw.exercises) && raw.exercises.length ? raw.exercises : base.exercises,
    morningPlans: Array.isArray(raw.morningPlans) && raw.morningPlans.length === 7 ? raw.morningPlans : base.morningPlans,
    eveningPlans: Array.isArray(raw.eveningPlans) && raw.eveningPlans.length === 7 ? raw.eveningPlans : base.eveningPlans,
    dailyLogs: raw.dailyLogs ?? {},
    workoutLogs: raw.workoutLogs,
    nutrition: raw.nutrition ?? {},
  };
}

// ===== CSV =====
function esc(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(header: string[], rows: unknown[][]): string {
  return [header.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((x) => x !== ''));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}

const num = (s: string | undefined) => (s == null || s === '' ? undefined : Number(s));

const DAILY_HEADER = ['date', 'weight_kg', 'waist_cm', 'sleep_hours', 'energy', 'soreness', 'note'];

export function dailyToCSV(daily: Record<string, DailyLog>): string {
  const rows = Object.values(daily)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((d) => [d.dateKey, d.weightKg, d.waistCm, d.sleepHours ?? d.checkIn?.sleepHours, d.energy ?? d.checkIn?.energy, d.soreness ?? d.checkIn?.soreness, d.note]);
  return toCSV(DAILY_HEADER, rows);
}

export function importDailyCSV(text: string, daily: Record<string, DailyLog>): Record<string, DailyLog> {
  const out = { ...daily };
  for (const r of parseCSV(text)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '')) continue;
    const prev = out[r.date] ?? { dateKey: r.date };
    out[r.date] = {
      ...prev,
      weightKg: num(r.weight_kg) ?? prev.weightKg,
      waistCm: num(r.waist_cm) ?? prev.waistCm,
      sleepHours: num(r.sleep_hours) ?? prev.sleepHours,
      energy: num(r.energy) ?? prev.energy,
      soreness: num(r.soreness) ?? prev.soreness,
      note: r.note || prev.note,
    };
  }
  return out;
}

const SETS_HEADER = ['session_id', 'date', 'kind', 'title', 'variant', 'started_at', 'ended_at', 'active_ms', 'ended_early', 'planned_sets', 'hiit_done', 'hiit_min', 'step_id', 'exercise_id', 'round', 'side', 'target', 'status', 'actual', 'unit', 'weight_kg'];

export function workoutsToCSV(logs: WorkoutLog[]): string {
  const rows: unknown[][] = [];
  for (const l of logs) {
    const head = [l.id, l.dateKey, l.kind, l.title, l.variant ?? '', l.startedAt, l.endedAt, l.activeMs, l.endedEarly ? 1 : 0, l.plannedSets, l.hiit ? (l.hiit.done ? 1 : 0) : '', l.hiit?.minutes ?? ''];
    if (!l.sets.length) rows.push([...head, '', '', '', '', '', '', '', '', '']);
    for (const s of l.sets) rows.push([...head, s.stepId, s.exerciseId, s.round, s.side ?? '', s.targetText, s.status, s.actual ?? '', s.unit, s.weightKg ?? '']);
  }
  return toCSV(SETS_HEADER, rows);
}

/** 匯入訓練 CSV；相同 session_id 會覆蓋 */
export function importWorkoutsCSV(text: string, logs: WorkoutLog[]): WorkoutLog[] {
  const map = new Map<string, WorkoutLog>();
  for (const r of parseCSV(text)) {
    if (!r.session_id) continue;
    let l = map.get(r.session_id);
    if (!l) {
      l = {
        id: r.session_id, dateKey: r.date, kind: r.kind === 'evening' ? 'evening' : 'morning', title: r.title,
        variant: (r.variant || undefined) as WorkoutLog['variant'], startedAt: Number(r.started_at) || 0, endedAt: Number(r.ended_at) || 0,
        activeMs: Number(r.active_ms) || 0, endedEarly: r.ended_early === '1', plannedSets: Number(r.planned_sets) || 0, completedSets: 0, sets: [],
        hiit: r.hiit_done === '' ? undefined : { done: r.hiit_done === '1', minutes: num(r.hiit_min) },
      };
      map.set(r.session_id, l);
    }
    if (r.step_id) {
      const s: SetRecord = {
        stepId: r.step_id, exerciseId: r.exercise_id, round: Number(r.round) || 1, side: (r.side || undefined) as SetRecord['side'],
        targetText: r.target, status: r.status === 'done' ? 'done' : 'skipped', actual: num(r.actual), unit: r.unit === 'sec' ? 'sec' : 'reps', weightKg: num(r.weight_kg),
      };
      l.sets.push(s);
    }
  }
  for (const l of map.values()) l.completedSets = l.sets.filter((s) => s.status === 'done').length;
  const rest = logs.filter((l) => !map.has(l.id));
  return [...rest, ...map.values()].sort((a, b) => a.startedAt - b.startedAt);
}
