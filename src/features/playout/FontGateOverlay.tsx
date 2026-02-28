import { useMemo, useState } from 'react';

type Props = {
  templateName: string;
  formatLabel: string;
  missingFamilies: string[];
  loadedFamilies: string[];
  onKeepStopped: () => void;
  onOverride: (fallbackFamily: string) => void;
};

const BASE_FALLBACKS = ['Arial', 'Helvetica', 'sans-serif'];

export function FontGateOverlay({ templateName, formatLabel, missingFamilies, loadedFamilies, onKeepStopped, onOverride }: Props) {
  const options = useMemo(
    () => [...new Set([...BASE_FALLBACKS, ...loadedFamilies.filter(Boolean)])],
    [loadedFamilies],
  );
  const [fallbackFamily, setFallbackFamily] = useState(options[0] ?? 'Arial');

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-lg border border-rose-700 bg-slate-950 p-5 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Missing Required Fonts</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-100">{templateName}</h3>
        <p className="text-xs text-slate-400">{formatLabel}</p>

        <div className="mt-4 rounded border border-rose-700/60 bg-rose-900/20 p-3 text-sm text-rose-100">
          <p className="mb-2 font-semibold">The following required families are missing:</p>
          <ul className="list-disc space-y-1 pl-5">
            {missingFamilies.map((family) => (
              <li key={family}>{family}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <label htmlFor="fallbackFamily" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Override fallback family
          </label>
          <select
            id="fallbackFamily"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={fallbackFamily}
            onChange={(event) => setFallbackFamily(event.target.value)}
          >
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200" onClick={onKeepStopped}>Keep Stopped</button>
          <button className="rounded border border-amber-600 bg-amber-700/30 px-3 py-1.5 text-xs font-semibold text-amber-100" onClick={() => onOverride(fallbackFamily)}>
            Override and Continue
          </button>
        </div>
      </div>
    </div>
  );
}
