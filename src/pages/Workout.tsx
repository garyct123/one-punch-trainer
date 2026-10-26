import { useEffect, useRef, useState } from 'react';
import { useApp, useNow } from '../store/AppContext';
import {
  estimateRemainingSec, exerciseOf, nextWorkStep, sessionToLog, stepElapsedMs, stepRemainingSec, totalElapsedMs, type Session, type Step,
} from '../engine/workout';
import { exName, targetSpeech, targetText } from '../engine/program';
import { fmtDuration } from '../lib/time';
import { beep, keepAwake, speak, vibrate } from '../lib/voice';
import { Ring } from '../components/Ring';
import { Bar, Button, Stepper } from '../components/ui';
import { HIIT_VIDEO } from '../data/exercises';
import type { Exercise } from '../types';

function announce(step: Step, s: Session, exs: Exercise[]): string {
  switch (step.kind) {
    case 'block':
      return `開始${step.title}，${Math.round(step.seconds / 60)}分鐘`;
    case 'rest': {
      const n = nextWorkStep(s);
      const nn = n?.kind === 'set' ? `，下一個，${exName(exs, n.exerciseId)}` : '';
      return `休息${step.seconds}秒${nn}`;
    }
    case 'hiit':
      return '開始 HASfit HIIT，請打開影片跟練，完成後回來按 HIIT 已完成';
    case 'set': {
      const side = step.side ? (step.side === 'L' ? '，左側' : '，右側') : '';
      return `第${step.round}組，${exName(exs, step.exerciseId)}${side}，${targetSpeech(step.target)}`;
    }
  }
}

export function WorkoutScreen() {
  const { session, dispatch, data, setWorkoutOpen, setSession, toast } = useApp();
  const now = useNow(250);
  const s = session!;
  const step = s.steps[s.index];
  const exs = data.exercises;
  const st = data.settings;
  const [actual, setActual] = useState(0);
  const [weight, setWeight] = useState(0);
  const [flash, setFlash] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const lastBeep = useRef<string>('');
  const lastAnnounce = useRef<string>('');

  // 休息倒數到期：由時間戳判斷，自動進入下一步
  useEffect(() => {
    if (s.status === 'running' && step?.kind === 'rest') dispatch({ type: 'tick', now });
  }, [now, s.status, step, dispatch]);

  // 每次進入新步驟：設定預設實際值並語音提示
  useEffect(() => {
    if (!step || s.status === 'finished') return;
    if (step.kind === 'set') {
      setActual(step.target.kind === 'reps' ? step.target.min : step.target.seconds);
      setWeight(step.weightKg ?? 0);
    } else if (step.kind === 'hiit') {
      setActual(step.minutes);
    }
    const key = `${s.id}-${s.index}`;
    if (s.status === 'running' && lastAnnounce.current !== key) {
      lastAnnounce.current = key;
      speak(announce(step, s, exs), st.voiceOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.index, s.status, s.id]);

  // 最後 5 秒提示音；計時結束提示
  const remaining = stepRemainingSec(s, now);
  useEffect(() => {
    if (s.status !== 'running' || remaining == null || !step) return;
    const sec = Math.ceil(remaining);
    if (sec <= 5 && sec >= 1) {
      const k = `${s.index}-${sec}`;
      if (lastBeep.current !== k) {
        lastBeep.current = k;
        beep(st.beepOn, 880, 120);
      }
    } else if (sec <= 0 && step.kind !== 'rest') {
      const k = `${s.index}-end`;
      if (lastBeep.current !== k) {
        lastBeep.current = k;
        beep(st.beepOn, 1320, 400);
        vibrate(st.vibrateOn, [200, 100, 200]);
        speak('時間到，確認完成後按完成', st.voiceOn);
      }
    }
  }, [remaining, s.status, s.index, step, st.beepOn, st.voiceOn, st.vibrateOn]);

  useEffect(() => {
    keepAwake(s.status === 'running');
    return () => {
      keepAwake(false);
    };
  }, [s.status]);

  if (s.status === 'finished') return <Summary />;

  const workSteps = s.steps.filter((x) => x.kind !== 'rest');
  const doneCount = workSteps.filter((x) => s.results[x.id]).length;
  const next = nextWorkStep(s);
  const paused = s.status === 'paused';
  const elapsedStep = stepElapsedMs(s, now) / 1000;

  const complete = () => {
    if (step.kind === 'set' || step.kind === 'hiit') dispatch({ type: 'complete', now: Date.now(), actual, weightKg: step.kind === 'set' && step.section === 'gym' ? weight : undefined });
    else dispatch({ type: 'complete', now: Date.now() });
    setFlash(true);
    vibrate(st.vibrateOn, 60);
    beep(st.beepOn, 660, 100);
    setTimeout(() => setFlash(false), 450);
  };

  const ex = step.kind === 'set' ? exerciseOf(exs, step.exerciseId) : undefined;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
      {flash && <div className="pointer-events-none fixed inset-0 z-50 animate-[ping_0.45s_ease-out] bg-ok/25" />}
      {/* 頂部 */}
      <div className="flex items-center justify-between px-4 pt-3">
        <button type="button" onClick={() => setWorkoutOpen(false)} className="rounded-full bg-panel2 px-3 py-1.5 text-sm" aria-label="縮小">⌄ 縮小</button>
        <div className="text-center">
          <div className="text-xs text-slate-400">{s.title}</div>
          <div className="font-mono text-sm tabular-nums">已練 {fmtDuration(totalElapsedMs(s, now) / 1000)} · 剩約 {fmtDuration(estimateRemainingSec(s, now))}</div>
        </div>
        <button type="button" onClick={() => setConfirmEnd(true)} className="rounded-full bg-panel2 px-3 py-1.5 text-sm text-punch">結束</button>
      </div>
      <div className="px-4 pt-3">
        <Bar value={workSteps.length ? doneCount / workSteps.length : 0} />
        <div className="mt-1 text-right text-xs text-slate-500">{doneCount} / {workSteps.length} 步</div>
      </div>

      {/* 主要內容 */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 text-center">
        {s.status === 'ready' && (
          <Button variant="primary" big onClick={() => dispatch({ type: 'start', now: Date.now() })}>開始</Button>
        )}

        {s.status !== 'ready' && step.kind === 'set' && (
          <>
            <div className="mb-1 text-sm font-bold tracking-widest text-hero">
              {step.section === 'circuit' ? '一拳超人循環' : '健身房'} · 第 {step.round} / {step.totalRounds} 組
            </div>
            <h1 className="text-4xl font-black leading-tight">{ex?.nameZh ?? step.exerciseId}</h1>
            {step.side && <div className="mt-1 text-2xl font-bold text-info">{step.side === 'L' ? '左側' : '右側'}</div>}
            <div className="mt-1 text-sm text-slate-400">{ex?.nameEn}</div>
            <div className="my-4 text-2xl font-bold text-slate-200">目標 {targetText(step.target)}</div>
            {step.target.kind === 'time' ? (
              <Ring progress={Math.min(1, elapsedStep / step.target.seconds)} size={210} color={remaining != null && remaining <= 0 ? '#22d39b' : '#ffd400'}>
                <div className="text-6xl font-black tabular-nums">{Math.max(0, Math.ceil(remaining ?? 0))}</div>
                <div className="text-sm text-slate-400">{remaining != null && remaining <= 0 ? '時間到！按完成確認' : '秒'}</div>
              </Ring>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm text-slate-400">實際完成次數</div>
                <Stepper big value={actual} onChange={setActual} min={0} max={200} suffix="下" />
              </div>
            )}
            {step.target.kind === 'time' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">實際秒數 <Stepper value={actual} onChange={setActual} step={5} max={600} suffix="秒" /></div>
            )}
            {step.section === 'gym' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">重量 <Stepper value={weight} onChange={setWeight} step={2.5} max={500} suffix="kg" /></div>
            )}
            {ex && (
              <details className="mt-4 w-full max-w-sm rounded-xl bg-panel p-3 text-left text-sm">
                <summary className="cursor-pointer font-bold text-slate-300">姿勢提示・簡單版</summary>
                <ul className="mt-2 list-disc pl-5 text-slate-300">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
                <div className="mt-2 text-slate-400">太難？改成：{ex.easier}</div>
                <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-info underline">
                  {ex.videoStatus === 'search' ? '在 YouTube 搜尋教學影片' : '觀看教學影片'}
                </a>
              </details>
            )}
          </>
        )}

        {s.status !== 'ready' && step.kind === 'rest' && (
          <>
            <div className="mb-3 text-lg font-bold text-info">{step.label}</div>
            <Ring progress={1 - Math.max(0, remaining ?? 0) / step.seconds} size={240} color="#3ea6ff">
              <div className="text-7xl font-black tabular-nums">{Math.max(0, Math.ceil(remaining ?? 0))}</div>
              <div className="text-sm text-slate-400">秒</div>
            </Ring>
            {next && (
              <div className="mt-6 rounded-xl bg-panel px-4 py-3">
                <div className="text-xs text-slate-400">下一個</div>
                <div className="text-xl font-bold">
                  {next.kind === 'set' ? `${exName(exs, next.exerciseId)}${next.side ? (next.side === 'L' ? '（左）' : '（右）') : ''} · ${targetText(next.target)}` : next.kind === 'hiit' ? 'HASfit HIIT' : next.kind === 'block' ? next.title : ''}
                </div>
              </div>
            )}
          </>
        )}

        {s.status !== 'ready' && step.kind === 'block' && (
          <>
            <div className="mb-1 text-sm font-bold tracking-widest text-hero">{step.section === 'warmup' ? 'STEP 1' : step.section === 'cooldown' ? '最後一步' : ''}</div>
            <h1 className="mb-4 text-4xl font-black">{step.title}</h1>
            <Ring progress={Math.min(1, elapsedStep / step.seconds)} size={220} color={remaining != null && remaining <= 0 ? '#22d39b' : '#ffd400'}>
              <div className="text-5xl font-black tabular-nums">{fmtDuration(Math.max(0, remaining ?? 0))}</div>
              <div className="text-sm text-slate-400">{remaining != null && remaining <= 0 ? '時間到！按完成' : '剩餘'}</div>
            </Ring>
            <div className="mt-5 w-full max-w-sm rounded-xl bg-panel p-3 text-left">
              {step.moves.map((m, i) => {
                const segLen = step.seconds / step.moves.length;
                const active = elapsedStep >= i * segLen && elapsedStep < (i + 1) * segLen;
                return (
                  <div key={m} className={`py-1 ${active ? 'font-bold text-hero' : 'text-slate-400'}`}>
                    {active ? '▶ ' : '・'}{m}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {s.status !== 'ready' && step.kind === 'hiit' && <HiitStep step={step} minutes={actual} setMinutes={setActual} />}
      </div>

      {/* 控制列：單手操作 */}
      {s.status !== 'ready' && (
        <div className="border-t border-line bg-panel px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Button variant="ghost" onClick={() => dispatch({ type: 'back', now: Date.now() })} disabled={s.index === 0}>⟲ 返回</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: paused ? 'resume' : 'pause', now: Date.now() })}>{paused ? '▶ 繼續' : 'Ⅱ 暫停'}</Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'skip', now: Date.now() })}>跳過 ⏭</Button>
          </div>
          {step.kind === 'rest' ? (
            <Button variant="dark" big className="w-full" onClick={() => dispatch({ type: 'skip', now: Date.now() })}>跳過休息</Button>
          ) : (
            <Button variant="ok" big className="w-full py-5 text-2xl" onClick={complete} disabled={paused}>
              {step.kind === 'hiit' ? '✓ HIIT 已完成' : '✓ 完成'}
            </Button>
          )}
          {paused && <div className="mt-2 text-center text-sm text-hero">已暫停</div>}
        </div>
      )}

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-panel p-5">
            <h3 className="text-xl font-black">要結束今天的訓練嗎？</h3>
            <p className="mt-2 text-slate-300">已完成的組數會保存，未做的不會被記為完成。</p>
            <div className="mt-4 grid gap-2">
              <Button variant="primary" onClick={() => { dispatch({ type: 'finish', now: Date.now(), early: true }); setConfirmEnd(false); }}>結束並保存部分進度</Button>
              <Button variant="ghost" onClick={() => setConfirmEnd(false)}>繼續訓練</Button>
              <Button variant="ghost" className="text-punch" onClick={() => {
                if (confirm('確定丟棄這次訓練？不會留下任何紀錄。')) { setSession(null); setWorkoutOpen(false); toast('已丟棄'); }
              }}>丟棄這次訓練</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HiitStep({ step, minutes, setMinutes }: { step: Extract<Step, { kind: 'hiit' }>; minutes: number; setMinutes: (n: number) => void }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="w-full max-w-sm">
      <div className="mb-1 text-sm font-bold tracking-widest text-hero">HIIT 跟練</div>
      <a href={HIIT_VIDEO.youtubeUrl} target="_blank" rel="noreferrer" className="relative block overflow-hidden rounded-2xl border border-line">
        {imgOk ? (
          <img src={HIIT_VIDEO.thumbnail} alt="HASfit 影片封面" className="aspect-video w-full object-cover" onError={() => setImgOk(false)} />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-panel2 text-slate-400">離線中，無法載入封面</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-punch text-3xl text-white shadow-lg">▶</div>
        </div>
      </a>
      <div className="mt-2 text-left text-sm font-bold leading-snug">{HIIT_VIDEO.title}</div>
      {step.lowOnly && <div className="mt-2 rounded-lg bg-info/15 p-2 text-left text-sm text-info">今天以低強度跟練：動作放慢、幅度縮小，覺得喘就原地踏步。</div>}
      {!step.lowOnly && <div className="mt-2 text-left text-xs text-slate-400">{step.note}</div>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={HIIT_VIDEO.youtubeUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-punch py-3 font-bold text-white">開啟 YouTube</a>
        <a href={HIIT_VIDEO.officialUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-line py-3 font-bold">官方說明</a>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">實際跟練 <Stepper value={minutes} onChange={setMinutes} max={90} suffix="分" /></div>
      <p className="mt-3 text-xs text-slate-500">App 無法偵測影片是否播完，看完回來請自己按「HIIT 已完成」。出現胸痛、頭暈或異常喘不過氣請立即停止。</p>
    </div>
  );
}

function Summary() {
  const { session, data, update, setSession, setWorkoutOpen, dispatch, toast } = useApp();
  const s = session!;
  const log = sessionToLog(s);
  const exs = data.exercises;
  const doneSets = log.sets.filter((x) => x.status === 'done');
  const totalBy = (cat: string) => doneSets.filter((x) => x.unit === 'reps' && exs.find((e) => e.id === x.exerciseId)?.category === cat).reduce((a, x) => a + (x.actual ?? 0), 0);

  const save = () => {
    update((d) => {
      d.workoutLogs = [...d.workoutLogs.filter((l) => l.id !== log.id), log];
    });
    setSession(null);
    setWorkoutOpen(false);
    toast('訓練紀錄已保存 💪');
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+20px)]">
      <div className="text-center">
        <div className="text-6xl">{log.endedEarly ? '👊' : '🏆'}</div>
        <h1 className="mt-2 text-3xl font-black">{log.endedEarly ? '今天練到這裡' : '今日訓練完成！'}</h1>
        <p className="mt-1 text-slate-400">{s.title} · 實際運動 {fmtDuration(log.activeMs / 1000)}</p>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-panel p-3"><div className="text-3xl font-black text-hero">{log.completedSets}</div><div className="text-xs text-slate-400">完成組數 / {log.plannedSets}</div></div>
        <div className="rounded-xl bg-panel p-3"><div className="text-3xl font-black">{totalBy('push') || totalBy('chest')}</div><div className="text-xs text-slate-400">{s.kind === 'morning' ? '伏地挺身' : '推類'}總次數</div></div>
        <div className="rounded-xl bg-panel p-3"><div className="text-3xl font-black">{totalBy('squat') || totalBy('legs')}</div><div className="text-xs text-slate-400">{s.kind === 'morning' ? '深蹲' : '腿部'}總次數</div></div>
      </div>
      {log.hiit && (
        <div className="mt-3 rounded-xl bg-panel p-3 text-center">HIIT：{log.hiit.done ? `✓ 完成 ${log.hiit.minutes ?? ''} 分鐘` : '未完成（不計入）'}</div>
      )}
      <h2 className="mb-2 mt-5 text-sm font-bold text-slate-400">逐組紀錄（可修正實際次數）</h2>
      <div className="space-y-1.5">
        {log.sets.map((x) => (
          <div key={x.stepId} className="flex items-center justify-between rounded-lg bg-panel px-3 py-2 text-sm">
            <div>
              <div className="font-bold">{exName(exs, x.exerciseId)}{x.side ? (x.side === 'L' ? '（左）' : '（右）') : ''} <span className="font-normal text-slate-500">第 {x.round} 組</span></div>
              <div className="text-xs text-slate-500">目標 {x.targetText}{x.weightKg ? ` · ${x.weightKg} kg` : ''}</div>
            </div>
            {x.status === 'done' ? (
              <Stepper value={x.actual ?? 0} onChange={(v) => dispatch({ type: 'editResult', stepId: x.stepId, actual: v })} suffix={x.unit === 'sec' ? '秒' : '下'} />
            ) : (
              <span className="text-slate-500">跳過</span>
            )}
          </div>
        ))}
        {log.sets.length === 0 && <div className="rounded-lg bg-panel p-3 text-center text-slate-500">沒有記錄任何組數</div>}
      </div>
      <p className="mt-4 text-center text-sm text-slate-400">早上訓練後下一餐在 {data.settings.eatStart} 進食窗口開始，第一餐記得優先補充蛋白質。</p>
      <div className="mt-5 grid gap-2">
        <Button variant="primary" big onClick={save}>保存紀錄</Button>
        <Button variant="ghost" onClick={() => { if (confirm('不保存這次訓練？')) { setSession(null); setWorkoutOpen(false); } }}>不保存</Button>
      </div>
    </div>
  );
}
