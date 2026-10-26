import { useState } from 'react';
import { useApp, useNow } from '../store/AppContext';
import { assessReadiness, eveningBlockFor, evaluateProgression, exName, morningPlanFor, phaseForWeek, programDay, targetText, type ReadinessResult } from '../engine/program';
import { buildEveningSteps, buildMorningSteps, createSession, estimateTotalSec, reduce } from '../engine/workout';
import { fastingStatus } from '../engine/fasting';
import { weekStats } from '../engine/stats';
import { dateKey, fmtHM, weekdayOf, WEEKDAY_ZH } from '../lib/time';
import { unlockAudio } from '../lib/voice';
import { Bar, Button, Card, NumInput, Pill, SectionTitle, Sheet } from '../components/ui';
import type { CheckIn } from '../types';

const VARIANT_COLOR: Record<string, string> = {
  recovery: 'bg-info/20 text-info', light: 'bg-ok/20 text-ok', standard: 'bg-hero/20 text-hero', strong: 'bg-punch/20 text-punch',
};

export function TodayPage() {
  const { data, update, session, setSession, setWorkoutOpen, toast } = useApp();
  const now = useNow(30_000);
  const today = dateKey(now);
  const wd = weekdayOf(today);
  const st = data.settings;
  const pd = programDay(st.startDate, today);
  const phase = phaseForWeek(pd.week);
  const checkIn = data.dailyLogs[today]?.checkIn;
  const readiness = checkIn ? assessReadiness(checkIn) : undefined;
  const [checkOpen, setCheckOpen] = useState(false);

  const morning = morningPlanFor(data, today, { readiness: readiness?.level === 'recovery' ? 'recovery' : undefined });
  const morningSteps = buildMorningSteps(morning, st, { lowOnlyHiit: readiness ? !readiness.allowHighIntensityHiit : false });
  const evening = eveningBlockFor(data, today);
  const eveningSteps = buildEveningSteps(evening.block, st);
  const fast = fastingStatus(st.eatStart, st.eatEnd, now);
  const protein = (data.nutrition[today]?.meals ?? []).reduce((a, m) => a + m.proteinG, 0);
  const week = weekStats(data.workoutLogs, today, st.startDate);
  const todayMorningLog = data.workoutLogs.filter((l) => l.dateKey === today && l.kind === 'morning').pop();
  const advice = evaluateProgression(st, data.workoutLogs, data.dailyLogs, today);
  const hasActive = session && session.status !== 'finished';

  const startMorning = (useRecommended: boolean, r?: ReadinessResult) => {
    unlockAudio();
    const rr = r ?? readiness;
    const plan = morningPlanFor(data, today, { readiness: rr?.level === 'recovery' ? 'recovery' : undefined, useRecommended });
    const steps = buildMorningSteps(plan, st, { lowOnlyHiit: rr ? !rr.allowHighIntensityHiit : false });
    const s = createSession({ id: `m-${today}-${Date.now()}`, kind: 'morning', dateKey: today, title: `${WEEKDAY_ZH[wd]}早晨｜${plan.title}`, variant: plan.variant, steps });
    setSession(reduce(s, { type: 'start', now: Date.now() }));
    setWorkoutOpen(true);
    setCheckOpen(false);
  };

  const startEvening = () => {
    unlockAudio();
    const s = createSession({ id: `e-${today}-${Date.now()}`, kind: 'evening', dateKey: today, title: `${WEEKDAY_ZH[wd]}晚間｜${evening.block.title}`, steps: eveningSteps });
    setSession(reduce(s, { type: 'start', now: Date.now() }));
    setWorkoutOpen(true);
  };

  const onStartClick = () => {
    if (hasActive) {
      setWorkoutOpen(true);
      return;
    }
    if (!checkIn) setCheckOpen(true);
    else if (readiness?.level === 'stop') setCheckOpen(true);
    else startMorning(true);
  };

  return (
    <div>
      {/* 標題 */}
      <div className="flex items-end justify-between px-1 pt-2">
        <div>
          <div className="text-sm text-slate-400">{today.slice(5).replace('-', ' 月 ')} 日</div>
          <h1 className="text-3xl font-black">{WEEKDAY_ZH[wd]}</h1>
        </div>
        <div className="text-right">
          {pd.started ? (
            <>
              <div className="text-3xl font-black text-hero tabular-nums">Day {pd.day}<span className="text-base text-slate-500"> / 90</span></div>
              <div className="text-xs text-slate-400">第 {pd.week} 週 · {phase.title}</div>
            </>
          ) : (
            <div className="text-sm text-slate-400">計畫 {st.startDate} 開始</div>
          )}
        </div>
      </div>

      {!st.onboarded && <Onboarding />}

      {hasActive && (
        <Card className="mt-4 border-hero/60 bg-hero/10">
          <div className="font-bold text-hero">有一筆未完成的訓練</div>
          <div className="text-sm text-slate-300">{session!.title}（{session!.dateKey}）</div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={() => setWorkoutOpen(true)}>繼續訓練</Button>
            <Button variant="ghost" onClick={() => { setSession(reduce(session!, { type: 'finish', now: Date.now(), early: true })); setWorkoutOpen(true); }}>結束並保存</Button>
          </div>
        </Card>
      )}

      {/* 早晨訓練 */}
      <SectionTitle right={<span className="text-xs text-slate-500">{st.morningTime} 開始</span>}>今日早晨訓練</SectionTitle>
      <Card>
        <div className="flex items-center gap-2">
          <Pill className={VARIANT_COLOR[morning.variant]}>{morning.title}</Pill>
          <span className="text-sm text-slate-400">{morning.rounds} 輪 · 約 {fmtHM(estimateTotalSec(morningSteps))}</span>
        </div>
        {readiness?.level === 'recovery' && <div className="mt-2 text-sm text-info">依今日狀態改為恢復版：{readiness.reasons.join('、')}</div>}
        <ol className="mt-3 space-y-1.5 text-[15px]">
          <li className="text-slate-400">① 動態暖身 {st.warmupMin} 分鐘</li>
          {morning.items.map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>② {exName(data.exercises, it.exerciseId)}</span>
              <span className="font-bold tabular-nums">{Math.min(it.sets, morning.rounds)} 組 × {targetText(it.target)}</span>
            </li>
          ))}
          <li className="text-slate-400">③ HASfit HIIT 約 {st.hiitMinutes} 分鐘（{morning.hiitIntensity === 'low' || (readiness && !readiness.allowHighIntensityHiit) ? '低強度' : '依恢復調整'}）</li>
          <li className="text-slate-400">④ 緩和伸展 {st.cooldownMin} 分鐘</li>
        </ol>
        {todayMorningLog && (
          <div className="mt-3 rounded-lg bg-ok/15 p-2 text-sm text-ok">今天已完成 {todayMorningLog.completedSets}/{todayMorningLog.plannedSets} 組{todayMorningLog.endedEarly ? '（提前結束）' : ''}</div>
        )}
        <Button variant="primary" big className="mt-4 w-full py-5 text-2xl" onClick={onStartClick}>
          {hasActive ? '▶ 繼續訓練' : todayMorningLog ? '再練一次' : '👊 開始今日訓練'}
        </Button>
        {checkIn && <button type="button" className="mt-2 w-full text-center text-xs text-slate-500 underline" onClick={() => setCheckOpen(true)}>重新填寫今日狀態</button>}
      </Card>

      {/* 晚間健身 */}
      <SectionTitle right={<span className="text-xs text-slate-500">20:30 出門 · 上限 2 小時</span>}>今日晚上健身</SectionTitle>
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">{evening.block.title}</div>
          <span className="text-sm text-slate-400">約 {fmtHM(estimateTotalSec(eveningSteps))}</span>
        </div>
        {evening.block.stretchMin ? (
          <div className="mt-1 text-slate-300">全身伸展 {evening.block.stretchMin} 分鐘</div>
        ) : (
          <ul className="mt-2 space-y-1 text-[15px]">
            {evening.block.items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>{exName(data.exercises, it.exerciseId)}</span>
                <span className="tabular-nums text-slate-300">{it.sets} × {it.perSide ? '每側 ' : ''}{it.repsMin}{it.repsMax ? `–${it.repsMax}` : ''}{it.weightKg ? ` · ${it.weightKg}kg` : ''}</span>
              </li>
            ))}
            {evening.block.cardio && <li className="text-slate-400">有氧 {evening.block.cardio.min}–{evening.block.cardio.max} 分鐘</li>}
          </ul>
        )}
        <Button variant="dark" className="mt-3 w-full" onClick={startEvening} disabled={!!hasActive}>開始晚間訓練</Button>
      </Card>

      {/* 狀態 */}
      <SectionTitle>今日狀態</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs text-slate-400">16:8</div>
          <div className={`text-2xl font-black ${fast.state === 'eating' ? 'text-ok' : 'text-info'}`}>{fast.state === 'eating' ? '進食中' : '禁食中'}</div>
          <div className="mt-1 text-xs text-slate-400">{fmtHM(fast.secondsToNext)}後 {fast.nextLabel}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400">蛋白質</div>
          <div className="text-2xl font-black tabular-nums">{protein}<span className="text-sm text-slate-400"> / {st.proteinMin} g</span></div>
          <div className="mt-2"><Bar value={protein / st.proteinMin} color="bg-ok" /></div>
        </Card>
        <Card className="col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">本週完成率</div>
            <div className="text-sm font-bold">{week.completedDays} / {week.elapsedDays} 天 · {Math.round(week.rate * 100)}%</div>
          </div>
          <div className="mt-2"><Bar value={week.rate} /></div>
        </Card>
      </div>

      {advice.eligible && (
        <Card className="mt-3 border-ok/60">
          <div className="font-bold text-ok">可以考慮升級</div>
          <div className="mt-1 text-sm text-slate-300">
            近 {st.rules.lookbackDays} 天完成率 {Math.round(advice.stats.completionRate * 100)}%、平均睡眠 {advice.stats.avgSleep?.toFixed(1)} 小時。
            要把週二／週五伏地挺身與深蹲每組 +{advice.suggestedBonus - st.progressionBonus} 下嗎？（目前 +{st.progressionBonus}）
          </div>
          <Button variant="ok" className="mt-3" onClick={() => { update((d) => { d.settings.progressionBonus = advice.suggestedBonus; }); toast(`已升級為 +${advice.suggestedBonus} 下`); }}>
            確認升級
          </Button>
        </Card>
      )}

      <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} existing={checkIn} onStart={startMorning} />
    </div>
  );
}

function Onboarding() {
  const { data, update } = useApp();
  const [start, setStart] = useState(data.settings.startDate);
  return (
    <Card className="mt-4 border-hero/60">
      <div className="text-lg font-black text-hero">歡迎！設定 90 天計畫的 Day 1</div>
      <p className="mt-1 text-sm text-slate-300">預設為今天。之後可在「設定」修改。資料只存在這台裝置，記得定期備份。</p>
      <div className="mt-3 flex items-center gap-2">
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border border-line bg-panel2 px-3 py-2" />
        <Button variant="primary" onClick={() => update((d) => { d.settings.startDate = start || d.settings.startDate; d.settings.onboarded = true; })}>開始計畫</Button>
      </div>
    </Card>
  );
}

function CheckInSheet({ open, onClose, existing, onStart }: { open: boolean; onClose: () => void; existing?: CheckIn; onStart: (useRecommended: boolean, r: ReadinessResult) => void }) {
  const { data, update } = useApp();
  const [sleep, setSleep] = useState<number | undefined>(existing?.sleepHours ?? 6);
  const [energy, setEnergy] = useState(existing?.energy ?? 3);
  const [sore, setSore] = useState(existing?.soreness ?? 2);
  const [red, setRed] = useState(existing?.redFlags ?? false);
  const [result, setResult] = useState<ReadinessResult | null>(null);

  const submit = () => {
    const today = dateKey();
    const c: CheckIn = { sleepHours: sleep ?? 0, energy, soreness: sore, redFlags: red, at: Date.now() };
    update((d) => {
      const prev = d.dailyLogs[today] ?? { dateKey: today };
      d.dailyLogs[today] = { ...prev, checkIn: c, sleepHours: c.sleepHours, energy: c.energy, soreness: c.soreness };
    });
    const r = assessReadiness(c);
    if (r.level === 'normal') {
      setResult(null);
      onStart(true, r);
    } else setResult(r);
  };

  return (
    <Sheet open={open} onClose={() => { setResult(null); onClose(); }} title="開始前的身體檢查">
      {!result && (
        <div className="space-y-5">
          <div>
            <div className="mb-2 font-bold">昨晚實際睡了幾小時？</div>
            <div className="flex items-center gap-2">
              <NumInput value={sleep} onChange={setSleep} step={0.5} className="w-28 text-2xl" />
              <span className="text-slate-400">小時</span>
              <span className="ml-auto text-xs text-slate-500">目標 {data.settings.morningTime} 起床</span>
            </div>
          </div>
          <div>
            <div className="mb-2 font-bold">今天精神程度（1–5）</div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setEnergy(n)} className={`rounded-xl py-3 text-xl font-black ${energy === n ? 'bg-hero text-black' : 'bg-panel2'}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-between font-bold"><span>肌肉痠痛程度（0–10）</span><span className="text-hero">{sore}</span></div>
            <input type="range" min={0} max={10} value={sore} onChange={(e) => setSore(Number(e.target.value))} className="w-full accent-[#ffd400]" />
          </div>
          <div>
            <div className="mb-2 font-bold">是否有頭暈、胸痛或明顯身體不適？</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRed(false)} className={`rounded-xl py-3 font-bold ${!red ? 'bg-ok text-black' : 'bg-panel2'}`}>沒有</button>
              <button type="button" onClick={() => setRed(true)} className={`rounded-xl py-3 font-bold ${red ? 'bg-punch text-white' : 'bg-panel2'}`}>有</button>
            </div>
          </div>
          <Button variant="primary" big className="w-full" onClick={submit} disabled={sleep == null}>送出並開始</Button>
        </div>
      )}
      {result?.level === 'stop' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-punch bg-punch/15 p-4">
            <div className="text-2xl font-black text-punch">⚠ 今天請停止運動</div>
            <p className="mt-2 text-slate-200">{result.reasons[0]}</p>
            <p className="mt-2 text-sm text-slate-300">休息不是失敗。身體恢復後再回來，App 不會因為今天沒練而扣分。</p>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setResult(null)}>我填錯了，重新填寫</Button>
          <Button variant="dark" className="w-full" onClick={onClose}>關閉</Button>
        </div>
      )}
      {result?.level === 'recovery' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-info bg-info/10 p-4">
            <div className="text-xl font-black text-info">今天建議恢復版</div>
            <ul className="mt-2 list-disc pl-5 text-slate-200">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="mt-2 text-sm text-slate-300">暫停高強度 HIIT，HASfit 以低強度跟練或略過。</p>
          </div>
          <Button variant="primary" big className="w-full" onClick={() => onStart(true, result)}>用恢復版開始（推薦）</Button>
          <Button variant="ghost" className="w-full" onClick={() => onStart(false, result)}>仍用原菜單（HIIT 低強度）</Button>
          <Button variant="dark" className="w-full" onClick={onClose}>今天休息</Button>
        </div>
      )}
    </Sheet>
  );
}
