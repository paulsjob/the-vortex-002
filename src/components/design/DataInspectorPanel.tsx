import { useMemo, useState } from 'react';

type DataInspectorRoot = 'live' | 'derived' | 'scorebug';

type DataInspectorPanelProps = {
  live: unknown;
  derived: unknown;
  scorebug: unknown;
};

type DataEntry = {
  path: string;
  value: unknown;
};

const isIdentifier = (segment: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment);

const appendPath = (base: string, segment: string | number) => {
  if (typeof segment === 'number') return `${base}[${segment}]`;
  if (!base) return isIdentifier(segment) ? segment : `[${JSON.stringify(segment)}]`;
  return isIdentifier(segment) ? `${base}.${segment}` : `${base}[${JSON.stringify(segment)}]`;
};

const flattenData = (value: unknown, path = ''): DataEntry[] => {
  if (Array.isArray(value)) {
    if (!value.length) return [{ path, value }];
    return value.flatMap((item, index) => flattenData(item, appendPath(path, index)));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return [{ path, value }];
    return entries.flatMap(([key, next]) => flattenData(next, appendPath(path, key)));
  }

  return [{ path, value }];
};

const formatPrimitive = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value === null) return 'null';
  if (typeof value === 'undefined') return 'undefined';
  return String(value);
};

const copyToClipboard = async (value: string) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};

export function DataInspectorPanel({ live, derived, scorebug }: DataInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<DataInspectorRoot>('live');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const tabData: Record<DataInspectorRoot, unknown> = { live, derived, scorebug };
  const currentData = tabData[activeTab];

  const rows = useMemo(() => flattenData(currentData), [currentData]);
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => `${row.path} ${formatPrimitive(row.value)}`.toLowerCase().includes(normalized));
  }, [rows, query]);

  const missingData = currentData == null;

  const handleCopy = async (value: string) => {
    await copyToClipboard(value);
    setNotice('Copied');
    window.setTimeout(() => setNotice(null), 1200);
  };

  return (
    <div className="mt-3 rounded border border-slate-700 bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">DATA INSPECTOR</h4>
        {notice && <span className="text-[10px] uppercase tracking-wider text-cyan-300">{notice}</span>}
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Binding Context: live, derived, scorebug</p>

      <div className="mt-3 flex gap-1 text-xs">
        {(['live', 'derived', 'scorebug'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded border px-2 py-1 uppercase tracking-wide ${activeTab === tab ? 'border-cyan-500 text-cyan-300' : 'border-slate-700 text-slate-400'}`}
          >
            {tab === 'live' ? 'Live' : tab === 'derived' ? 'Derived' : 'Scorebug'}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            placeholder="Search JSON paths..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="rounded border border-slate-700 px-2 py-1 text-xs"
            onClick={() => handleCopy(JSON.stringify(currentData, null, 2))}
            disabled={missingData}
          >
            Copy JSON
          </button>
        </div>

        {missingData ? (
          <p className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-400">No data yet. Start a simulation in Data Engine.</p>
        ) : (
          <>
            <div className="max-h-52 overflow-auto rounded border border-slate-700 bg-slate-950 p-2 text-xs">
              {filteredRows.map((row) => (
                <button
                  type="button"
                  key={`${row.path}-${String(row.value)}`}
                  className="flex w-full items-start justify-between gap-2 rounded px-1 py-0.5 text-left hover:bg-slate-800"
                  onClick={() => handleCopy(`{{${activeTab}${row.path ? `.${row.path}` : ''}}}`)}
                  title="Copy binding token"
                >
                  <span className="font-mono text-cyan-300">{row.path || '(root)'}</span>
                  <span className="truncate text-slate-300">{formatPrimitive(row.value)}</span>
                </button>
              ))}
              {!filteredRows.length && <p className="text-slate-500">No matching keys.</p>}
            </div>
            <pre className="max-h-44 overflow-auto rounded border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-300">{JSON.stringify(currentData, null, 2)}</pre>
          </>
        )}
      </div>
    </div>
  );
}
