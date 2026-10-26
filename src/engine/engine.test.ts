import { describe, it, expect } from 'vitest';
import { createDefaultData } from '../data/defaults';
import { dateKey, weekdayOf, daysBetween, mondayOf } from '../lib/time';
import { programDay, phaseForWeek, saturdayRotation, eveningBlockFor, morningPlanFor, assessReadiness, evaluateProgression, targetText } from './program';
import { fastingStatus } from './fasting';
import { weekStats } from './stats';
import { buildMorningSteps, buildEveningSteps, createSession, reduce, stepElapsedMs, totalElapsedMs, stepRemainingSec, sessionToLog, estimateRemainingSec, type Session } from './workout';
import type { WorkoutLog } from '../types';

// 2026-10-26 是星期一
const MON = '2026-10-26';

describe('台北時間工具', () => {
  it('以台北時區計算日期（UTC 16:00 已是隔天）', () => {
    expect(dateKey(Date.UTC(2026, 9, 25, 15, 59))).toBe('2026-10-25');
    expect(dateKey(Date.UTC(2026, 9, 25, 16, 0))).toBe('2026-10-26');
  });
  it('星期與天數', () => {
    expect(weekdayOf(MON)).toBe(1);
    expect(daysBetween('2026-10-26', '2026-11-02')).toBe(7);
    expect(mondayOf('2026-11-01')).toBe('2026-10-26');
  });
});

describe('每週早晨菜單', () => {
  const data = createDefaultData(MON);
  const expectations: [string, string, string[]][] = [
    ['2026-10-26', '恢復版', ['wall-pushup', 'chair-squat', 'dead-bug']],
    ['2026-10-27', '標準版', ['pushup', 'squat', 'reverse-crunch']],
    ['2026-10-28', '輕量版', ['incline-pushup', 'squat', 'plank']],
    ['2026-10-29', '恢復版', ['wall-pushup', 'chair-squat', 'dead-bug']],
    ['2026-10-30', '強化版', ['pushup', 'squat', 'reverse-crunch']],
    ['2026-10-31', '輕量版', ['incline-pushup', 'squat', 'side-plank']],
    ['2026-11-01', '輕量版', ['incline-pushup', 'squat', 'dead-bug']],
  ];
  it.each(expectations)('%s → %s', (date, title, ids) => {
    const p = morningPlanFor(data, date);
    expect(p.title).toBe(title);
    expect(p.rounds).toBe(5);
    expect(p.items.map((i) => i.exerciseId)).toEqual(ids);
  });
  it('週二／週五目標次數正確', () => {
    expect(targetText(morningPlanFor(data, '2026-10-27').items[0].target)).toBe('8–12 下');
    expect(targetText(morningPlanFor(data, '2026-10-30').items[1].target)).toBe('15–20 下');
    expect(targetText(morningPlanFor(data, '2026-10-31').items[2].target)).toBe('每側 15 秒');
  });
  it('狀態不佳時推薦恢復版，但使用者可選原菜單', () => {
    expect(morningPlanFor(data, '2026-10-30', { readiness: 'recovery' }).variant).toBe('recovery');
    expect(morningPlanFor(data, '2026-10-30', { readiness: 'recovery', useRecommended: false }).variant).toBe('strong');
  });
  it('使用者確認的加次數只套用到週二週五推／蹲', () => {
    const d = createDefaultData(MON);
    d.settings.progressionBonus = 2;
    const tue = morningPlanFor(d, '2026-10-27');
    expect(targetText(tue.items[0].target)).toBe('10–14 下');
    expect(targetText(tue.items[2].target)).toBe('8 下'); // 腹肌不變
    expect(targetText(morningPlanFor(d, '2026-10-28').items[0].target)).toBe('6 下'); // 週三不變
  });
  it('第 13 週減量', () => {
    const p = morningPlanFor(data, '2027-01-19'); // Day 86 → week 13（週二）
    expect(programDay(MON, '2027-01-19').week).toBe(13);
    expect(p.rounds).toBe(3);
  });
});

describe('晚間健身房與星期六輪替', () => {
  it('開始日後第一個星期六為胸，之後隔週輪替', () => {
    expect(saturdayRotation(MON, '2026-10-31')).toBe('chest');
    expect(saturdayRotation(MON, '2026-11-07')).toBe('back');
    expect(saturdayRotation(MON, '2026-11-14')).toBe('chest');
    expect(saturdayRotation(MON, '2026-11-07', 'back')).toBe('chest');
  });
  it('開始日為星期六時當天就是第一週', () => {
    expect(saturdayRotation('2026-10-31', '2026-10-31')).toBe('chest');
    expect(saturdayRotation('2026-10-31', '2026-11-07')).toBe('back');
  });
  it('晚間菜單依星期載入', () => {
    const d = createDefaultData(MON);
    expect(eveningBlockFor(d, '2026-10-26').block.stretchMin).toBe(30);
    expect(eveningBlockFor(d, '2026-10-27').block.title).toBe('胸');
    expect(eveningBlockFor(d, '2026-10-28').block.title).toBe('腿 A');
    expect(eveningBlockFor(d, '2026-10-30').block.title).toBe('背');
    expect(eveningBlockFor(d, '2026-11-01').block.title).toBe('腿 B');
    const sat2 = eveningBlockFor(d, '2026-11-07');
    expect(sat2.rotation).toBe('back');
    expect(sat2.block.items.map((i) => i.exerciseId)).toEqual(['seated-row', 'reverse-fly']);
  });
});

describe('90 天階段', () => {
  it('Day / Week 計算', () => {
    expect(programDay(MON, MON)).toMatchObject({ day: 1, week: 1, started: true });
    expect(programDay(MON, '2026-11-08')).toMatchObject({ day: 14, week: 2 });
    expect(programDay(MON, '2026-11-09')).toMatchObject({ day: 15, week: 3 });
    expect(programDay(MON, '2026-10-25').started).toBe(false);
    expect(programDay(MON, '2027-01-24')).toMatchObject({ day: 91, finished: true });
  });
  it('階段對應', () => {
    expect(phaseForWeek(1).title).toBe('熟悉期');
    expect(phaseForWeek(4).title).toBe('微幅進階');
    expect(phaseForWeek(6).title).toBe('漸進增量');
    expect(phaseForWeek(12).title).toBe('強化挑戰');
    expect(phaseForWeek(13).title).toBe('減量與檢測');
  });

  const mkLog = (date: string, done: number, planned = 15): WorkoutLog => ({
    id: date, dateKey: date, kind: 'morning', title: 'x', startedAt: 0, endedAt: 0, activeMs: 0, endedEarly: false,
    plannedSets: planned, completedSets: done, sets: [],
  });
  it('只因日曆進入第 3 週不會升級：需要完成度與睡眠', () => {
    const d = createDefaultData(MON);
    const today = '2026-11-09'; // week 3
    const empty = evaluateProgression(d.settings, [], {}, today);
    expect(empty.eligible).toBe(false);

    const logs: WorkoutLog[] = [];
    const daily: Record<string, any> = {};
    for (let i = 0; i < 14; i++) {
      const k = new Date(Date.UTC(2026, 9, 27 + i)).toISOString().slice(0, 10);
      logs.push(mkLog(k, 15));
      daily[k] = { dateKey: k, sleepHours: 6.5, soreness: 3, energy: 4 };
    }
    const ok = evaluateProgression(d.settings, logs, daily, today);
    expect(ok.eligible).toBe(true);
    expect(ok.suggestedBonus).toBe(1);

    const tired = Object.fromEntries(Object.entries(daily).map(([k, v]) => [k, { ...v, sleepHours: 5 }]));
    expect(evaluateProgression(d.settings, logs, tired, today).eligible).toBe(false);
  });
  it('第 2 週即使表現好也不升級', () => {
    const d = createDefaultData(MON);
    const r = evaluateProgression(d.settings, [mkLog(MON, 15)], { [MON]: { dateKey: MON, sleepHours: 8 } }, '2026-11-02');
    expect(r.eligible).toBe(false);
  });
});

describe('恢復檢查', () => {
  it('紅旗 → 停止', () => expect(assessReadiness({ sleepHours: 8, energy: 5, soreness: 0, redFlags: true }).level).toBe('stop'));
  it('睡不滿 6 小時 → 恢復版且不做高強度 HIIT', () => {
    const r = assessReadiness({ sleepHours: 5.5, energy: 4, soreness: 2, redFlags: false });
    expect(r.level).toBe('recovery');
    expect(r.allowHighIntensityHiit).toBe(false);
  });
  it('高痠痛或疲勞 → 恢復版', () => {
    expect(assessReadiness({ sleepHours: 7, energy: 2, soreness: 2, redFlags: false }).level).toBe('recovery');
    expect(assessReadiness({ sleepHours: 7, energy: 4, soreness: 8, redFlags: false }).level).toBe('recovery');
  });
  it('狀態正常', () => expect(assessReadiness({ sleepHours: 6, energy: 3, soreness: 4, redFlags: false }).level).toBe('normal'));
});

describe('16:8 斷食', () => {
  const at = (h: number, m: number) => Date.UTC(2026, 9, 26, h - 8, m); // 台北時間
  it('15:30–23:30 進食', () => {
    const s = fastingStatus('15:30', '23:30', at(16, 0));
    expect(s.state).toBe('eating');
    expect(s.secondsToNext).toBe(7.5 * 3600);
  });
  it('跨午夜禁食', () => {
    const s = fastingStatus('15:30', '23:30', at(7, 0));
    expect(s.state).toBe('fasting');
    expect(s.secondsToNext).toBe(8.5 * 3600);
    expect(fastingStatus('15:30', '23:30', at(23, 45)).state).toBe('fasting');
  });
  it('跨午夜的進食窗口', () => {
    expect(fastingStatus('20:00', '04:00', at(1, 0)).state).toBe('eating');
    expect(fastingStatus('20:00', '04:00', at(12, 0)).state).toBe('fasting');
  });
});

describe('Guided Workout Engine 計時器', () => {
  const data = createDefaultData(MON);
  const plan = morningPlanFor(data, '2026-10-27');
  const steps = buildMorningSteps(plan, data.settings);
  const fresh = (): Session => createSession({ id: 's1', kind: 'morning', dateKey: '2026-10-27', title: plan.title, steps });
  const T0 = 1_000_000;

  it('步驟結構：暖身 → 5 輪 × 3 動作（含轉換與輪間休息）→ HIIT → 緩和', () => {
    expect(steps[0].id).toBe('warmup');
    expect(steps.filter((s) => s.kind === 'set')).toHaveLength(15);
    expect(steps.filter((s) => s.kind === 'rest' && s.id.startsWith('round'))).toHaveLength(4);
    expect(steps.filter((s) => s.kind === 'rest' && s.id.startsWith('round')).every((s) => s.kind === 'rest' && s.seconds === 60)).toBe(true);
    expect(steps[steps.length - 2].kind).toBe('hiit');
    expect(steps[steps.length - 1].id).toBe('cooldown');
  });
  it('側平板每側各一個計時步驟', () => {
    const sat = buildMorningSteps(morningPlanFor(data, '2026-10-31'), data.settings);
    expect(sat.filter((s) => s.kind === 'set')).toHaveLength(20);
  });
  it('減少組數：只做 3 組的動作在第 4、5 輪不出現', () => {
    const p = morningPlanFor(data, '2026-10-27');
    p.items[2].sets = 3;
    const st = buildMorningSteps(p, data.settings);
    expect(st.filter((s) => s.kind === 'set' && s.exerciseId === 'reverse-crunch')).toHaveLength(3);
  });

  it('用時間戳計算經過時間，暫停期間不計入', () => {
    let s = reduce(fresh(), { type: 'start', now: T0 });
    expect(stepElapsedMs(s, T0 + 10_000)).toBe(10_000);
    s = reduce(s, { type: 'pause', now: T0 + 10_000 });
    expect(stepElapsedMs(s, T0 + 60_000)).toBe(10_000);
    expect(totalElapsedMs(s, T0 + 60_000)).toBe(10_000);
    s = reduce(s, { type: 'resume', now: T0 + 60_000 });
    expect(stepElapsedMs(s, T0 + 65_000)).toBe(15_000);
    expect(totalElapsedMs(s, T0 + 65_000)).toBe(15_000);
  });

  it('次數動作不會因時間經過自動完成，必須使用者按完成', () => {
    let s = reduce(fresh(), { type: 'start', now: T0 });
    s = reduce(s, { type: 'complete', now: T0 + 300_000 }); // 完成暖身
    expect(s.steps[s.index].kind).toBe('set');
    const idx = s.index;
    s = reduce(s, { type: 'tick', now: T0 + 3_600_000 });
    expect(s.index).toBe(idx);
    expect(s.results[s.steps[idx].id]).toBeUndefined();
  });

  it('完成一組後自動進入休息，休息倒數結束自動進入下一動作', () => {
    let s = reduce(fresh(), { type: 'start', now: T0 });
    s = reduce(s, { type: 'complete', now: T0 + 1000 }); // 暖身
    s = reduce(s, { type: 'complete', now: T0 + 2000, actual: 10 }); // 伏地挺身
    expect(s.steps[s.index].kind).toBe('rest');
    expect(stepRemainingSec(s, T0 + 7000)).toBe(10);
    s = reduce(s, { type: 'tick', now: T0 + 16_999 });
    expect(s.steps[s.index].kind).toBe('rest');
    s = reduce(s, { type: 'tick', now: T0 + 17_000 });
    expect(s.steps[s.index].kind).toBe('set');
  });

  it('切到背景很久後回來：休息結束時間點正確，不清除狀態', () => {
    let s = reduce(fresh(), { type: 'start', now: T0 });
    s = reduce(s, { type: 'complete', now: T0 + 1000 });
    s = reduce(s, { type: 'complete', now: T0 + 2000, actual: 10 });
    const restored: Session = JSON.parse(JSON.stringify(s)); // 模擬存檔再讀回
    const back = reduce(restored, { type: 'tick', now: T0 + 120_000 });
    expect(back.steps[back.index].kind).toBe('set');
    expect(back.stepStartedAt).toBe(T0 + 17_000);
    expect(back.results['m2-1-r1']).toMatchObject({ status: 'done', actual: 10 });
  });

  it('跳過與返回', () => {
    let s = reduce(fresh(), { type: 'start', now: T0 });
    s = reduce(s, { type: 'skip', now: T0 + 1000 });
    expect(s.results.warmup.status).toBe('skipped');
    s = reduce(s, { type: 'complete', now: T0 + 2000, actual: 9 });
    s = reduce(s, { type: 'back', now: T0 + 3000 }); // 從休息返回伏地挺身
    expect(s.steps[s.index].id).toBe('m2-1-r1');
    expect(s.results['m2-1-r1']).toBeUndefined();
  });

  it('中途結束只保存實際確認的組數', () => {
    let s = reduce(fresh(), { type: 'start', now: T0 });
    s = reduce(s, { type: 'complete', now: T0 + 1000 });
    s = reduce(s, { type: 'complete', now: T0 + 2000, actual: 10 });
    s = reduce(s, { type: 'tick', now: T0 + 20_000 });
    s = reduce(s, { type: 'skip', now: T0 + 25_000 });
    s = reduce(s, { type: 'finish', now: T0 + 30_000, early: true });
    const log = sessionToLog(s);
    expect(log.endedEarly).toBe(true);
    expect(log.plannedSets).toBe(15);
    expect(log.completedSets).toBe(1);
    expect(log.sets).toHaveLength(2);
    expect(log.hiit?.done).toBe(false);
    expect(estimateRemainingSec(s, T0 + 30_000)).toBe(0);
  });

  it('全部完成後狀態為 finished', () => {
    let s = reduce(fresh(), { type: 'start', now: T0 });
    let t = T0;
    while (s.status !== 'finished') {
      t += 1000;
      s = reduce(s, { type: 'complete', now: t, actual: 1 });
    }
    const log = sessionToLog(s);
    expect(log.completedSets).toBe(15);
    expect(log.hiit?.done).toBe(true);
    expect(log.endedEarly).toBe(false);
  });

  it('晚間健身房步驟含組間休息與有氧', () => {
    const st = buildEveningSteps(eveningBlockFor(data, '2026-10-27').block, data.settings);
    expect(st.filter((s) => s.kind === 'set')).toHaveLength(9);
    expect(st.some((s) => s.id === 'cardio')).toBe(true);
    const stretch = buildEveningSteps(eveningBlockFor(data, '2026-10-26').block, data.settings);
    expect(stretch).toHaveLength(1);
  });
});

describe('本週完成率', () => {
  it('分母為本週已過天數', () => {
    const logs: WorkoutLog[] = [
      { id: 'a', dateKey: '2026-10-26', kind: 'morning', title: '', startedAt: 0, endedAt: 0, activeMs: 0, endedEarly: false, plannedSets: 15, completedSets: 15, sets: [] },
      { id: 'b', dateKey: '2026-10-27', kind: 'morning', title: '', startedAt: 0, endedAt: 0, activeMs: 0, endedEarly: true, plannedSets: 15, completedSets: 3, sets: [] },
    ];
    const w = weekStats(logs, '2026-10-28');
    expect(w.elapsedDays).toBe(3);
    expect(w.completedDays).toBe(1);
  });
});
