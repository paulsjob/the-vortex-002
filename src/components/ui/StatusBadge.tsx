import type { ReactNode } from 'react';

export type StatusTone = 'valid' | 'invalid' | 'ready' | 'not-ready' | 'on-air' | 'preview';

const toneClasses: Record<StatusTone, string> = {
  valid: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200',
  invalid: 'border-rose-500/50 bg-rose-500/15 text-rose-200',
  ready: 'border-sky-500/50 bg-sky-500/15 text-sky-200',
  'not-ready': 'border-amber-500/50 bg-amber-500/15 text-amber-200',
  'on-air': 'border-red-500/60 bg-red-500/15 text-red-200',
  preview: 'border-indigo-500/50 bg-indigo-500/15 text-indigo-200',
};

type Props = {
  tone: StatusTone;
  children: ReactNode;
};

export function StatusBadge({ tone, children }: Props) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
