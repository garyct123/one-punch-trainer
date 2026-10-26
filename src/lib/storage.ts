// IndexedDB 儲存（idb-keyval）；IndexedDB 不可用時退回 localStorage
import { get, set, del } from 'idb-keyval';
import type { AppData } from '../types';
import type { Session } from '../engine/workout';

const DATA_KEY = 'opt-data-v1';
const SESSION_KEY = 'opt-session-v1';

async function safeGet<T>(key: string): Promise<T | undefined> {
  try {
    const v = await get<T>(key);
    if (v !== undefined) return v;
  } catch {
    /* 退回 localStorage */
  }
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function safeSet(key: string, value: unknown) {
  try {
    await set(key, value);
  } catch {
    /* ignore */
  }
  // 同步寫一份到 localStorage 作為保險（資料量小）
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 容量不足等情況忽略 */
  }
}

async function safeDel(key: string) {
  try {
    await del(key);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const loadData = () => safeGet<AppData>(DATA_KEY);
export const saveData = (d: AppData) => safeSet(DATA_KEY, d);
export const loadSession = () => safeGet<Session>(SESSION_KEY);
export const saveSession = (s: Session) => safeSet(SESSION_KEY, s);
export const clearSession = () => safeDel(SESSION_KEY);

/** 請求持久化儲存，降低 iOS 清除資料的機率 */
export async function requestPersist() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}
