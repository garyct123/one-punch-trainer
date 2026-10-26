import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { TodayPage } from './pages/Today';
import { WorkoutScreen } from './pages/Workout';
import { SchedulePage } from './pages/Schedule';
import { ProgressPage } from './pages/Progress';
import { LibraryPage } from './pages/Library';
import { NutritionPage } from './pages/Nutrition';
import { SettingsPage } from './pages/Settings';

type Tab = 'today' | 'schedule' | 'progress' | 'library' | 'nutrition' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: '今日', icon: '👊' },
  { id: 'schedule', label: '課表', icon: '📅' },
  { id: 'progress', label: '進度', icon: '📈' },
  { id: 'library', label: '動作', icon: '🎬' },
  { id: 'nutrition', label: '飲食', icon: '🥩' },
  { id: 'settings', label: '設定', icon: '⚙️' },
];

function readTab(): Tab {
  const h = location.hash.replace('#', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'today';
}

function Shell() {
  const { session, workoutOpen, setWorkoutOpen } = useApp();
  const [tab, setTab] = useState<Tab>(readTab);

  useEffect(() => {
    const on = () => setTab(readTab());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // 訓練畫面開啟時鎖住背景捲動
  useEffect(() => {
    document.body.style.overflow = session && workoutOpen ? 'hidden' : '';
  }, [session, workoutOpen]);

  const go = (t: Tab) => {
    location.hash = t === 'today' ? '' : t;
    setTab(t);
    window.scrollTo(0, 0);
  };

  const active = session && session.status !== 'finished';

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+88px)] pt-[calc(env(safe-area-inset-top)+12px)]">
      {tab === 'today' && <TodayPage />}
      {tab === 'schedule' && <SchedulePage />}
      {tab === 'progress' && <ProgressPage />}
      {tab === 'library' && <LibraryPage />}
      {tab === 'nutrition' && <NutritionPage />}
      {tab === 'settings' && <SettingsPage />}

      {session && !workoutOpen && (
        <button type="button" onClick={() => setWorkoutOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] left-1/2 z-30 -translate-x-1/2 rounded-full bg-hero px-5 py-2.5 font-black text-black shadow-lg">
          {active ? '▶ 回到訓練' : '查看訓練摘要'}
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => go(t.id)} className={`flex flex-col items-center py-2 text-[11px] font-bold ${tab === t.id ? 'text-hero' : 'text-slate-500'}`}>
              <span className="text-xl leading-6">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {session && workoutOpen && <WorkoutScreen />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
