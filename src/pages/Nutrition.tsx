import { useState } from 'react';
import { useApp, useNow } from '../store/AppContext';
import { fastingStatus } from '../engine/fasting';
import { dateKey, fmtClock, fmtDuration } from '../lib/time';
import { Ring } from '../components/Ring';
import { Bar, Button, Card, NumInput, SectionTitle, inputCls } from '../components/ui';
import type { NutritionDay } from '../types';

export function NutritionPage() {
  const { data, update, toast } = useApp();
  const now = useNow(1000);
  const today = dateKey(now);
  const st = data.settings;
  const f = fastingStatus(st.eatStart, st.eatEnd, now);
  const day: NutritionDay = data.nutrition[today] ?? { dateKey: today, waterMl: 0, meals: [] };
  const protein = day.meals.reduce((a, m) => a + m.proteinG, 0);
  const [name, setName] = useState('');
  const [pg, setPg] = useState<number | undefined>(30);
  const trainedToday = data.workoutLogs.some((l) => l.dateKey === today && l.completedSets > 0);

  const edit = (fn: (n: NutritionDay) => void) => update((d) => {
    const n = d.nutrition[today] ?? { dateKey: today, waterMl: 0, meals: [] };
    fn(n);
    d.nutrition[today] = n;
  });

  const addMeal = (g: number, label?: string) => {
    edit((n) => n.meals.push({ id: `meal${Date.now()}`, time: fmtClock(Date.now()), name: label || name || '一餐', proteinG: g }));
    setName('');
    toast(`+${g} g 蛋白質`);
  };

  return (
    <div>
      <h1 className="px-1 pt-2 text-3xl font-black">飲食與蛋白質</h1>

      <Card className="mt-3 flex flex-col items-center">
        <Ring progress={f.progress} size={200} color={f.state === 'eating' ? '#22d39b' : '#3ea6ff'}>
          <div className={`text-2xl font-black ${f.state === 'eating' ? 'text-ok' : 'text-info'}`}>{f.state === 'eating' ? '進食窗口' : '禁食中'}</div>
          <div className="font-mono text-3xl font-black tabular-nums">{fmtDuration(f.secondsToNext)}</div>
          <div className="text-xs text-slate-400">後 {f.nextLabel}</div>
        </Ring>
        <div className="mt-3 flex w-full items-center gap-2 text-sm">
          <span className="shrink-0 whitespace-nowrap">進食</span>
          <input type="time" className={`${inputCls} min-w-0 flex-1`} value={st.eatStart} onChange={(e) => e.target.value && update((d) => { d.settings.eatStart = e.target.value; })} />
          –
          <input type="time" className={`${inputCls} min-w-0 flex-1`} value={st.eatEnd} onChange={(e) => e.target.value && update((d) => { d.settings.eatEnd = e.target.value; })} />
        </div>
      </Card>

      {trainedToday && (
        <Card className="mt-3 border-ok/50">
          <div className="font-bold text-ok">💪 今天有訓練</div>
          <div className="text-sm text-slate-300">{f.state === 'eating' ? '記得補充一份 25–40 g 蛋白質。' : `進食窗口 ${st.eatStart} 開始後，第一餐優先補充蛋白質。`}</div>
        </Card>
      )}

      <SectionTitle>蛋白質 {st.proteinMin}–{st.proteinMax} g</SectionTitle>
      <Card>
        <div className="flex items-end justify-between">
          <div className="text-4xl font-black tabular-nums">{protein}<span className="text-lg text-slate-400"> g</span></div>
          <div className="text-sm text-slate-400">{protein >= st.proteinMin ? '✓ 已達標' : `還差 ${st.proteinMin - protein} g`}</div>
        </div>
        <div className="mt-2"><Bar value={protein / st.proteinMin} color="bg-ok" /></div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[20, 30, 40, 50].map((g) => <Button key={g} variant="dark" onClick={() => addMeal(g)}>+{g}g</Button>)}
        </div>
        <input className={`${inputCls} mt-3 w-full`} placeholder="餐點名稱（例：雞胸便當）" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-slate-400">蛋白質</span>
          <NumInput value={pg} onChange={setPg} className="w-20" />g
          <Button variant="primary" className="ml-auto shrink-0" onClick={() => pg && addMeal(pg)}>新增這餐</Button>
        </div>
        <div className="mt-3 space-y-1">
          {day.meals.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
              <span><span className="text-slate-500">{m.time}</span> {m.name}</span>
              <span className="flex items-center gap-3"><b>{m.proteinG} g</b><button type="button" className="text-punch" onClick={() => edit((n) => { n.meals = n.meals.filter((x) => x.id !== m.id); })}>✕</button></span>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>飲水 目標 {st.waterTargetMl} ml</SectionTitle>
      <Card>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-black tabular-nums">{day.waterMl}<span className="text-base text-slate-400"> ml</span></div>
          <div className="text-sm text-slate-400">{Math.round((day.waterMl / st.waterTargetMl) * 100)}%</div>
        </div>
        <div className="mt-2"><Bar value={day.waterMl / st.waterTargetMl} color="bg-info" /></div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Button variant="dark" onClick={() => edit((n) => { n.waterMl = Math.max(0, n.waterMl - 250); })}>−250</Button>
          <Button variant="dark" onClick={() => edit((n) => { n.waterMl += 250; })}>+250</Button>
          <Button variant="dark" onClick={() => edit((n) => { n.waterMl += 500; })}>+500</Button>
          <Button variant="dark" onClick={() => edit((n) => { n.waterMl += 750; })}>+750</Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">禁食期間可以喝水、無糖茶、黑咖啡。</p>
      </Card>

      <p className="mt-4 px-1 text-xs leading-relaxed text-slate-500">
        說明：早上 07:00 訓練落在禁食窗口內。目前證據並未顯示空腹 HIIT 一定比一般時段運動有更好的長期減脂效果；長期減脂主要取決於整體熱量、蛋白質攝取、睡眠與能否持續。若空腹訓練頭暈或無力，請改為訓練前補充或調整進食窗口。
      </p>
    </div>
  );
}
