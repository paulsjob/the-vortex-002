import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import { usePlayoutStore, type TransitionType } from '../store/usePlayoutStore';
import { TemplatePreview } from '../features/playout/TemplatePreview';
import { useDataEngineStore } from '../store/useDataEngineStore';
import { useDemoSessionStore } from '../store/useDemoSessionStore';
import { buildFollowOutputUrl } from '../features/playout/publicUrl';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StageViewportFrame } from '../components/stage/StageViewportFrame';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { applyBindingsToScene, normalizeBindingSchema } from '../features/playout/vortexBindings';

const FOLLOW_PREVIEW_STORAGE_KEY = 'renderless.output.follow.preview.v1';
const FOLLOW_PROGRAM_STORAGE_KEY = 'renderless.output.follow.program.v1';

type FollowTemplatePointer = {
  templateId: string;
  sport: string | null;
  sponsor: string | null;
  ts: number;
};

type TreeNode = { id: string; type: 'folder'; name: string; children: TreeNode[] } | { id: string; type: 'template'; name: string };

const transitionOptions: Array<{ type: TransitionType; label: string }> = [
  { type: 'cut', label: 'Cut' },
  { type: 'fade', label: 'Fade' },
  { type: 'ftb', label: 'Fade to Black' },
  { type: 'luma', label: 'Luma Wipe' },
];

const durationChoices = [150, 300, 500, 1000];
const QUICK_LAUNCH_DEFAULT_COUNT = 4;
const PANEL_STATUS_BADGE_CLASS = 'rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em]';

export function ControlRoomRoute() {
  const templateStore = useTemplateStore();
  const previewTemplate = usePlayoutStore((s) => s.previewTemplate);
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const previewSnapshot = usePlayoutStore((s) => s.previewSnapshot);
  const programSnapshot = usePlayoutStore((s) => s.programSnapshot);
  const vortexBindings = usePlayoutStore((s) => s.vortexBindings);
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
  const clearProgram = usePlayoutStore((s) => s.clearProgram);

  const engineRunning = useDataEngineStore((s) => s.running);
  const activeSport = useDataEngineStore((s) => s.activeSport);
  const sponsorChoices = useDemoSessionStore((s) => s.sponsorChoices);
  const updateSelections = useDemoSessionStore((s) => s.updateSelections);

  const [treeOpen, setTreeOpen] = useState<Record<string, boolean>>({ [templateStore.rootId]: true });
  const [blackoutActive, setBlackoutActive] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const localStorageWarnedRef = useRef<{ preview: boolean; program: boolean }>({ preview: false, program: false });

  const writeFollowPointer = useCallback((mode: 'preview' | 'program', pointer: FollowTemplatePointer | null) => {
    const key = mode === 'preview' ? FOLLOW_PREVIEW_STORAGE_KEY : FOLLOW_PROGRAM_STORAGE_KEY;
    try {
      if (!pointer) {
        window.localStorage.removeItem(key);
        return;
      }
      window.localStorage.setItem(key, JSON.stringify(pointer));
    } catch (error) {
      if (!localStorageWarnedRef.current[mode]) {
        localStorageWarnedRef.current[mode] = true;
        console.warn(`[control-room] Failed to persist ${mode} follow pointer.`, error);
      }
    }
  }, []);

  useEffect(() => {
    if (templateStore.quickLaunchTemplateIds.length > 0 || templateStore.templates.length === 0) return;
    templateStore.seedQuickLaunchTemplates(templateStore.templates.slice(0, QUICK_LAUNCH_DEFAULT_COUNT).map((template) => template.id));
  }, [templateStore]);

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

  const favoriteTemplates = useMemo(
    () => templateStore.favoriteTemplateIds.map((id) => templateStore.getTemplateById(id)).filter((template): template is NonNullable<typeof template> => Boolean(template)),
    [templateStore, templateStore.favoriteTemplateIds],
  );

  const quickLaunchTemplates = useMemo(
    () => templateStore.quickLaunchTemplateIds.map((id) => templateStore.getTemplateById(id)).filter((template): template is NonNullable<typeof template> => Boolean(template)),
    [templateStore, templateStore.quickLaunchTemplateIds],
  );

  const previewRenderTemplate = useMemo(() => {
    if (!previewTemplate) return null;
    const pkg = templateStore.getVortexPackage(previewTemplate.id);
    if (!pkg) return previewTemplate;
    const schema = normalizeBindingSchema(pkg.bindings);
    const scene = sceneFromVortexPackage(pkg);
    return applyBindingsToScene({
      id: pkg.manifest.templateId,
      name: pkg.manifest.templateName,
      canvasWidth: scene.canvas.width,
      canvasHeight: scene.canvas.height,
      layers: scene.layers,
    }, schema, vortexBindings[previewTemplate.id]);
  }, [previewTemplate, templateStore, vortexBindings]);

  const programRenderTemplate = useMemo(() => {
    if (!programTemplate) return null;
    const pkg = templateStore.getVortexPackage(programTemplate.id);
    if (!pkg) return programTemplate;
    const schema = normalizeBindingSchema(pkg.bindings);
    const scene = sceneFromVortexPackage(pkg);
    return applyBindingsToScene({
      id: pkg.manifest.templateId,
      name: pkg.manifest.templateName,
      canvasWidth: scene.canvas.width,
      canvasHeight: scene.canvas.height,
      layers: scene.layers,
    }, schema, vortexBindings[programTemplate.id]);
  }, [programTemplate, templateStore, vortexBindings]);

  const copyPreviewOutputUrl = async () => {
    const url = buildFollowOutputUrl(window.location.origin, 'preview');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy preview output URL', url);
    }
  };

  const copyAggregateOutputUrl = async () => {
    const url = buildFollowOutputUrl(window.location.origin, 'program');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy Control Room output URL', url);
    }
  };

  useEffect(() => {
    if (!previewTemplate) {
      writeFollowPointer('preview', null);
      return;
    }
    writeFollowPointer('preview', {
      templateId: previewTemplate.id,
      sport: activeSport ?? null,
      sponsor: previewSponsor ?? null,
      ts: Date.now(),
    });
  }, [previewTemplate, activeSport, previewSponsor, writeFollowPointer]);

  useEffect(() => {
    if (!programTemplate) {
      writeFollowPointer('program', null);
      return;
    }
    writeFollowPointer('program', {
      templateId: programTemplate.id,
      sport: activeSport ?? null,
      sponsor: programSponsor ?? null,
      ts: Date.now(),
    });
  }, [programTemplate, activeSport, programSponsor, writeFollowPointer]);


  const takeTime = lastTakeAt ? new Date(lastTakeAt).toLocaleTimeString() : 'No take yet';
  const previewReady = Boolean(previewTemplate && previewTemplate.layers.length > 0 && engineRunning);

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
      const isFavorited = templateStore.isTemplateFavorited(node.id);
      const isQuickLaunch = templateStore.isTemplateQuickLaunch(node.id);
      return (
        <div key={node.id} className={`group flex items-center gap-1 rounded pr-1 ${previewTemplate?.id === node.id ? 'bg-blue-900/40' : 'hover:bg-slate-800/70'}`}>
          <button
            className={`min-w-0 flex-1 rounded px-2 py-1 text-left text-sm ${previewTemplate?.id === node.id ? 'text-blue-100' : 'text-slate-300'}`}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            onClick={() => {
              const template = templateStore.getTemplateById(node.id);
              if (template) setPreviewTemplate(template);
            }}
          >
            <span className="truncate">📄 {node.name}</span>
          </button>
          <button
            type="button"
            className={`rounded px-1.5 py-1 text-xs transition ${isFavorited ? 'text-amber-300' : 'text-slate-500 hover:text-amber-200'} opacity-90 group-hover:opacity-100`}
            onClick={(event) => {
              event.stopPropagation();
              templateStore.toggleFavoriteTemplate(node.id);
            }}
            title={isFavorited ? 'Remove favorite' : 'Add favorite'}
            aria-label={isFavorited ? 'Remove favorite' : 'Add favorite'}
          >
            {isFavorited ? '★' : '☆'}
          </button>
          <button
            type="button"
            className={`rounded px-1.5 py-1 text-xs transition ${isQuickLaunch ? 'text-cyan-300' : 'text-slate-500 hover:text-cyan-200'} opacity-90 group-hover:opacity-100`}
            onClick={(event) => {
              event.stopPropagation();
              templateStore.toggleQuickLaunchTemplate(node.id);
            }}
            title={isQuickLaunch ? 'Remove from Quick Launch' : 'Add to Quick Launch'}
            aria-label={isQuickLaunch ? 'Remove from Quick Launch' : 'Add to Quick Launch'}
          >
            🚀
          </button>
        </div>
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


  const renderViewportPanel = (options: {
    title: 'PREVIEW' | 'PROGRAM';
    titleClassName: string;
    template: typeof previewTemplate;
    sponsor: string | null;
    tone: 'preview' | 'program';
    lockLabel: 'EDITABLE' | 'LOCKED';
    blackout?: boolean;
  }) => (
    <div className="min-h-0 min-w-0">
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className="flex h-6 items-center justify-between gap-2 px-0.5">
          <h4 className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${options.titleClassName}`}>{options.title}</h4>
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            <div className={`${PANEL_STATUS_BADGE_CLASS} ${engineRunning ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-amber-600 bg-amber-900/30 text-amber-300'}`}>
              Data Engine {engineRunning ? 'Live' : 'Paused'}
            </div>
            <div className={`${PANEL_STATUS_BADGE_CLASS} ${options.tone === 'program' ? 'border-red-500 bg-red-900/60 text-red-100' : 'border-blue-500 bg-blue-900/45 text-blue-100'}`}>
              {options.lockLabel}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div className="w-full aspect-video min-h-0 overflow-hidden">
            <StageViewportFrame className="relative h-full w-full rounded-md border-slate-700 bg-slate-900 p-3">
              {options.blackout && (
                <div className="pointer-events-none absolute inset-0 z-10 border border-slate-800 bg-black/95 text-center text-sm font-semibold uppercase tracking-[0.25em] text-white">
                  <div className="flex h-full items-center justify-center">Blackout</div>
                </div>
              )}
              <div className="h-full w-full">
                <TemplatePreview template={options.template} sponsor={options.sponsor} tone={options.tone} />
              </div>
            </StageViewportFrame>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="flex h-screen min-h-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Control Room</h2>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="grid h-full grid-rows-[minmax(0,1fr)_auto_auto] gap-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="min-h-0 rounded-md border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Template Library</p>
            <div className="mt-2 h-full overflow-auto pr-1">{renderTreeNode(tree)}</div>
          </div>

          <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contextual Controls</p>
            {!previewTemplate && (
              <p className="text-xs text-slate-400">Select a template from the folder tree to enable TAKE.</p>
            )}
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sponsor</label>
            <select className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100" value={previewSponsor ?? ''} onChange={(e) => {
              const sponsor = e.target.value || null;
              if (sponsor) {
                updateSelections({ sponsor });
              }
              setPreviewSponsor(sponsor);
            }}>
              <option value="">Off</option>
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
              <p className="mt-1 text-[10px] text-slate-500">
                preview {previewSnapshot?.templateId ?? 'none'} r{previewSnapshot?.revision ?? 0} · program {programSnapshot?.templateId ?? 'none'} r{programSnapshot?.revision ?? 0}
              </p>
            </div>
          </div>
        </aside>

        <section className="h-full min-h-0 min-w-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-4">
          <div className="h-full min-h-0 min-w-0 flex flex-col gap-3 overflow-hidden">
            <div className="relative z-20 min-h-0 overflow-hidden">
              <div className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_minmax(220px,260px)_minmax(0,1fr)] gap-3 items-start">
                <div className="min-h-0 min-w-0 w-full overflow-hidden aspect-video">
                  {renderViewportPanel({
                    title: 'PREVIEW',
                    titleClassName: 'text-blue-200',
                    template: previewRenderTemplate,
                    sponsor: previewSponsor,
                    tone: 'preview',
                    lockLabel: 'EDITABLE',
                  })}
                </div>

                <div className="relative z-20 flex min-h-0 min-w-0 flex-col rounded-md border border-slate-700 bg-slate-900 p-3 pb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Transitions</p>
                  <div className="h-full flex flex-col">
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

                    <button
                      className="mt-2 w-full rounded-md border border-amber-500/70 bg-amber-700/70 px-6 py-2 text-sm font-bold tracking-[0.2em] text-amber-100 transition hover:bg-amber-600/80 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={clearProgram}
                      disabled={transitionActive}
                    >
                      CLEAR
                    </button>

                    <div className="mt-auto pt-2">
                      <div className="grid grid-cols-2 gap-2">
                      <button
                        className="rounded border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-300 disabled:opacity-50 hover:bg-emerald-900/30"
                        onClick={copyPreviewOutputUrl}
                      >
                        Copy Preview URL
                      </button>
                      <button
                        className="rounded border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-300 disabled:opacity-50 hover:bg-emerald-900/30"
                        onClick={copyAggregateOutputUrl}
                      >
                        Copy Program URL
                      </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 min-w-0 w-full overflow-hidden aspect-video">
                  {renderViewportPanel({
                    title: 'PROGRAM',
                    titleClassName: 'text-red-300',
                    template: programRenderTemplate,
                    sponsor: programSponsor,
                    tone: 'program',
                    lockLabel: 'LOCKED',
                    blackout: blackoutActive,
                  })}
                </div>
              </div>
            </div>

            <div className="relative z-0 min-h-0 grid grid-rows-2 gap-3 overflow-hidden">
              <div className="h-[140px] min-h-0 overflow-hidden rounded-md border border-slate-700 bg-slate-900 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">FAVORITES</p>
                </div>
                <div className="mt-2 h-[calc(100%-2rem)] min-h-0 overflow-x-auto overflow-y-hidden pb-1 no-scrollbar">
                  <div className="grid h-full auto-cols-max grid-flow-col gap-2">
                  {favoriteTemplates.length === 0 ? (
                    <p className="text-sm text-slate-500">Star templates in the library to pin your favorites.</p>
                  ) : favoriteTemplates.map((template) => (
                    <button
                      key={template.id}
                      className="group w-[170px] shrink-0 rounded-md border border-slate-700 bg-slate-950 p-2 text-left transition hover:border-amber-400/60 hover:shadow-[0_0_24px_rgba(251,191,36,0.15)]"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <div className="mb-1 w-full aspect-video overflow-hidden rounded border border-slate-700 bg-slate-900 grid place-items-center text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        16:9
                      </div>
                      <p className="truncate text-xs font-semibold text-slate-100">{template.name}</p>
                    </button>
                  ))}
                  </div>
                </div>
              </div>
              <div className="h-[140px] min-h-0 overflow-hidden rounded-md border border-slate-700 bg-slate-900 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">QUICK LAUNCH</p>
                </div>
                <div className="mt-2 h-[calc(100%-2rem)] min-h-0 overflow-x-auto overflow-y-hidden pb-1 no-scrollbar">
                  <div className="grid h-full auto-cols-max grid-flow-col gap-2">
                  {quickLaunchTemplates.length === 0 ? (
                    <p className="text-sm text-slate-500">Add templates with 🚀 in the library for one-tap preloading.</p>
                  ) : quickLaunchTemplates.map((template) => (
                    <div key={template.id} className="group relative w-[170px] shrink-0 rounded-md border border-slate-700 bg-slate-950 p-2 transition hover:border-cyan-400/60 hover:shadow-[0_0_24px_rgba(34,211,238,0.15)]">
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                        onClick={() => templateStore.removeQuickLaunchTemplate(template.id)}
                        aria-label={`Remove ${template.name} from quick launch`}
                      >
                        ✕
                      </button>
                      <button className="text-left" onClick={() => setPreviewTemplate(template)}>
                        <div className="mb-1 w-full aspect-video overflow-hidden rounded border border-slate-700 bg-slate-900 grid place-items-center text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          Quick
                        </div>
                        <p className="truncate text-xs font-semibold text-slate-100">{template.name}</p>
                      </button>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
