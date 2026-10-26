// Guided Workout Engine：純函式狀態機，所有時間由時間戳計算（不累加 setInterval）
import type { Exercise, GymBlock, MorningDayPlan, MorningVariant, SetRecord, Settings, Target, WorkoutLog } from '../types';
import { COOLDOWN_MOVES, WARMUP_MOVES } from '../data/plans';
import { targetText } from './program';

export type Step =
  | { kind: 'block'; id: string; section: 'warmup' | 'cooldown' | 'stretch' | 'cardio'; title: string; seconds: number; moves: string[]; exerciseId?: string }
  | { kind: 'set'; id: string; section: 'circuit' | 'gym'; exerciseId: string; round: number; totalRounds: number; target: Target; side?: 'L' | 'R'; weightKg?: number; restAfter?: number }
  | { kind: 'rest'; id: string; seconds: number; label: string }
  | { kind: 'hiit'; id: string; minutes: number; note: string; lowOnly: boolean };

export interface StepResult {
  status: 'done' | 'skipped';
  actual?: number;
  weightKg?: number;
  at: number;
}

export interface Session {
  id: string;
  kind: 'morning' | 'evening';
  dateKey: string;
  title: string;
  variant?: MorningVariant;
  steps: Step[];
  index: number;
  status: 'ready' | 'running' | 'paused' | 'finished';
  startedAt: number | null;
  stepStartedAt: number | null;
  pausedAt: number | null;
  stepPausedMs: number;
  totalPausedMs: number;
  results: Record<string, StepResult>;
  endedEarly: boolean;
  endedAt: number | null;
}

export type Action =
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'complete'; now: number; actual?: number; weightKg?: number }
  | { type: 'skip'; now: number }
  | { type: 'back'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'finish'; now: number; early: boolean }
  | { type: 'editResult'; stepId: string; actual?: number; weightKg?: number; status?: 'done' | 'skipped' };

// ===== 建立步驟 =====
export function buildMorningSteps(plan: MorningDayPlan, settings: Settings, opts: { lowOnlyHiit?: boolean; includeHiit?: boolean } = {}): Step[] {
  const steps: Step[] = [];
  steps.push({ kind: 'block', id: 'warmup', section: 'warmup', title: '動態暖身', seconds: settings.warmupMin * 60, moves: WARMUP_MOVES });
  const rounds = plan.rounds;
  for (let r = 1; r <= rounds; r++) {
    const roundSets: Step[] = [];
    for (const it of plan.items) {
      if (r > it.sets) continue;
      if (it.target.kind === 'time' && it.target.perSide) {
        for (const side of ['L', 'R'] as const) {
          roundSets.push({ kind: 'set', id: `${it.id}-r${r}-${side}`, section: 'circuit', exerciseId: it.exerciseId, round: r, totalRounds: Math.min(rounds, it.sets), target: it.target, side });
        }
      } else {
        roundSets.push({ kind: 'set', id: `${it.id}-r${r}`, section: 'circuit', exerciseId: it.exerciseId, round: r, totalRounds: Math.min(rounds, it.sets), target: it.target });
      }
    }
    roundSets.forEach((s, i) => {
      steps.push(s);
      const lastInRound = i === roundSets.length - 1;
      if (!lastInRound && settings.transitionSec > 0) steps.push({ kind: 'rest', id: `${s.id}-tr`, seconds: settings.transitionSec, label: '換下一個動作' });
      if (lastInRound && r < rounds) steps.push({ kind: 'rest', id: `round${r}-rest`, seconds: settings.restSec, label: `第 ${r} 輪完成，休息` });
    });
  }
  if (opts.includeHiit !== false) {
    steps.push({ kind: 'hiit', id: 'hiit', minutes: settings.hiitMinutes, note: plan.hiitNote, lowOnly: !!opts.lowOnlyHiit || plan.hiitIntensity === 'low' });
  }
  steps.push({ kind: 'block', id: 'cooldown', section: 'cooldown', title: '緩和與伸展', seconds: settings.cooldownMin * 60, moves: COOLDOWN_MOVES });
  return steps;
}

export function buildEveningSteps(block: GymBlock, settings: Settings): Step[] {
  const steps: Step[] = [];
  if (block.stretchMin) {
    steps.push({ kind: 'block', id: 'stretch', section: 'stretch', title: `全身伸展 ${block.stretchMin} 分鐘`, seconds: block.stretchMin * 60, moves: [...WARMUP_MOVES, ...COOLDOWN_MOVES], exerciseId: 'full-stretch' });
    return steps;
  }
  steps.push({ kind: 'block', id: 'warmup', section: 'warmup', title: '熱身', seconds: settings.warmupMin * 60, moves: WARMUP_MOVES });
  block.items.forEach((it, idx) => {
    for (let s = 1; s <= it.sets; s++) {
      const target: Target = { kind: 'reps', min: it.repsMin, max: it.repsMax, perSide: it.perSide };
      steps.push({ kind: 'set', id: `${it.id}-s${s}`, section: 'gym', exerciseId: it.exerciseId, round: s, totalRounds: it.sets, target, weightKg: it.weightKg, restAfter: it.restSec });
      const last = idx === block.items.length - 1 && s === it.sets;
      if (!last) steps.push({ kind: 'rest', id: `${it.id}-s${s}-rest`, seconds: it.restSec, label: s === it.sets ? '換下一個動作' : '組間休息' });
    }
  });
  if (block.cardio) {
    steps.push({ kind: 'block', id: 'cardio', section: 'cardio', title: `有氧 ${block.cardio.min}–${block.cardio.max} 分鐘`, seconds: block.cardio.min * 60, moves: ['飛輪、跑步機坡度快走或橢圓機', '可說話但有點喘的強度'], exerciseId: 'cardio' });
  }
  steps.push({ kind: 'block', id: 'cooldown', section: 'cooldown', title: '緩和與伸展', seconds: settings.cooldownMin * 60, moves: COOLDOWN_MOVES });
  return steps;
}

export function createSession(p: { id: string; kind: Session['kind']; dateKey: string; title: string; variant?: MorningVariant; steps: Step[] }): Session {
  return { ...p, index: 0, status: 'ready', startedAt: null, stepStartedAt: null, pausedAt: null, stepPausedMs: 0, totalPausedMs: 0, results: {}, endedEarly: false, endedAt: null };
}

// ===== 時間計算 =====
export function stepElapsedMs(s: Session, now: number): number {
  if (s.stepStartedAt == null) return 0;
  const end = s.pausedAt ?? (s.status === 'finished' ? s.endedAt ?? now : now);
  return Math.max(0, end - s.stepStartedAt - s.stepPausedMs);
}

export function totalElapsedMs(s: Session, now: number): number {
  if (s.startedAt == null) return 0;
  const end = s.status === 'finished' ? s.endedAt ?? now : now;
  const pausing = s.pausedAt != null ? end - s.pausedAt : 0;
  return Math.max(0, end - s.startedAt - s.totalPausedMs - pausing);
}

export function stepDurationSec(step: Step): number {
  switch (step.kind) {
    case 'block':
    case 'rest':
      return step.seconds;
    case 'hiit':
      return step.minutes * 60;
    case 'set': {
      const t = step.target;
      const mult = t.perSide && t.kind === 'reps' ? 2 : 1;
      return t.kind === 'time' ? t.seconds + 5 : ((t.max ?? t.min) * 3 + 5) * mult;
    }
  }
}

/** 計時型步驟剩餘秒數（休息、暖身、計時動作）；次數動作回傳 null */
export function stepRemainingSec(s: Session, now: number): number | null {
  const step = s.steps[s.index];
  if (!step) return null;
  const total = step.kind === 'rest' || step.kind === 'block' ? step.seconds : step.kind === 'set' && step.target.kind === 'time' ? step.target.seconds : null;
  if (total == null) return null;
  return total - stepElapsedMs(s, now) / 1000;
}

export function estimateRemainingSec(s: Session, now: number): number {
  if (s.status === 'finished') return 0;
  let sum = 0;
  for (let i = s.index + 1; i < s.steps.length; i++) sum += stepDurationSec(s.steps[i]);
  const cur = s.steps[s.index];
  if (cur) sum += Math.max(0, stepDurationSec(cur) - stepElapsedMs(s, now) / 1000);
  return sum;
}

export function estimateTotalSec(steps: Step[]): number {
  return steps.reduce((a, st) => a + stepDurationSec(st), 0);
}

// ===== 狀態轉移 =====
function foldPause(s: Session, now: number): Session {
  if (s.pausedAt == null) return s;
  const d = now - s.pausedAt;
  return { ...s, pausedAt: null, stepPausedMs: s.stepPausedMs + d, totalPausedMs: s.totalPausedMs + d, status: s.status === 'paused' ? 'running' : s.status };
}

function goTo(s: Session, index: number, now: number): Session {
  if (index >= s.steps.length) return { ...s, index: s.steps.length - 1, status: 'finished', endedAt: now, endedEarly: false };
  return { ...s, index, stepStartedAt: now, stepPausedMs: 0, status: 'running' };
}

export function reduce(s: Session, a: Action): Session {
  switch (a.type) {
    case 'start':
      if (s.status !== 'ready') return s;
      return { ...s, status: 'running', startedAt: a.now, stepStartedAt: a.now };
    case 'pause':
      if (s.status !== 'running') return s;
      return { ...s, status: 'paused', pausedAt: a.now };
    case 'resume':
      if (s.status !== 'paused') return s;
      return foldPause(s, a.now);
    case 'complete':
    case 'skip': {
      if (s.status === 'ready' || s.status === 'finished') return s;
      const t = foldPause(s, a.now);
      const step = t.steps[t.index];
      const results = { ...t.results };
      if (step.kind !== 'rest') {
        results[step.id] = a.type === 'complete'
          ? { status: 'done', actual: a.actual, weightKg: a.weightKg, at: a.now }
          : { status: 'skipped', at: a.now };
      }
      return goTo({ ...t, results }, t.index + 1, a.now);
    }
    case 'back': {
      if (s.status === 'ready' || s.status === 'finished') return s;
      const t = foldPause(s, a.now);
      let i = t.index - 1;
      while (i > 0 && t.steps[i].kind === 'rest') i--;
      if (i < 0) i = 0;
      const results = { ...t.results };
      for (let j = i; j <= t.index; j++) delete results[t.steps[j].id];
      return { ...t, index: i, results, stepStartedAt: a.now, stepPausedMs: 0, status: 'running' };
    }
    case 'tick': {
      if (s.status !== 'running') return s;
      const step = s.steps[s.index];
      if (step?.kind === 'rest' && stepElapsedMs(s, a.now) >= step.seconds * 1000) {
        // 以休息「應結束的時間點」作為下一步開始時間，避免切回 App 後時間被吃掉
        const endAt = Math.min(a.now, (s.stepStartedAt ?? a.now) + s.stepPausedMs + step.seconds * 1000);
        return goTo(s, s.index + 1, endAt);
      }
      return s;
    }
    case 'finish': {
      if (s.status === 'finished') return s;
      const t = s.status === 'ready' ? s : foldPause(s, a.now);
      return { ...t, status: 'finished', endedAt: a.now, endedEarly: a.early, startedAt: t.startedAt ?? a.now };
    }
    case 'editResult': {
      const prev = s.results[a.stepId];
      if (!prev) return s;
      return { ...s, results: { ...s.results, [a.stepId]: { ...prev, ...(a.actual !== undefined ? { actual: a.actual } : {}), ...(a.weightKg !== undefined ? { weightKg: a.weightKg } : {}), ...(a.status ? { status: a.status } : {}) } } };
    }
  }
}

/** 下一個非休息步驟（顯示「下一個動作」用） */
export function nextWorkStep(s: Session): Step | undefined {
  for (let i = s.index + 1; i < s.steps.length; i++) if (s.steps[i].kind !== 'rest') return s.steps[i];
  return undefined;
}

// ===== 轉成紀錄：只記錄使用者實際確認的結果 =====
export function sessionToLog(s: Session): WorkoutLog {
  const sets: SetRecord[] = [];
  let planned = 0;
  for (const st of s.steps) {
    if (st.kind !== 'set') continue;
    planned++;
    const r = s.results[st.id];
    if (!r) continue;
    sets.push({
      stepId: st.id, exerciseId: st.exerciseId, round: st.round, side: st.side, targetText: targetText(st.target),
      status: r.status, actual: r.status === 'done' ? r.actual : undefined, unit: st.target.kind === 'time' ? 'sec' : 'reps',
      weightKg: r.status === 'done' ? r.weightKg ?? st.weightKg : undefined,
    });
  }
  const hiitStep = s.steps.find((x) => x.kind === 'hiit');
  const hiitRes = hiitStep ? s.results[hiitStep.id] : undefined;
  return {
    id: s.id, dateKey: s.dateKey, kind: s.kind, title: s.title, variant: s.variant,
    startedAt: s.startedAt ?? s.endedAt ?? 0, endedAt: s.endedAt ?? 0,
    activeMs: totalElapsedMs(s, s.endedAt ?? 0), endedEarly: s.endedEarly,
    plannedSets: planned, completedSets: sets.filter((x) => x.status === 'done').length, sets,
    hiit: hiitStep ? { done: hiitRes?.status === 'done', minutes: hiitRes?.status === 'done' ? hiitRes.actual : undefined } : undefined,
    warmupDone: s.results['warmup']?.status === 'done',
    cooldownDone: s.results['cooldown']?.status === 'done',
  };
}

export function exerciseOf(exs: Exercise[], id: string): Exercise | undefined {
  return exs.find((e) => e.id === id);
}
