import { useRef } from 'react';
import { useApp } from '../store/AppContext';
import { Button, Card, Field, NumInput, SectionTitle, Toggle, inputCls } from '../components/ui';
import { dailyToCSV, exportJSON, importDailyCSV, importWorkoutsCSV, parseBackup, workoutsToCSV } from '../lib/backup';
import { dateKey, WEEKDAY_SHORT } from '../lib/time';
import { speak, speechSupported, unlockAudio, beep } from '../lib/voice';
import { createDefaultData } from '../data/defaults';
import type { Weekday } from '../types';

function download(name: string, text: string, type: string) {
  const blob = new Blob([type.includes('csv') ? '﻿' + text : text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function SettingsPage() {
  const { data, update, replaceData, toast, setSession } = useApp();
  const st = data.settings;
  const r = st.rules;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (fn: (s: typeof st) => void) => update((d) => fn(d.settings));
  const stamp = dateKey();

  const onImport = async (file: File) => {
    const text = await file.text();
    try {
      if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{')) {
        const d = parseBackup(text);
        if (!confirm(`匯入會取代目前所有資料（${d.workoutLogs.length} 筆訓練紀錄）。確定？`)) return;
        replaceData(d);
        toast('已匯入 JSON 備份');
      } else {
        const header = text.replace(/^﻿/, '').split(/\r?\n/)[0];
        if (header.includes('session_id')) {
          update((d) => { d.workoutLogs = importWorkoutsCSV(text, d.workoutLogs); });
          toast('已匯入訓練 CSV');
        } else if (header.startsWith('date')) {
          update((d) => { d.dailyLogs = importDailyCSV(text, d.dailyLogs); });
          toast('已匯入每日紀錄 CSV');
        } else throw new Error('無法辨識的 CSV 格式');
      }
    } catch (e) {
      alert(`匯入失敗：${(e as Error).message}`);
    }
  };

  return (
    <div>
      <h1 className="px-1 pt-2 text-3xl font-black">設定與備份</h1>

      <SectionTitle>計畫</SectionTitle>
      <Card>
        <Field label="Day 1 開始日期"><input type="date" className={inputCls} value={st.startDate} onChange={(e) => e.target.value && set((s) => { s.startDate = e.target.value; })} /></Field>
        <Field label="早晨訓練時間"><input type="time" className={inputCls} value={st.morningTime} onChange={(e) => e.target.value && set((s) => { s.morningTime = e.target.value; })} /></Field>
        <Field label="星期六第一週">
          <select className={inputCls} value={st.saturdayFirst} onChange={(e) => set((s) => { s.saturdayFirst = e.target.value as 'chest' | 'back'; })}>
            <option value="chest">胸部週</option>
            <option value="back">背部週</option>
          </select>
        </Field>
        <Field label="身高 / 體重"><span className="flex items-center gap-1"><NumInput value={st.heightCm} onChange={(v) => set((s) => { s.heightCm = v; })} className="w-16" />cm <NumInput value={st.weightKg} step={0.1} onChange={(v) => set((s) => { s.weightKg = v; })} className="w-16" />kg</span></Field>
      </Card>

      <SectionTitle>計時器</SectionTitle>
      <Card>
        <div className="py-2">
          <div className="mb-2 text-slate-300">每輪休息</div>
          <div className="grid grid-cols-4 gap-2">
            {[30, 45, 60, 90].map((n) => (
              <button key={n} type="button" onClick={() => set((s) => { s.restSec = n; })} className={`rounded-xl py-2.5 font-bold ${st.restSec === n ? 'bg-hero text-black' : 'bg-panel2'}`}>{n} 秒</button>
            ))}
          </div>
        </div>
        <Field label="同輪動作轉換（秒）"><NumInput value={st.transitionSec} step={5} onChange={(v) => set((s) => { s.transitionSec = Math.max(0, v ?? 0); })} className="w-20" /></Field>
        <Field label="暖身（分鐘）"><NumInput value={st.warmupMin} onChange={(v) => set((s) => { s.warmupMin = Math.max(1, v ?? 5); })} className="w-20" /></Field>
        <Field label="緩和（分鐘）"><NumInput value={st.cooldownMin} onChange={(v) => set((s) => { s.cooldownMin = Math.max(1, v ?? 5); })} className="w-20" /></Field>
        <Field label="HIIT 預估時長（分鐘）"><NumInput value={st.hiitMinutes} onChange={(v) => set((s) => { s.hiitMinutes = Math.max(1, v ?? 15); })} className="w-20" /></Field>
        <Toggle label="語音提醒" checked={st.voiceOn} onChange={(v) => set((s) => { s.voiceOn = v; })} />
        <Toggle label="提示音" checked={st.beepOn} onChange={(v) => set((s) => { s.beepOn = v; })} />
        <Toggle label="震動（iPhone 不支援）" checked={st.vibrateOn} onChange={(v) => set((s) => { s.vibrateOn = v; })} />
        <Button variant="ghost" className="mt-2 w-full" onClick={() => { unlockAudio(); beep(true); if (!speak('下一組，伏地挺身，12下', true)) toast(speechSupported() ? '語音播放失敗' : '此瀏覽器不支援語音，將只用提示音與畫面提示'); }}>測試語音與提示音</Button>
      </Card>

      <SectionTitle>營養</SectionTitle>
      <Card>
        <Field label="進食窗口"><span className="flex items-center gap-1"><input type="time" className={inputCls} value={st.eatStart} onChange={(e) => e.target.value && set((s) => { s.eatStart = e.target.value; })} />–<input type="time" className={inputCls} value={st.eatEnd} onChange={(e) => e.target.value && set((s) => { s.eatEnd = e.target.value; })} /></span></Field>
        <Field label="蛋白質目標 g"><span className="flex items-center gap-1"><NumInput value={st.proteinMin} onChange={(v) => set((s) => { s.proteinMin = v ?? 135; })} className="w-16" />–<NumInput value={st.proteinMax} onChange={(v) => set((s) => { s.proteinMax = v ?? 160; })} className="w-16" /></span></Field>
        <Field label="飲水目標 ml"><NumInput value={st.waterTargetMl} step={250} onChange={(v) => set((s) => { s.waterTargetMl = v ?? 3000; })} className="w-24" /></Field>
      </Card>

      <SectionTitle>進階規則</SectionTitle>
      <Card>
        <p className="mb-2 text-xs text-slate-500">日曆進入下一週不會自動加量；必須同時符合下列條件，並由你按「確認升級」。</p>
        <Field label="回顧天數"><NumInput value={r.lookbackDays} onChange={(v) => set((s) => { s.rules.lookbackDays = Math.max(3, v ?? 14); })} className="w-20" /></Field>
        <Field label="最低完成率 %"><NumInput value={Math.round(r.minCompletionRate * 100)} onChange={(v) => set((s) => { s.rules.minCompletionRate = (v ?? 80) / 100; })} className="w-20" /></Field>
        <Field label="最低平均睡眠（小時）"><NumInput value={r.minAvgSleep} step={0.5} onChange={(v) => set((s) => { s.rules.minAvgSleep = v ?? 6; })} className="w-20" /></Field>
        <Field label="最高平均痠痛（0–10）"><NumInput value={r.maxAvgSoreness} onChange={(v) => set((s) => { s.rules.maxAvgSoreness = v ?? 5; })} className="w-20" /></Field>
        <Field label="最低平均精神（1–5）"><NumInput value={r.minEnergy} onChange={(v) => set((s) => { s.rules.minEnergy = v ?? 3; })} className="w-20" /></Field>
        <Field label="第幾週起評估"><NumInput value={r.minWeekToProgress} onChange={(v) => set((s) => { s.rules.minWeekToProgress = v ?? 3; })} className="w-20" /></Field>
        <Field label="每次升級 +下"><NumInput value={r.bonusStep} onChange={(v) => set((s) => { s.rules.bonusStep = Math.max(1, v ?? 1); })} className="w-20" /></Field>
        <Field label="加次數上限"><NumInput value={r.maxBonusReps} onChange={(v) => set((s) => { s.rules.maxBonusReps = v ?? 8; })} className="w-20" /></Field>
        <Field label="目前加次數"><NumInput value={st.progressionBonus} onChange={(v) => set((s) => { s.progressionBonus = Math.max(0, v ?? 0); })} className="w-20" /></Field>
        <div className="py-2">
          <div className="mb-2 text-slate-300">進階日</div>
          <div className="grid grid-cols-7 gap-1">
            {[1, 2, 3, 4, 5, 6, 0].map((w) => (
              <button key={w} type="button" onClick={() => set((s) => { const on = s.rules.progressionDays.includes(w as Weekday); s.rules.progressionDays = on ? s.rules.progressionDays.filter((x) => x !== w) : [...s.rules.progressionDays, w as Weekday]; })}
                className={`rounded-lg py-2 font-bold ${r.progressionDays.includes(w as Weekday) ? 'bg-hero text-black' : 'bg-panel2'}`}>{WEEKDAY_SHORT[w]}</button>
            ))}
          </div>
        </div>
        <Toggle label="第 13 週自動減量" checked={r.deloadWeek13} onChange={(v) => set((s) => { s.rules.deloadWeek13 = v; })} />
        <Field label="減量週輪數"><NumInput value={r.deloadRounds} onChange={(v) => set((s) => { s.rules.deloadRounds = Math.max(1, v ?? 3); })} className="w-20" /></Field>
      </Card>

      <SectionTitle>資料備份</SectionTitle>
      <Card>
        <p className="mb-3 text-sm text-slate-400">資料只存在這台裝置（IndexedDB）。iPhone 若清除網站資料或刪除主畫面 App，資料會消失，請定期匯出。</p>
        <div className="grid gap-2">
          <Button variant="primary" onClick={() => download(`one-punch-backup-${stamp}.json`, exportJSON(data), 'application/json')}>匯出完整備份（JSON）</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="dark" onClick={() => download(`one-punch-workouts-${stamp}.csv`, workoutsToCSV(data.workoutLogs), 'text/csv')}>訓練 CSV</Button>
            <Button variant="dark" onClick={() => download(`one-punch-daily-${stamp}.csv`, dailyToCSV(data.dailyLogs), 'text/csv')}>每日紀錄 CSV</Button>
          </div>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>匯入 JSON / CSV</Button>
          <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
          <Button variant="ghost" className="text-punch" onClick={() => {
            if (confirm('清除所有資料並恢復預設？此動作無法復原，建議先匯出備份。') && confirm('真的要清除嗎？')) {
              replaceData(createDefaultData());
              setSession(null);
              toast('已重設');
            }
          }}>清除所有資料</Button>
        </div>
      </Card>

      <SectionTitle>加入 iPhone 主畫面</SectionTitle>
      <Card className="text-sm leading-relaxed text-slate-300">
        <ol className="list-decimal pl-5">
          <li>用 <b>Safari</b> 開啟本 App 網址</li>
          <li>點下方「分享」按鈕（方框加箭頭）</li>
          <li>選「加入主畫面」→「新增」</li>
          <li>之後從主畫面圖示開啟，就像一般 App，可離線使用菜單與計時器</li>
        </ol>
        <p className="mt-2 text-xs text-slate-500">iPhone 鎖定螢幕或切到背景時，系統可能暫停計時與語音。回到 App 後計時會依時間戳自動校正，訓練進度不會遺失。訓練中 App 會嘗試保持螢幕常亮。</p>
      </Card>
      <p className="my-6 text-center text-xs text-slate-600">ONE PUNCH TRAINER v1.0 · 本 App 不提供醫療建議</p>
    </div>
  );
}
