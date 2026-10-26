import { useState } from 'react';

export interface Pt {
  label: string;
  value: number;
}

const W = 340;
const H = 170;
const PAD = { l: 36, r: 12, t: 14, b: 24 };

function niceRange(vals: number[], zero = false): [number, number] {
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (zero) lo = Math.min(0, lo);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.1;
  return [zero ? lo : lo - pad, hi + pad];
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-[170px] items-center justify-center rounded-xl bg-panel2/50 text-sm text-slate-500">{text}</div>;
}

/** 單一序列折線圖：2px 線、8px 點、淡格線、點擊／滑過顯示數值 */
export function LineChart({ data, unit = '', color = '#ffd400', empty = '尚無資料' }: { data: Pt[]; unit?: string; color?: string; empty?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <Empty text={empty} />;
  const [lo, hi] = niceRange(data.map((d) => d.value));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('');
  const pick = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    data.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };
  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
        role="img"
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#2a3446" strokeWidth={1} strokeDasharray={i === 0 ? '' : '2 4'} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{t.toFixed(t >= 100 ? 0 : 1)}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} fontSize={10} fill="#94a3b8">{data[0].label}</text>
        {data.length > 1 && <text x={W - PAD.r} y={H - 6} fontSize={10} fill="#94a3b8" textAnchor="end">{data[data.length - 1].label}</text>}
        {h && hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="#64748b" strokeWidth={1} />}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={i === hover ? 5 : 4} fill={color} stroke="#141a26" strokeWidth={2} />
        ))}
      </svg>
      {h && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-line bg-panel2 px-2.5 py-1 text-xs">
          <span className="text-slate-400">{h.label}</span> <span className="font-bold text-slate-100">{h.value}{unit}</span>
        </div>
      )}
      <div className="mt-1 text-right text-xs text-slate-400">最新：<span className="font-bold text-slate-100">{data[data.length - 1].value}{unit}</span></div>
    </div>
  );
}

/** 單一序列長條圖（0–100%） */
export function BarChart({ data, color = '#22d39b', max = 1, format = (v: number) => `${Math.round(v * 100)}%`, empty = '尚無資料' }: { data: Pt[]; color?: string; max?: number; format?: (v: number) => string; empty?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <Empty text={empty} />;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const slot = iw / data.length;
  const bw = Math.min(28, slot - 2);
  const y = (v: number) => PAD.t + ih - (Math.min(v, max) / max) * ih;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t * max)} y2={y(t * max)} stroke="#2a3446" strokeDasharray={t ? '2 4' : ''} />
            <text x={PAD.l - 6} y={y(t * max) + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{format(t * max)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          const top = y(d.value);
          const hgt = Math.max(0, PAD.t + ih - top);
          const r = Math.min(4, hgt / 2, bw / 2);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={PAD.l + slot * i} y={PAD.t} width={slot} height={ih} fill="transparent" />
              {hgt > 0 && (
                <path
                  d={`M${cx - bw / 2},${PAD.t + ih} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${PAD.t + ih} Z`}
                  fill={color}
                  opacity={hover == null || hover === i ? 1 : 0.55}
                />
              )}
              <text x={cx} y={H - 6} fontSize={9} fill="#94a3b8" textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-line bg-panel2 px-2.5 py-1 text-xs">
          <span className="text-slate-400">{data[hover].label}</span> <span className="font-bold text-slate-100">{format(data[hover].value)}</span>
        </div>
      )}
    </div>
  );
}
