import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { saturdayRotation, targetText } from '../engine/program';
import { dateKey, weekdayOf, WEEKDAY_ZH } from '../lib/time';
import { Button, Card, NumInput, Pill, SectionTitle, inputCls } from '../components/ui';
import { clone } from '../data/defaults';
import { defaultEveningPlans, defaultMorningPlans } from '../data/plans';
import type { Exercise, GymBlock, GymItem, MorningDayPlan, PlanItem } from '../types';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function SchedulePage() {
  const [tab, setTab] = useState<'morning' | 'evening'>('morning');
  const today = weekdayOf(dateKey());
  return (
    <div>
      <h1 className="px-1 pt-2 text-3xl font-black">每週課表</h1>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-panel p-1">
        {(['morning', 'evening'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg py-2 font-bold ${tab === t ? 'bg-hero text-black' : 'text-slate-300'}`}>
            {t === 'morning' ? '早晨一拳超人' : '晚上健身房'}
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs text-slate-500">點任一天即可編輯動作、組數、次數、秒數、重量與休息。五組是預設，不是強制。</p>
      {tab === 'morning' ? <MorningEditor today={today} /> : <EveningEditor today={today} />}
    </div>
  );
}

function ExerciseSelect({ value, onChange, exercises, filter }: { value: string; onChange: (v: string) => void; exercises: Exercise[]; filter?: (e: Exercise) => boolean }) {
  return (
    <select className={`${inputCls} min-w-0 flex-1`} value={value} onChange={(e) => onChange(e.target.value)}>
      {exercises.filter((e) => !filter || filter(e) || e.id === value).map((e) => <option key={e.id} value={e.id}>{e.nameZh}</option>)}
    </select>
  );
}

function MorningEditor({ today }: { today: number }) {
  const { data, update, toast } = useApp();
  const [open, setOpen] = useState<number | null>(today);
  const edit = (wd: number, fn: (p: MorningDayPlan) => void) => update((d) => fn(d.morningPlans.find((p) => p.weekday === wd)!));
  const morningEx = (e: Exercise) => ['push', 'squat', 'core'].includes(e.category);

  return (
    <div className="mt-3 space-y-3">
      {ORDER.map((wd) => {
        const p = data.morningPlans.find((x) => x.weekday === wd)!;
        const isOpen = open === wd;
        return (
          <Card key={wd} className={wd === today ? 'border-hero/60' : ''}>
            <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen(isOpen ? null : wd)}>
              <div>
                <span className="text-lg font-black">{WEEKDAY_ZH[wd]}</span> <Pill>{p.title}</Pill> {wd === today && <Pill className="bg-hero text-black">今天</Pill>}
                <div className="mt-1 text-sm text-slate-400">{p.items.map((it) => `${data.exercises.find((e) => e.id === it.exerciseId)?.nameZh} ${targetText(it.target)}`).join('・')}</div>
              </div>
              <span className="text-slate-500">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <div className="flex items-center gap-2">
                  <input className={`${inputCls} min-w-0 flex-1`} value={p.title} onChange={(e) => edit(wd, (x) => { x.title = e.target.value; })} />
                  <span className="shrink-0 whitespace-nowrap text-sm text-slate-400">輪數</span>
                  <NumInput value={p.rounds} onChange={(v) => edit(wd, (x) => { x.rounds = Math.max(1, Math.min(10, v ?? 1)); })} className="w-16" />
                </div>
                {p.items.map((it, i) => (
                  <PlanItemRow key={it.id} item={it} exercises={data.exercises} filter={morningEx}
                    onChange={(fn) => edit(wd, (x) => fn(x.items[i]))}
                    onRemove={() => edit(wd, (x) => { x.items.splice(i, 1); })} />
                ))}
                <Button variant="ghost" className="w-full" onClick={() => edit(wd, (x) => { x.items.push({ id: `m${wd}-${Date.now()}`, exerciseId: 'squat', sets: x.rounds, target: { kind: 'reps', min: 8 } }); })}>＋ 新增動作</Button>
                <div>
                  <div className="mb-1 text-sm text-slate-400">HIIT 說明</div>
                  <textarea className={`${inputCls} w-full`} rows={2} value={p.hiitNote} onChange={(e) => edit(wd, (x) => { x.hiitNote = e.target.value; })} />
                  <select className={`${inputCls} mt-1`} value={p.hiitIntensity} onChange={(e) => edit(wd, (x) => { x.hiitIntensity = e.target.value as MorningDayPlan['hiitIntensity']; })}>
                    <option value="low">低強度跟練</option>
                    <option value="adaptive">依恢復調整</option>
                  </select>
                </div>
                <button type="button" className="text-sm text-slate-500 underline" onClick={() => { if (confirm(`將${WEEKDAY_ZH[wd]}早晨菜單恢復預設？`)) { update((d) => { d.morningPlans = d.morningPlans.map((x) => (x.weekday === wd ? clone(defaultMorningPlans.find((y) => y.weekday === wd)!) : x)); }); toast('已恢復預設'); } }}>恢復此日預設</button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function PlanItemRow({ item, exercises, filter, onChange, onRemove }: { item: PlanItem; exercises: Exercise[]; filter: (e: Exercise) => boolean; onChange: (fn: (i: PlanItem) => void) => void; onRemove: () => void }) {
  const t = item.target;
  return (
    <div className="rounded-xl bg-panel2 p-3">
      <div className="flex gap-2">
        <ExerciseSelect value={item.exerciseId} onChange={(v) => onChange((x) => { x.exerciseId = v; })} exercises={exercises} filter={filter} />
        <button type="button" onClick={onRemove} className="rounded-lg px-3 text-punch" aria-label="刪除">✕</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <NumInput value={item.sets} onChange={(v) => onChange((x) => { x.sets = Math.max(1, v ?? 1); })} className="w-14" /> 組 ×
        <select className={inputCls} value={t.kind} onChange={(e) => onChange((x) => { x.target = e.target.value === 'time' ? { kind: 'time', seconds: 15, perSide: t.perSide } : { kind: 'reps', min: 8, perSide: t.perSide }; })}>
          <option value="reps">次數</option>
          <option value="time">秒數</option>
        </select>
        {t.kind === 'reps' ? (
          <>
            <NumInput value={t.min} onChange={(v) => onChange((x) => { if (x.target.kind === 'reps') x.target.min = v ?? 1; })} className="w-14" />–
            <NumInput value={t.max} placeholder="上限" onChange={(v) => onChange((x) => { if (x.target.kind === 'reps') x.target.max = v; })} className="w-16" /> 下
          </>
        ) : (
          <><NumInput value={t.seconds} onChange={(v) => onChange((x) => { if (x.target.kind === 'time') x.target.seconds = v ?? 10; })} className="w-16" /> 秒</>
        )}
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!t.perSide} onChange={(e) => onChange((x) => { x.target.perSide = e.target.checked; })} /> 每側</label>
      </div>
    </div>
  );
}

function GymBlockEditor({ block, exercises, onChange }: { block: GymBlock; exercises: Exercise[]; onChange: (fn: (b: GymBlock) => void) => void }) {
  return (
    <div className="space-y-3">
      <input className={`${inputCls} w-full`} value={block.title} onChange={(e) => onChange((b) => { b.title = e.target.value; })} />
      {block.stretchMin != null && (
        <div className="flex items-center gap-2 text-sm">全身伸展 <NumInput value={block.stretchMin} onChange={(v) => onChange((b) => { b.stretchMin = v ?? 10; })} className="w-16" /> 分鐘</div>
      )}
      {block.items.map((it, i) => (
        <GymItemRow key={it.id} item={it} exercises={exercises} onChange={(fn) => onChange((b) => fn(b.items[i]))} onRemove={() => onChange((b) => { b.items.splice(i, 1); })} />
      ))}
      {block.stretchMin == null && (
        <>
          <Button variant="ghost" className="w-full" onClick={() => onChange((b) => { b.items.push({ id: `g-${Date.now()}`, exerciseId: 'bench-press', sets: 2, repsMin: 10, restSec: 90 }); })}>＋ 新增動作</Button>
          <div className="flex items-center gap-2 text-sm">
            有氧 <NumInput value={block.cardio?.min} onChange={(v) => onChange((b) => { b.cardio = { min: v ?? 0, max: b.cardio?.max ?? v ?? 0 }; })} className="w-14" />–
            <NumInput value={block.cardio?.max} onChange={(v) => onChange((b) => { b.cardio = { min: b.cardio?.min ?? 0, max: v ?? 0 }; })} className="w-14" /> 分鐘
          </div>
        </>
      )}
    </div>
  );
}

function GymItemRow({ item, exercises, onChange, onRemove }: { item: GymItem; exercises: Exercise[]; onChange: (fn: (i: GymItem) => void) => void; onRemove: () => void }) {
  return (
    <div className="rounded-xl bg-panel2 p-3">
      <div className="flex gap-2">
        <ExerciseSelect value={item.exerciseId} onChange={(v) => onChange((x) => { x.exerciseId = v; })} exercises={exercises} />
        <button type="button" onClick={onRemove} className="rounded-lg px-3 text-punch" aria-label="刪除">✕</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <NumInput value={item.sets} onChange={(v) => onChange((x) => { x.sets = Math.max(1, v ?? 1); })} className="w-14" /> 組 ×
        <NumInput value={item.repsMin} onChange={(v) => onChange((x) => { x.repsMin = v ?? 1; })} className="w-14" />–
        <NumInput value={item.repsMax} placeholder="上限" onChange={(v) => onChange((x) => { x.repsMax = v; })} className="w-16" /> 下
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!item.perSide} onChange={(e) => onChange((x) => { x.perSide = e.target.checked; })} /> 每側</label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        重量 <NumInput value={item.weightKg} step={2.5} placeholder="kg" onChange={(v) => onChange((x) => { x.weightKg = v; })} className="w-20" /> kg
        · 休息 <NumInput value={item.restSec} step={15} onChange={(v) => onChange((x) => { x.restSec = v ?? 60; })} className="w-16" /> 秒
      </div>
    </div>
  );
}

function EveningEditor({ today }: { today: number }) {
  const { data, update, toast } = useApp();
  const [open, setOpen] = useState<number | null>(today);
  const thisSat = saturdayRotation(data.settings.startDate, dateKey(), data.settings.saturdayFirst);
  return (
    <div className="mt-3 space-y-3">
      {ORDER.map((wd) => {
        const p = data.eveningPlans.find((x) => x.weekday === wd)!;
        const isOpen = open === wd;
        const idx = data.eveningPlans.indexOf(p);
        return (
          <Card key={wd} className={wd === today ? 'border-hero/60' : ''}>
            <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen(isOpen ? null : wd)}>
              <div>
                <span className="text-lg font-black">{WEEKDAY_ZH[wd]}</span> <Pill>{p.block.title}</Pill> {wd === today && <Pill className="bg-hero text-black">今天</Pill>}
                {p.rotation && <div className="mt-1 text-sm text-slate-400">本週星期六：{thisSat === 'chest' ? p.rotation.chest.title : p.rotation.back.title}</div>}
              </div>
              <span className="text-slate-500">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="mt-3 space-y-4 border-t border-line pt-3">
                {p.rotation ? (
                  <>
                    <SectionTitle>胸部週</SectionTitle>
                    <GymBlockEditor block={p.rotation.chest} exercises={data.exercises} onChange={(fn) => update((d) => fn(d.eveningPlans[idx].rotation!.chest))} />
                    <SectionTitle>背部週</SectionTitle>
                    <GymBlockEditor block={p.rotation.back} exercises={data.exercises} onChange={(fn) => update((d) => fn(d.eveningPlans[idx].rotation!.back))} />
                  </>
                ) : (
                  <GymBlockEditor block={p.block} exercises={data.exercises} onChange={(fn) => update((d) => fn(d.eveningPlans[idx].block))} />
                )}
                <button type="button" className="text-sm text-slate-500 underline" onClick={() => { if (confirm(`將${WEEKDAY_ZH[wd]}晚上菜單恢復預設？`)) { update((d) => { d.eveningPlans[idx] = clone(defaultEveningPlans.find((y) => y.weekday === wd)!); }); toast('已恢復預設'); } }}>恢復此日預設</button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
