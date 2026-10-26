import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../types';
import { clone, createDefaultData } from '../data/defaults';
import { parseBackup } from '../lib/backup';
import { clearSession, loadData, loadSession, requestPersist, saveData, saveSession } from '../lib/storage';
import { reduce, type Action, type Session } from '../engine/workout';

interface Ctx {
  data: AppData;
  update: (fn: (d: AppData) => void) => void;
  replaceData: (d: AppData) => void;
  session: Session | null;
  setSession: (s: Session | null) => void;
  dispatch: (a: Action) => void;
  workoutOpen: boolean;
  setWorkoutOpen: (v: boolean) => void;
  toast: (msg: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => {
    (async () => {
      const raw = await loadData();
      let d: AppData;
      try {
        d = raw ? parseBackup(JSON.stringify(raw)) : createDefaultData();
      } catch {
        d = createDefaultData();
      }
      if (!raw) saveData(d);
      setData(d);
      const s = await loadSession();
      if (s && s.steps?.length) {
        setSessionState(s);
        // 有進行中的訓練：重新開啟 App 時直接回到訓練畫面
        if (s.status === 'running' || s.status === 'paused') setWorkoutOpen(true);
      }
      requestPersist();
    })();
  }, []);

  const update = useCallback((fn: (d: AppData) => void) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      fn(next);
      saveData(next);
      return next;
    });
  }, []);

  const replaceData = useCallback((d: AppData) => {
    saveData(d);
    setData(d);
  }, []);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    if (s) saveSession(s);
    else clearSession();
  }, []);

  const dispatch = useCallback((a: Action) => {
    setSessionState((prev) => {
      if (!prev) return prev;
      const next = reduce(prev, a);
      if (next !== prev) saveSession(next);
      return next;
    });
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2200);
  }, []);

  if (!data) {
    return <div className="flex h-screen items-center justify-center text-hero text-xl font-black">ONE PUNCH TRAINER…</div>;
  }

  return (
    <AppCtx.Provider value={{ data, update, replaceData, session, setSession, dispatch, workoutOpen, setWorkoutOpen, toast }}>
      {children}
      {toastMsg && (
        <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+12px)] z-[100] -translate-x-1/2 rounded-full bg-ok px-5 py-2 font-bold text-black shadow-lg">
          {toastMsg}
        </div>
      )}
    </AppCtx.Provider>
  );
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp 必須在 AppProvider 內使用');
  return c;
}

/** 每 interval 毫秒重新渲染一次；時間值一律由 Date.now() 取得 */
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    const vis = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [interval]);
  return now;
}
