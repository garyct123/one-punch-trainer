import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { PHASES, evaluateProgression, exName, phaseForWeek, programDay } from '../engine/program';
import { avgSleep, totalReps, weeklyRates } from '../engine/stats';
import { dateKey, fmtDuration } from '../lib/time';
import { BarChart, LineChart } from '../components/Charts';
import { Bar, Button, Card, NumInput, SectionTitle, inputCls } from '../components/ui';
import type { DailyLog, GymRecord } from '../types';

export function ProgressPage() {
  const { data, update, toast } = useApp();
  const today = dateKey();
  const st = data.settings;
  const pd = programDay(st.startDate, today);
  const phase = phaseForWeek(pd.week);
  const advice = evaluateProgression(st, data.workoutLogs, data.dailyLogs, today);
  const daily = Object.values(data.dailyLogs).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const morningLogs = data.workoutLogs.filter((l) => l.kind === 'morning').sort((a, b) => a.startedAt - b.startedAt);
  const pushData = morningLogs.map((l) => ({ label: l.dateKey.slice(5), value: totalReps(l, data.exercises, 'push') })).filter((p) => p.value > 0);
  const sleepData = daily.filter((d) => (d.sleepHours ?? d.checkIn?.sleepHours) != null).slice(-30).map((d) => ({ label: d.dateKey.slice(5), value: (d.sleepHours ?? d.checkIn?.sleepHours)! }));
  const avg7 = avgSleep(data.dailyLogs, today, 7);

  return (
    <div>
      <h1 className="px-1 pt-2 text-3xl font-black">90 天進度</h1>

      <Card className="mt-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-400">目前</div>
            <div className="text-4xl font-black text-hero">{pd.started ? `Day ${Math.min(pd.day, 999)}` : '尚未開始'}</div>
            <div className="text-sm text-slate-300">第 {Math.max(pd.week, 0)} 週 · {phase.title}</div>
          </div>
          <div className="text-right text-xs text-slate-400">開始 {st.startDate}<br />進階加次數 +{st.progressionBonus}</div>
        </div>
        <div className="mt-3"><Bar value={Math.max(0, Math.min(90, pd.day)) / 90} /></div>
        <div className="mt-3 space-y-1.5">
          {PHASES.map((p) => (
            <div key={p.id} className={`rounded-lg px-3 py-2 text-sm ${p.id === phase.id ? 'bg-hero/15 text-slate-100' : 'text-slate-500'}`}>
              <span className="font-bold">第 {p.fromWeek}{p.toWeek !== p.fromWeek ? `–${p.toWeek}` : ''} 週｜{p.title}</span>
              {p.id === phase.id && <ul className="mt-1 list-disc pl-5">{p.goals.map((g) => <li key={g}>{g}</li>)}</ul>}
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>升級評估（需你確認才會套用）</SectionTitle>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div><div className="text-xl font-black">{Math.round(advice.stats.completionRate * 100)}%</div><div className="text-xs text-slate-400">近 {st.rules.lookbackDays} 天完成率</div></div>
          <div><div className="text-xl font-black">{advice.stats.avgSleep?.toFixed(1) ?? '—'}</div><div className="text-xs text-slate-400">平均睡眠</div></div>
          <div><div className="text-xl font-black">{advice.stats.avgSoreness?.toFixed(1) ?? '—'}</div><div className="text-xs text-slate-400">平均痠痛</div></div>
        </div>
        {advice.eligible ? (
          <div className="mt-3">
            <div className="text-ok">條件都達標，可以把週二／週五推、蹲每組改為 +{advice.suggestedBonus} 下。</div>
            <Button variant="ok" className="mt-2" onClick={() => { update((d) => { d.settings.progressionBonus = advice.suggestedBonus; }); toast('已升級'); }}>確認升級</Button>
          </div>
        ) : (
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-400">{advice.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        )}
        {st.progressionBonus > 0 && (
          <button type="button" className="mt-2 text-sm text-slate-500 underline" onClick={() => update((d) => { d.settings.progressionBonus = Math.max(0, d.settings.progressionBonus - 1); })}>覺得太硬？降回 +{st.progressionBonus - 1}</button>
        )}
      </Card>

      <DailyLogForm />

      <SectionTitle>趨勢</SectionTitle>
      <Card><div className="mb-1 font-bold">體重（kg）</div><LineChart data={daily.filter((d) => d.weightKg != null).map((d) => ({ label: d.dateKey.slice(5), value: d.weightKg! }))} unit=" kg" /></Card>
      <Card className="mt-3"><div className="mb-1 font-bold">腰圍（cm）</div><LineChart data={daily.filter((d) => d.waistCm != null).map((d) => ({ label: d.dateKey.slice(5), value: d.waistCm! }))} unit=" cm" color="#3ea6ff" /></Card>
      <Card className="mt-3"><div className="mb-1 font-bold">伏地挺身（每次訓練總次數）</div><LineChart data={pushData} unit=" 下" color="#ff6b6b" empty="完成早晨訓練後會出現" /></Card>
      <Card className="mt-3"><div className="mb-1 font-bold">每週完成率</div><BarChart data={weeklyRates(data.workoutLogs, today, 8, st.startDate)} /></Card>
      <Card className="mt-3">
        <div className="mb-1 flex justify-between font-bold"><span>睡眠時數</span><span className="text-sm text-slate-400">近 7 天平均 {avg7?.toFixed(1) ?? '—'} 小時</span></div>
        <LineChart data={sleepData} unit=" 小時" color="#a78bfa" />
      </Card>

      <SectionTitle>訓練紀錄</SectionTitle>
      <div className="space-y-2">
        {[...data.workoutLogs].sort((a, b) => b.startedAt - a.startedAt).slice(0, 30).map((l) => (
          <details key={l.id} className="rounded-2xl border border-line bg-panel p-3">
            <summary className="flex cursor-pointer items-center justify-between">
              <span><span className="font-bold">{l.dateKey}</span> <span className="text-sm text-slate-400">{l.title}</span></span>
              <span className="text-sm tabular-nums">{l.completedSets}/{l.plannedSets}{l.endedEarly ? ' ·提前' : ''}</span>
            </summary>
            <div className="mt-2 text-sm text-slate-300">
              時長 {fmtDuration(l.activeMs / 1000)}{l.hiit ? ` · HIIT ${l.hiit.done ? `${l.hiit.minutes ?? ''} 分` : '未完成'}` : ''}
              <ul className="mt-1 text-slate-400">
                {l.sets.map((s) => <li key={s.stepId}>{exName(data.exercises, s.exerciseId)} 第{s.round}組：{s.status === 'done' ? `${s.actual ?? '?'} ${s.unit === 'sec' ? '秒' : '下'}${s.weightKg ? ` @${s.weightKg}kg` : ''}` : '跳過'}</li>)}
              </ul>
              <button type="button" className="mt-2 text-punch underline" onClick={() => { if (confirm('刪除這筆訓練紀錄？')) update((d) => { d.workoutLogs = d.workoutLogs.filter((x) => x.id !== l.id); }); }}>刪除</button>
            </div>
          </details>
        ))}
        {data.workoutLogs.length === 0 && <Card className="text-center text-slate-500">還沒有訓練紀錄</Card>}
      </div>
    </div>
  );
}

function DailyLogForm() {
  const { data, update, toast } = useApp();
  const [date, setDate] = useState(dateKey());
  const cur: DailyLog = data.dailyLogs[date] ?? { dateKey: date };
  const set = (patch: Partial<DailyLog>) => update((d) => { d.dailyLogs[date] = { ...(d.dailyLogs[date] ?? { dateKey: date }), ...patch }; });
  const [g, setG] = useState<Omit<GymRecord, 'id'>>({ exerciseId: 'bench-press', weightKg: 20, sets: 3, reps: 10 });
  const dayLogs = data.workoutLogs.filter((l) => l.dateKey === date);
  const reps = (cat: 'push' | 'squat' | 'core') => dayLogs.reduce((a, l) => a + totalReps(l, data.exercises, cat), 0);
  const hiitMin = dayLogs.reduce((a, l) => a + (l.hiit?.done ? l.hiit.minutes ?? 0 : 0), 0);

  return (
    <>
      <SectionTitle>每日紀錄</SectionTitle>
      <Card>
        <input type="date" className={`${inputCls} w-full`} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <div className="mt-2 grid grid-cols-2 gap-x-4">
          <label className="flex items-center justify-between py-1.5 text-sm">體重 kg <NumInput value={cur.weightKg} step={0.1} onChange={(v) => set({ weightKg: v })} className="w-20" /></label>
          <label className="flex items-center justify-between py-1.5 text-sm">腰圍 cm <NumInput value={cur.waistCm} step={0.5} onChange={(v) => set({ waistCm: v })} className="w-20" /></label>
          <label className="flex items-center justify-between py-1.5 text-sm">睡眠 h <NumInput value={cur.sleepHours ?? cur.checkIn?.sleepHours} step={0.5} onChange={(v) => set({ sleepHours: v })} className="w-20" /></label>
          <label className="flex items-center justify-between py-1.5 text-sm">精力 1–5 <NumInput value={cur.energy ?? cur.checkIn?.energy} onChange={(v) => set({ energy: v })} className="w-20" /></label>
        </div>
        <div className="mt-2 rounded-lg bg-panel2 p-2 text-sm text-slate-300">
          訓練（來自實際完成紀錄）：{dayLogs.length ? `伏地挺身 ${reps('push')} 下・深蹲 ${reps('squat')} 下・腹肌 ${reps('core')} 下・HIIT ${hiitMin} 分` : '當天沒有訓練紀錄'}
        </div>
        <div className="mt-3 text-sm font-bold text-slate-400">手動新增重訓紀錄</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <select className={`${inputCls} flex-1`} value={g.exerciseId} onChange={(e) => setG({ ...g, exerciseId: e.target.value })}>
            {data.exercises.filter((e) => ['chest', 'back', 'arms', 'legs'].includes(e.category)).map((e) => <option key={e.id} value={e.id}>{e.nameZh}</option>)}
          </select>
          <NumInput value={g.weightKg} step={2.5} onChange={(v) => setG({ ...g, weightKg: v ?? 0 })} className="w-16" />kg
          <NumInput value={g.sets} onChange={(v) => setG({ ...g, sets: v ?? 1 })} className="w-12" />組
          <NumInput value={g.reps} onChange={(v) => setG({ ...g, reps: v ?? 1 })} className="w-12" />下
          <Button variant="dark" onClick={() => { set({ gym: [...(cur.gym ?? []), { ...g, id: `g${Date.now()}` }] }); toast('已新增'); }}>＋</Button>
        </div>
        {(cur.gym ?? []).map((r) => (
          <div key={r.id} className="mt-1 flex justify-between text-sm text-slate-300">
            <span>{exName(data.exercises, r.exerciseId)} {r.weightKg}kg × {r.sets} 組 × {r.reps} 下</span>
            <button type="button" className="text-punch" onClick={() => set({ gym: (cur.gym ?? []).filter((x) => x.id !== r.id) })}>✕</button>
          </div>
        ))}
        <textarea className={`${inputCls} mt-3 w-full`} rows={2} placeholder="備註" value={cur.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
      </Card>
    </>
  );
}
