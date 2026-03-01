import { useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import { usePlayoutStore, type TransitionType } from '../store/usePlayoutStore';
import { TemplatePreview } from '../features/playout/TemplatePreview';
import { useDataEngineStore } from '../store/useDataEngineStore';
import { useDemoSessionStore } from '../store/useDemoSessionStore';
import { buildOutputFeedUrl, buildTemplateFeedUrl } from '../features/playout/publicUrl';
import { StatusBadge } from '../components/ui/StatusBadge';

type TreeNode = { id: string; type: 'folder'; name: string; children: TreeNode[] } | { id: string; type: 'template'; name: string };

const transitionOptions: Array<{ type: TransitionType; label: string }> = [
  { type: 'cut', label: 'Cut' },
  { type: 'fade', label: 'Fade' },
  { type: 'ftb', label: 'Fade to Black' },
  { type: 'luma', label: 'Luma Wipe' },
];

const durationChoices = [150, 300, 500, 1000];

export function ControlRoomRoute() {
  const templateStore = useTemplateStore();
  const previewTemplate = usePlayoutStore((s) => s.previewTemplate);
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const lastTakeAt = usePlayoutStore((s) => s.lastTakeAt);
  const previewSponsor = usePlayoutStore((s) => s.previewSponsor);
  const programSponsor = usePlayoutStore((s) => s.programSponsor);
  const transitionType = usePlayoutStore((s) => s.transitionType);
  const transitionDurationMs = usePlayoutStore((s) => s.transitionDurationMs);
  const setPreviewTemplate = usePlayoutStore((s) => s.setPreviewTemplate);
  const setPreviewSponsor = usePlayoutStore((s) => s.setPreviewSponsor);
  const setTransitionType = usePlayoutStore((s) => s.setTransitionType);
  const setTransitionDurationMs = usePlayoutStore((s) => s.setTransitionDurationMs);
  const takeToProgram = usePlayoutStore((s) => s.takeToProgram);

  const engineRunning = useDataEngineStore((s) => s.running);
  const sponsorChoices = useDemoSessionStore((s) => s.sponsorChoices);
  const updateSelections = useDemoSessionStore((s) => s.updateSelections);

  const [treeOpen, setTreeOpen] = useState<Record<string, boolean>>({ [templateStore.rootId]: true });
  const [blackoutActive, setBlackoutActive] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
  }, []);

  const templateMap = useMemo(() => {
    const map = new Map<string, typeof templateStore.templates[number][]>();
    templateStore.templates.forEach((template) => {
      const list = map.get(template.folderId) ?? [];
      list.push(template);
      map.set(template.folderId, list);
    });
    map.forEach((list, key) => map.set(key, [...list].sort((a, b) => a.name.localeCompare(b.name))));
    return map;
  }, [templateStore.templates]);

  const folderById = useMemo(() => new Map(templateStore.folders.map((folder) => [folder.id, folder])), [templateStore.folders]);

  const tree = useMemo(() => {
    const walk = (folderId: string): TreeNode => {
      const folder = folderById.get(folderId);
      const childFolders = (folder?.children ?? [])
        .map((id) => folderById.get(id))
        .filter((child): child is NonNullable<typeof child> => !!child)
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        id: folderId,
        type: 'folder',
        name: folder?.name ?? 'Templates',
        children: [
          ...childFolders.map((child) => walk(child.id)),
          ...(templateMap.get(folderId) ?? []).map((template) => ({ id: template.id, type: 'template' as const, name: template.name })),
        ],
      };
    };
    return walk(templateStore.rootId);
  }, [folderById, templateMap, templateStore.rootId]);

  const copyTemplateUrl = async (templateId: string) => {
    const template = templateStore.getTemplateById(templateId);
    if (!template) return;
    const url = buildTemplateFeedUrl(window.location.origin, template);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy template URL', url);
    }
  };

  const copyAggregateOutputUrl = async () => {
    if (!programTemplate) return;
    const url = buildOutputFeedUrl(window.location.origin, programTemplate);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy Control Room output URL', url);
    }
  };

  const takeTime = lastTakeAt ? new Date(lastTakeAt).toLocaleTimeString() : 'No take yet';
  const previewReady = Boolean(previewTemplate && previewTemplate.layers.length > 0 && engineRunning);

  const fallbackMessage = !previewTemplate
    ? 'Select a template to stage preview before TAKE.'
    : previewTemplate.layers.length === 0
      ? 'Preview template is empty. Add at least one layer in Design.'
      : !programTemplate
        ? 'Program is clear. Press TAKE to move Preview to Program.'
        : null;

  const runTransitionTake = () => {
    if (!previewReady || transitionActive) return;

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (transitionType === 'cut') {
      takeToProgram();
      return;
    }

    setTransitionActive(true);

    if (transitionType === 'ftb') {
      setBlackoutActive(true);
      transitionTimeoutRef.current = window.setTimeout(() => {
        takeToProgram();
        setBlackoutActive(false);
        setTransitionActive(false);
        transitionTimeoutRef.current = null;
      }, transitionDurationMs);
      return;
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      takeToProgram();
      setTransitionActive(false);
      transitionTimeoutRef.current = null;
    }, transitionDurationMs);
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    if (node.type === 'template') {
      return (
        <button
          key={node.id}
          className={`block w-full rounded px-2 py-1 text-left text-sm ${previewTemplate?.id === node.id ? 'bg-blue-900/40 text-blue-100' : 'text-slate-300 hover:bg-slate-800'}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => {
            const template = templateStore.getTemplateById(node.id);
            if (template) setPreviewTemplate(template);
          }}
        >
          📄 {node.name}
        </button>
      );
    }

    const isOpen = treeOpen[node.id] ?? node.id === templateStore.rootId;
    return (
      <div key={node.id}>
        <button
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm text-slate-200 hover:bg-slate-800"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => setTreeOpen((prev) => ({ ...prev, [node.id]: !isOpen }))}
        >
          <span>{isOpen ? '▾' : '▸'}</span>
          <span>📁 {node.name}</span>
        </button>
        {isOpen && node.children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <section className="grid h-[calc(100vh-11.5rem)] min-h-[560px] grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Control Room</h2>
      </div>
      <div className="grid min-h-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="grid h-full grid-rows-[minmax(0,1fr)_auto_auto] gap-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="min-h-0 rounded-md border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Template Library</p>
            <div className="mt-2 h-full overflow-hidden pr-1">{renderTreeNode(tree)}</div>
          </div>

          <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contextual Controls</p>
            {!previewTemplate && (
              <p className="text-xs text-slate-400">Select a template from the folder tree to enable TAKE.</p>
            )}
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sponsor</label>
            <select className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100" value={previewSponsor} onChange={(e) => {
              const sponsor = e.target.value;
              updateSelections({ sponsor });
              setPreviewSponsor(sponsor);
            }}>
              {sponsorChoices.map((sponsor) => <option key={sponsor} value={sponsor}>{sponsor}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-700 bg-slate-900 p-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ready Status</p>
              <div className="mt-2">{previewReady ? <StatusBadge tone="ready">READY</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}</div>
              <p className="mt-2 text-xs text-slate-400">Engine {engineRunning ? 'Live' : 'Paused'} · Last TAKE {takeTime}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">On-Air Status</p>
              <div className="mt-2">{programTemplate ? <StatusBadge tone="on-air">ON AIR</StatusBadge> : <StatusBadge tone="not-ready">OFF AIR</StatusBadge>}</div>
              <p className="mt-2 truncate text-xs text-slate-400">{programTemplate?.name ?? 'Program clear'}</p>
            </div>
          </div>
        </aside>

        <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-4">
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] gap-4">
            <TemplatePreview template={previewTemplate} label="PREVIEW" sponsor={previewSponsor} tone="preview" />

            <div className="flex min-h-0 flex-col rounded-md border border-slate-700 bg-slate-900 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Transitions</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {transitionOptions.map((option) => (
                  <button
                    key={option.type}
                    className={`rounded border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${transitionType === option.type ? 'border-blue-400 bg-blue-900/40 text-blue-100' : 'border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800'}`}
                    onClick={() => setTransitionType(option.type)}
                    disabled={transitionActive}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded border border-slate-700 bg-slate-950 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="transition-duration" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Transition Duration</label>
                  <span className="text-xs text-slate-300">{transitionDurationMs}ms</span>
                </div>
                <input
                  id="transition-duration"
                  type="range"
                  min={0}
                  max={durationChoices.length - 1}
                  step={1}
                  value={durationChoices.indexOf(transitionDurationMs)}
                  onChange={(e) => setTransitionDurationMs(durationChoices[Number(e.target.value)] ?? 300)}
                  className="w-full accent-blue-400"
                  disabled={transitionType === 'cut' || transitionActive}
                />
              </div>

              <button
                className="mt-4 w-full rounded-md border border-red-500 bg-red-600 px-6 py-3 text-base font-black tracking-[0.24em] text-white shadow-lg shadow-red-950/60 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={runTransitionTake}
                disabled={!previewReady || transitionActive}
              >
                {transitionActive ? 'TRANSITIONING' : 'TAKE'}
              </button>
            </div>

            <div className="relative min-h-0">
              {blackoutActive && (
                <div className="pointer-events-none absolute inset-0 z-10 rounded-md border border-slate-800 bg-black/95 text-center text-sm font-semibold uppercase tracking-[0.25em] text-white">
                  <div className="flex h-full items-center justify-center">Blackout</div>
                </div>
              )}
              <TemplatePreview template={programTemplate} label="PROGRAM" sponsor={programSponsor} tone="program" />
            </div>
          </div>

          <div className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Broadcast Notes</p>
            {fallbackMessage ? (
              <p className="mt-2 text-slate-300">{fallbackMessage}</p>
            ) : (
              <p className="mt-2 text-slate-300">Program and Preview states are isolated snapshots. Program only changes when TAKE is executed.</p>
            )}
            <div className="mt-3 flex justify-end">
              <button className="rounded border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-300 disabled:opacity-50 hover:bg-emerald-900/30" onClick={() => previewTemplate && copyTemplateUrl(previewTemplate.id)} disabled={!previewTemplate}>
                Copy Preview URL
              </button>
              <button className="ml-2 rounded border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-300 disabled:opacity-50 hover:bg-emerald-900/30" onClick={copyAggregateOutputUrl} disabled={!programTemplate}>
                Copy Output URL
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
