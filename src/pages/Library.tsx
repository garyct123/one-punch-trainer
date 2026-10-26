import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Button, Card, Pill, Sheet, inputCls } from '../components/ui';
import { ytSearch } from '../data/exercises';
import type { Exercise, ExerciseCategory } from '../types';

const CAT: Record<ExerciseCategory, string> = {
  push: '推', squat: '蹲', core: '核心', chest: '胸', back: '背', arms: '手臂', legs: '腿', stretch: '伸展', cardio: '有氧',
};

export function VideoBadge({ e }: { e: Exercise }) {
  if (e.videoStatus === 'verified') return <Pill className="bg-ok/20 text-ok">✓ 已驗證影片</Pill>;
  if (e.videoStatus === 'custom') return <Pill className="bg-info/20 text-info">自訂連結</Pill>;
  return <Pill className="bg-slate-700 text-slate-300">YouTube 搜尋（未驗證）</Pill>;
}

export function LibraryPage() {
  const { data } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ExerciseCategory | 'all'>('all');
  const [sel, setSel] = useState<string | null>(null);
  const list = data.exercises.filter((e) => (cat === 'all' || e.category === cat) && (!q || `${e.nameZh}${e.nameEn}${e.muscles.join('')}`.toLowerCase().includes(q.toLowerCase())));
  const selected = data.exercises.find((e) => e.id === sel);

  return (
    <div>
      <h1 className="px-1 pt-2 text-3xl font-black">動作影片庫</h1>
      <input className={`${inputCls} mt-3 w-full`} placeholder="搜尋動作、英文名、肌群" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {(['all', ...Object.keys(CAT)] as const).map((c) => (
          <button key={c} type="button" onClick={() => setCat(c as ExerciseCategory | 'all')} className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${cat === c ? 'bg-hero text-black' : 'bg-panel2 text-slate-300'}`}>
            {c === 'all' ? '全部' : CAT[c as ExerciseCategory]}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {list.map((e) => (
          <Card key={e.id} onClick={() => setSel(e.id)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{e.nameZh}</div>
                <div className="text-sm text-slate-400">{e.nameEn}</div>
                <div className="mt-1 text-xs text-slate-500">{e.muscles.join('・')}</div>
              </div>
              <div className="text-right">
                <Pill>{CAT[e.category]}</Pill>
                <div className="mt-1 text-xs text-slate-400">{e.defaultSets} 組 × {e.defaultTarget}</div>
              </div>
            </div>
          </Card>
        ))}
        <AddExercise />
      </div>
      {selected && <ExerciseSheet e={selected} onClose={() => setSel(null)} />}
      <p className="mt-4 px-1 text-xs text-slate-500">
        「YouTube 搜尋」代表 App 沒有驗證特定影片，只會幫你打開搜尋結果。找到喜歡的影片後，可在動作詳情貼上網址，會標示為「自訂連結」。
      </p>
    </div>
  );
}

function AddExercise() {
  const { update, toast } = useApp();
  return (
    <Button variant="ghost" className="w-full" onClick={() => {
      const name = prompt('新動作中文名稱');
      if (!name) return;
      const id = `custom-${Date.now()}`;
      update((d) => {
        d.exercises.push({ id, nameZh: name, nameEn: '', category: 'legs', muscles: [], videoUrl: ytSearch(name), videoStatus: 'search', defaultSets: 3, defaultTarget: '10 下', cues: [], mistakes: [], easier: '', harder: '' });
      });
      toast('已新增，可點開編輯');
    }}>＋ 新增動作</Button>
  );
}

function ExerciseSheet({ e, onClose }: { e: Exercise; onClose: () => void }) {
  const { update, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(e);
  const save = () => {
    update((d) => {
      const i = d.exercises.findIndex((x) => x.id === e.id);
      const urlChanged = draft.videoUrl !== e.videoUrl;
      d.exercises[i] = { ...draft, videoStatus: urlChanged ? (draft.videoUrl.includes('/results?') ? 'search' : 'custom') : draft.videoStatus };
    });
    setEditing(false);
    toast('已保存');
  };
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

  return (
    <Sheet open onClose={onClose} title={e.nameZh}>
      {!editing ? (
        <div className="space-y-3">
          <div className="text-slate-400">{e.nameEn}</div>
          <div className="flex flex-wrap gap-2"><VideoBadge e={e} /><Pill>{CAT[e.category]}</Pill></div>
          <a href={e.videoUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-punch py-3 text-center font-bold text-white">
            {e.videoStatus === 'search' ? '▶ 在 YouTube 搜尋教學' : '▶ 觀看教學影片'}
          </a>
          <Info title="目標肌群">{e.muscles.join('、')}</Info>
          <Info title="建議">{e.defaultSets} 組 × {e.defaultTarget}</Info>
          <Info title="姿勢提示"><ul className="list-disc pl-5">{e.cues.map((c) => <li key={c}>{c}</li>)}</ul></Info>
          <Info title="常見錯誤"><ul className="list-disc pl-5">{e.mistakes.map((c) => <li key={c}>{c}</li>)}</ul></Info>
          <Info title="簡單版">{e.easier}</Info>
          <Info title="進階版">{e.harder}</Info>
          <Button variant="ghost" className="w-full" onClick={() => { setDraft(e); setEditing(true); }}>編輯（影片網址、提示…）</Button>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <L label="中文名稱"><input className={`${inputCls} w-full`} value={draft.nameZh} onChange={(x) => setDraft({ ...draft, nameZh: x.target.value })} /></L>
          <L label="英文名稱"><input className={`${inputCls} w-full`} value={draft.nameEn} onChange={(x) => setDraft({ ...draft, nameEn: x.target.value })} /></L>
          <L label="分類">
            <select className={`${inputCls} w-full`} value={draft.category} onChange={(x) => setDraft({ ...draft, category: x.target.value as ExerciseCategory })}>
              {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </L>
          <L label="影片網址"><input className={`${inputCls} w-full`} value={draft.videoUrl} onChange={(x) => setDraft({ ...draft, videoUrl: x.target.value })} /></L>
          <L label="目標肌群（逗號分隔）"><input className={`${inputCls} w-full`} value={draft.muscles.join(',')} onChange={(x) => setDraft({ ...draft, muscles: x.target.value.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) })} /></L>
          <div className="grid grid-cols-2 gap-2">
            <L label="建議組數"><input type="number" className={`${inputCls} w-full`} value={draft.defaultSets} onChange={(x) => setDraft({ ...draft, defaultSets: Number(x.target.value) })} /></L>
            <L label="建議次數／秒數"><input className={`${inputCls} w-full`} value={draft.defaultTarget} onChange={(x) => setDraft({ ...draft, defaultTarget: x.target.value })} /></L>
          </div>
          <L label="姿勢提示（每行一條）"><textarea rows={3} className={`${inputCls} w-full`} value={draft.cues.join('\n')} onChange={(x) => setDraft({ ...draft, cues: lines(x.target.value) })} /></L>
          <L label="常見錯誤（每行一條）"><textarea rows={3} className={`${inputCls} w-full`} value={draft.mistakes.join('\n')} onChange={(x) => setDraft({ ...draft, mistakes: lines(x.target.value) })} /></L>
          <L label="簡單版"><input className={`${inputCls} w-full`} value={draft.easier} onChange={(x) => setDraft({ ...draft, easier: x.target.value })} /></L>
          <L label="進階版"><input className={`${inputCls} w-full`} value={draft.harder} onChange={(x) => setDraft({ ...draft, harder: x.target.value })} /></L>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>取消</Button>
            <Button variant="primary" onClick={save}>保存</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-500">{title}</div>
      <div className="text-slate-200">{children}</div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-slate-400">{label}</div>
      {children}
    </label>
  );
}
