import type { ReactNode } from 'react';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl border border-line bg-panel p-4 ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <h2 className="text-sm font-bold tracking-wider text-slate-400">{children}</h2>
      {right}
    </div>
  );
}

type BtnVariant = 'primary' | 'ok' | 'ghost' | 'danger' | 'dark';
const btnCls: Record<BtnVariant, string> = {
  primary: 'bg-hero text-black',
  ok: 'bg-ok text-black',
  ghost: 'border border-line bg-transparent text-slate-200',
  danger: 'bg-punch text-white',
  dark: 'bg-panel2 text-slate-100',
};

export function Button({
  children, onClick, variant = 'dark', className = '', disabled, big,
}: { children: ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; disabled?: boolean; big?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`select-none rounded-xl font-bold transition active:scale-95 disabled:opacity-40 ${big ? 'px-6 py-4 text-xl' : 'px-4 py-2.5 text-base'} ${btnCls[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Stepper({
  value, onChange, step = 1, min = 0, max = 9999, suffix, big,
}: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; big?: boolean }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  const btn = big ? 'h-16 w-16 text-3xl' : 'h-9 w-9 text-xl';
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={`${btn} rounded-full bg-panel2 font-bold active:scale-90`} onClick={() => set(value - step)} aria-label="減少">−</button>
      <div className={`min-w-[3.5rem] text-center font-black tabular-nums ${big ? 'text-5xl' : 'text-lg'}`}>
        {value}
        {suffix && <span className={`ml-1 font-semibold text-slate-400 ${big ? 'text-xl' : 'text-sm'}`}>{suffix}</span>}
      </div>
      <button type="button" className={`${btn} rounded-full bg-panel2 font-bold active:scale-90`} onClick={() => set(value + step)} aria-label="增加">+</button>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-ok' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'rounded-lg border border-line bg-panel2 px-3 py-2 text-slate-100 outline-none focus:border-hero';

export function NumInput({ value, onChange, step = 1, className = 'w-24', placeholder }: { value: number | undefined; onChange: (v: number | undefined) => void; step?: number; className?: string; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      placeholder={placeholder}
      className={`${inputCls} ${className} text-right`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-panel p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-black">{title}</h3>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-panel2 text-xl" aria-label="關閉">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Bar({ value, color = 'bg-hero' }: { value: number; color?: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel2">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Pill({ children, className = 'bg-panel2 text-slate-300' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${className}`}>{children}</span>;
}
