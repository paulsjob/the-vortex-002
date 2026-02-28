import { useMemo, useState } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { TemplatePreview } from '../features/playout/TemplatePreview';
import { useDataEngineStore } from '../store/useDataEngineStore';
import { useDemoSessionStore } from '../store/useDemoSessionStore';
import { buildOutputFeedUrl, buildTemplateFeedUrl } from '../features/playout/publicUrl';
import { StatusBadge } from '../components/ui/StatusBadge';

const players = ['A. Jones', 'B. Cruz', 'C. Watts', 'J. Cole', 'K. Ford', 'L. Pope'];

export function ControlRoomRoute() {
  const templateStore = useTemplateStore();
  const previewTemplate = usePlayoutStore((s) => s.previewTemplate);
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const lastTakeAt = usePlayoutStore((s) => s.lastTakeAt);
  const setPreviewTemplate = usePlayoutStore((s) => s.setPreviewTemplate);
  const takeToProgram = usePlayoutStore((s) => s.takeToProgram);

  const engineRunning = useDataEngineStore((s) => s.running);
  const selectedSponsor = useDemoSessionStore((s) => s.selectedSponsor);
  const selectedPlayer = useDemoSessionStore((s) => s.selectedPlayer);
  const sponsorChoices = useDemoSessionStore((s) => s.sponsorChoices);
  const updateSelections = useDemoSessionStore((s) => s.updateSelections);

  const templates = useMemo(
    () => [...templateStore.templates].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [templateStore.templates],
  );
  const [treeOpen, setTreeOpen] = useState<Record<string, boolean>>({ main: true, lowerthirds: true, stats: true });

  const templateGroups = useMemo(() => ({
    main: templates.filter((template) => /main|full/i.test(template.name)),
    lowerthirds: templates.filter((template) => /lower|lt/i.test(template.name)),
    stats: templates.filter((template) => !/main|full|lower|lt/i.test(template.name)),
  }), [templates]);

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

  return (
    <section className="grid h-[calc(100vh-11.5rem)] min-h-[560px] gap-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="grid h-full grid-rows-[repeat(5,minmax(0,1fr))] gap-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-3">
        <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Template Library</p>
          <div className="mt-2 space-y-1 text-sm">
            {Object.entries(templateGroups).map(([groupKey, groupedTemplates]) => (
              <div key={groupKey}>
                <button className="flex w-full items-center justify-between rounded px-2 py-1 text-slate-200 hover:bg-slate-800" onClick={() => setTreeOpen((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))}>
                  <span>{treeOpen[groupKey] ? '▾' : '▸'} {groupKey === 'main' ? 'Main Packages' : groupKey === 'lowerthirds' ? 'Lower Thirds' : 'Stats / Other'}</span>
                </button>
                {treeOpen[groupKey] && (
                  <div className="ml-4 border-l border-slate-700 pl-2">
                    {groupedTemplates.map((template) => (
                      <button key={template.id} className={`block w-full rounded px-2 py-1 text-left ${previewTemplate?.id === template.id ? 'bg-blue-900/40 text-blue-100' : 'text-slate-300 hover:bg-slate-800'}`} onClick={() => setPreviewTemplate(template)}>{template.name}</button>
                    ))}
                    {!groupedTemplates.length && <p className="px-2 py-1 text-xs text-slate-500">No templates</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {previewTemplate && <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sponsor</p>
          <select className="mt-2 w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100" value={selectedSponsor} onChange={(e) => updateSelections({ sponsor: e.target.value })}>
            {sponsorChoices.map((sponsor) => <option key={sponsor} value={sponsor}>{sponsor}</option>)}
          </select>
        </div>}
        {previewTemplate && <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Player</p>
          <select className="mt-2 w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100" value={selectedPlayer} onChange={(e) => updateSelections({ player: e.target.value })}>
            {players.map((player) => <option key={player} value={player}>{player}</option>)}
          </select>
        </div>}
        <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ready Status</p>
          <div className="mt-2">{previewReady ? <StatusBadge tone="ready">READY</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}</div>
          <p className="mt-2 text-xs text-slate-400">Engine {engineRunning ? 'Live' : 'Paused'} · Last TAKE {takeTime}</p>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">On-Air Status</p>
          <div className="mt-2">{programTemplate ? <StatusBadge tone="on-air">ON AIR</StatusBadge> : <StatusBadge tone="not-ready">OFF AIR</StatusBadge>}</div>
          <p className="mt-2 truncate text-xs text-slate-400">{programTemplate?.name ?? 'Program clear'}</p>
        </div>
      </aside>

      <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
          <TemplatePreview template={previewTemplate} label="PREVIEW" tone="preview" />
          <TemplatePreview template={programTemplate} label="PROGRAM" tone="program" />
        </div>

        {previewTemplate && <div className="flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 p-4">
          <button
            className={`rounded-md border px-10 py-3 text-base font-bold tracking-[0.2em] text-white disabled:opacity-50 ${previewTemplate ? 'border-red-500 bg-red-600 hover:bg-red-500' : 'border-slate-700 bg-slate-700'}`}
            onClick={takeToProgram}
            disabled={!previewTemplate}
          >
            TAKE
          </button>
        </div>}

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
    </section>
  );
}
