// 台北時間（UTC+8，無日光節約時間）工具
import type { Weekday } from '../types';

const OFFSET = 8 * 3600_000;
const DAY = 86_400_000;

export const WEEKDAY_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
export const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

const pad = (n: number) => String(n).padStart(2, '0');

/** 取得時間戳在台北的日期 YYYY-MM-DD */
export function dateKey(ts: number = Date.now()): string {
  const d = new Date(ts + OFFSET);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 台北當天經過的秒數 */
export function secondsOfDay(ts: number = Date.now()): number {
  return Math.floor((((ts + OFFSET) % DAY) + DAY) % DAY / 1000);
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function weekdayOf(key: string): Weekday {
  return new Date(keyToUtc(key)).getUTCDay() as Weekday;
}

/** b - a 的天數 */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / DAY);
}

export function addDays(key: string, n: number): string {
  const d = new Date(keyToUtc(key) + n * DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 本週星期一（台灣習慣週一為一週開始） */
export function mondayOf(key: string): string {
  const wd = weekdayOf(key);
  return addDays(key, -((wd + 6) % 7));
}

export function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h * 60 + (m || 0)) * 60;
}

export function fmtDuration(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function fmtHM(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} 小時 ${m} 分` : `${m} 分`;
}

export function fmtClock(ts: number): string {
  const s = secondsOfDay(ts);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;
}
