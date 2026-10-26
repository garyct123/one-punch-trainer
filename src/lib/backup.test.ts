import { describe, it, expect } from 'vitest';
import { createDefaultData } from '../data/defaults';
import { exportJSON, parseBackup, dailyToCSV, importDailyCSV, workoutsToCSV, importWorkoutsCSV, parseCSV } from './backup';
import type { WorkoutLog } from '../types';

const log: WorkoutLog = {
  id: 'w1', dateKey: '2026-10-27', kind: 'morning', title: '標準版, "測試"', variant: 'standard', startedAt: 100, endedAt: 900, activeMs: 700,
  endedEarly: false, plannedSets: 15, completedSets: 2,
  sets: [
    { stepId: 'a', exerciseId: 'pushup', round: 1, targetText: '8–12 下', status: 'done', actual: 10, unit: 'reps' },
    { stepId: 'b', exerciseId: 'plank', round: 1, targetText: '15 秒', status: 'done', actual: 15, unit: 'sec' },
    { stepId: 'c', exerciseId: 'squat', round: 1, targetText: '12 下', status: 'skipped', unit: 'reps' },
  ],
  hiit: { done: true, minutes: 16 },
};

describe('資料備份', () => {
  it('JSON 匯出再匯入完全還原', () => {
    const d = createDefaultData('2026-10-26');
    d.workoutLogs.push(log);
    d.dailyLogs['2026-10-27'] = { dateKey: '2026-10-27', weightKg: 85.6, waistCm: 96 };
    d.settings.restSec = 45;
    const back = parseBackup(exportJSON(d));
    expect(back).toEqual(d);
  });
  it('拒絕無效檔案', () => {
    expect(() => parseBackup('not json')).toThrow('JSON');
    expect(() => parseBackup('{"a":1}')).toThrow('備份檔');
  });
  it('舊備份缺欄位時補上預設值', () => {
    const back = parseBackup(JSON.stringify({ settings: { startDate: '2026-10-01' }, workoutLogs: [] }));
    expect(back.settings.restSec).toBe(60);
    expect(back.morningPlans).toHaveLength(7);
  });
  it('每日紀錄 CSV 往返', () => {
    const daily = { '2026-10-27': { dateKey: '2026-10-27', weightKg: 85.6, waistCm: 96, sleepHours: 6.5, note: '有點累, 但完成' } };
    const csv = dailyToCSV(daily);
    const back = importDailyCSV(csv, {});
    expect(back['2026-10-27']).toMatchObject(daily['2026-10-27']);
  });
  it('訓練 CSV 往返（含逗號與引號）', () => {
    const csv = workoutsToCSV([log]);
    expect(parseCSV(csv)).toHaveLength(3);
    const back = importWorkoutsCSV(csv, []);
    expect(back).toHaveLength(1);
    expect(back[0]).toEqual(log);
  });
});
