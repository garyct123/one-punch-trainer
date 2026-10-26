import { parseHM, secondsOfDay } from '../lib/time';

export interface FastingStatus {
  state: 'eating' | 'fasting';
  secondsToNext: number;
  nextLabel: string;
  progress: number; // 目前階段已經過比例 0–1
}

const DAY = 86400;

/** 計算目前是進食或禁食窗口（支援跨午夜的窗口） */
export function fastingStatus(eatStart: string, eatEnd: string, now: number = Date.now()): FastingStatus {
  const s = parseHM(eatStart);
  const e = parseHM(eatEnd);
  const t = secondsOfDay(now);
  const eatLen = (e - s + DAY) % DAY || DAY;
  const sinceStart = (t - s + DAY) % DAY;
  if (sinceStart < eatLen) {
    return { state: 'eating', secondsToNext: eatLen - sinceStart, nextLabel: `${eatEnd} 開始禁食`, progress: sinceStart / eatLen };
  }
  const fastLen = DAY - eatLen;
  const sinceEnd = sinceStart - eatLen;
  return { state: 'fasting', secondsToNext: fastLen - sinceEnd, nextLabel: `${eatStart} 開始進食`, progress: fastLen ? sinceEnd / fastLen : 1 };
}
