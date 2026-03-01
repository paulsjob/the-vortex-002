import { type DragEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayerStore } from '../../store/useLayerStore';
import { useTemplateStore, type TemplateListItem } from '../../store/useTemplateStore';
import { importIllustratorSvg, IllustratorImportValidationError } from '../packages/illustratorSvgImporter';
import { loadVortexPackage } from '../packages/loadVortexPackage';

const iconBtn = 'h-8 w-8 rounded border border-slate-700 bg-slate-900 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50';
const DEBUG_DND = true;

type DragPayload = {
  kind: 'templates' | 'templateFolders';
  ids: string[];
};

export function TemplateExplorer() {
  const navigate = useNavigate();
  const templateStore = useTemplateStore();
  const loadTemplate = useLayerStore((s) => s.loadTemplate);
  const [currentFolderId, setCurrentFolderId] = useState(templateStore.rootId);
  const [query, setQuery] = useState('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [hoverFolderId, setHoverFolderId] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(templateStore.selectedIds), [templateStore.selectedIds]);

  const getFolder = (id: string) => templateStore.folders.find((f) => f.id === id);

  const templates = useMemo(
    () => templateStore.getTemplatesInFolder(currentFolderId).filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [templateStore, currentFolderId, query],
  );

  const allTemplates = useMemo(
    () => templateStore.listAllTemplates().filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [templateStore, query],
  );

  const templatesForDisplay = useMemo(() => {
    const nativeIds = new Set(templates.map((template) => template.id));
    const nativeItems: TemplateListItem[] = templates.map((template) => ({
      id: template.id,
      name: template.name,
      source: 'native',
      width: template.canvasWidth,
      height: template.canvasHeight,
      updatedAt: template.updatedAt ?? template.createdAt,
    }));
    const vortexItems = allTemplates.filter((template) => template.source === 'vortex' && !nativeIds.has(template.id));
    return [...nativeItems, ...vortexItems];
  }, [allTemplates, templates]);

  const orderedVisibleIds = useMemo(
    () => templatesForDisplay.filter((template) => template.source === 'native').map((template) => template.id),
    [templatesForDisplay],
  );

  const renameFolder = (folderId: string, currentName: string) => {
    const next = window.prompt('Rename folder', currentName)?.trim();
    if (!next || next === currentName) return;
    templateStore.renameFolder(folderId, next);
  };

  const readDragPayload = (event: DragEvent): DragPayload | null => {
    try {
      const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');
      if (!raw) return null;
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  const hasTextPayloadType = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('text/plain');

  const canDropOnFolder = (payload: DragPayload | null, folderId: string): boolean => {
    if (!payload) return false;
    if (payload.kind === 'templates') return true;
    const draggedFolderId = payload.ids[0];
    if (!draggedFolderId) return false;
    return templateStore.canMoveFolder(draggedFolderId, folderId).ok;
  };


  const canDropOnRoot = (payload: DragPayload | null): boolean => {
    if (!payload) return false;
    if (payload.kind === 'templates') return true;
    const draggedFolderId = payload.ids[0];
    if (!draggedFolderId) return false;
    return templateStore.canMoveFolder(draggedFolderId, null).ok;
  };

  const onDropOnRoot = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDragPayload(event);
    if (!payload) return;
    if (!canDropOnRoot(payload)) return;
    setHoverFolderId(null);
    if (DEBUG_DND) console.log('[TemplateExplorer:dnd] drop', { folderId: 'root', payload });
    if (payload.kind === 'templates') {
      templateStore.moveTemplatesToFolder(payload.ids, null);
      templateStore.setSelection(payload.ids, payload.ids[0] ?? null);
      setCurrentFolderId(templateStore.rootId);
      return;
    }
    const draggedFolderId = payload.ids[0];
    if (!draggedFolderId || !templateStore.canMoveFolder(draggedFolderId, null).ok) return;
    templateStore.moveFolderToFolder(draggedFolderId, null);
    setCurrentFolderId(templateStore.rootId);
  };

  const onDropOnFolder = (event: DragEvent, folderId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDragPayload(event);
    if (!payload) return;
    if (!canDropOnFolder(payload, folderId)) return;
    setHoverFolderId(null);
    if (DEBUG_DND) console.log('[TemplateExplorer:dnd] drop', { folderId, payload });
    if (payload.kind === 'templates') {
      templateStore.moveTemplatesToFolder(payload.ids, folderId);
      templateStore.setSelection(payload.ids, payload.ids[0] ?? null);
      setCurrentFolderId(folderId);
      return;
    }
    const draggedFolderId = payload.ids[0];
    if (!draggedFolderId || !templateStore.canMoveFolder(draggedFolderId, folderId).ok) return;
    templateStore.moveFolderToFolder(draggedFolderId, folderId);
  };

  const renderFolderTree = (folderId: string, depth = 0): JSX.Element | null => {
    const folder = getFolder(folderId);
    if (!folder) return null;
    const childFolders = folder.childrenFolderIds.map(getFolder).filter(Boolean) as NonNullable<ReturnType<typeof getFolder>>[];
    const isOpen = templateStore.expanded[folderId] ?? depth === 0;
    return (
      <div key={folderId} style={{ marginLeft: depth * 12 }} className="space-y-1">
        <div
          className="relative flex items-center gap-1 pointer-events-auto"
          onDragEnter={(event) => {
            const payload = readDragPayload(event);
            const canAccept = canDropOnFolder(payload, folder.id) || (!payload && hasTextPayloadType(event));
            if (!canAccept) return;
            event.preventDefault();
            event.stopPropagation();
            setHoverFolderId(folder.id);
          }}
          onDragOver={(event) => {
            const payload = readDragPayload(event);
            const canAccept = canDropOnFolder(payload, folder.id) || (!payload && hasTextPayloadType(event));
            if (!canAccept) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setHoverFolderId(folder.id);
            if (DEBUG_DND) console.log('[TemplateExplorer:dnd] dragover', {
              folderId: folder.id,
              payloadKindOrNull: payload?.kind ?? null,
              types: Array.from(event.dataTransfer.types),
            });
          }}
          onDragLeave={() => {
            setHoverFolderId((prev) => (prev === folder.id ? null : prev));
          }}
          onDrop={(event) => onDropOnFolder(event, folder.id)}
        >
          {childFolders.length ? <button className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs" onClick={() => templateStore.toggleExpanded(folderId)}>{isOpen ? '▾' : '▸'}</button> : <span className="inline-block h-5 w-5" />}
          <button
            className={`w-full rounded border px-2 py-1 text-left ${currentFolderId === folder.id ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-900'} ${hoverFolderId === folder.id ? 'ring-2 ring-emerald-500/70' : ''}`}
            draggable={folder.id !== templateStore.rootId}
            onClick={() => setCurrentFolderId(folder.id)}
            onDoubleClick={() => renameFolder(folder.id, folder.name)}
            onDragStart={(event) => {
              if (folder.id === templateStore.rootId) return;
              const payload = { kind: 'templateFolders', ids: [folder.id] } satisfies DragPayload;
              event.dataTransfer.effectAllowed = 'move';
              const serialized = JSON.stringify(payload);
              event.dataTransfer.setData('application/json', serialized);
              event.dataTransfer.setData('text/plain', serialized);
              if (DEBUG_DND) console.log('[TemplateExplorer:dnd] dragstart', payload);
            }}
          >
            {folder.name}
          </button>
        </div>
        {isOpen && childFolders.map((child) => renderFolderTree(child.id, depth + 1))}
      </div>
    );
  };

  return (
    <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 lg:grid-cols-[280px_1fr_260px]">
      <aside className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <h3 className="mb-2 font-semibold">Templates Folders</h3>
        <div
          className={`mb-2 rounded border px-2 py-1 text-xs ${hoverFolderId === templateStore.rootId ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 text-slate-400'}`}
          onDragEnter={(event) => {
            const payload = readDragPayload(event);
            const canAccept = canDropOnRoot(payload) || (!payload && hasTextPayloadType(event));
            if (!canAccept) return;
            event.preventDefault();
            event.stopPropagation();
            setHoverFolderId(templateStore.rootId);
          }}
          onDragOver={(event) => {
            const payload = readDragPayload(event);
            const canAccept = canDropOnRoot(payload) || (!payload && hasTextPayloadType(event));
            if (!canAccept) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setHoverFolderId(templateStore.rootId);
            if (DEBUG_DND) console.log('[TemplateExplorer:dnd] dragover', {
              folderId: 'root',
              payloadKindOrNull: payload?.kind ?? null,
              types: Array.from(event.dataTransfer.types),
            });
          }}
          onDragLeave={() => {
            setHoverFolderId((prev) => (prev === templateStore.rootId ? null : prev));
          }}
          onDrop={onDropOnRoot}
        >
          Root
        </div>
        {renderFolderTree(templateStore.rootId)}
      </aside>

      <div
        className="rounded-lg border border-slate-800 bg-slate-950 p-3"
        onClick={(event) => {
          if (event.target === event.currentTarget) templateStore.clearSelection();
        }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1" placeholder="Search templates" />
          <label className="cursor-pointer rounded border border-violet-500/60 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20" title="Import Illustrator SVG">
            Import SVG
            <input
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = '';
                if (!file) return;

                try {
                  const svgText = await file.text();
                  const result = await importIllustratorSvg(svgText, file.name.replace(/\.svg$/i, ''));
                  const vortexFile = new File([result.packageBlob], `${result.manifest.templateName}.vortex`, {
                    type: 'application/vnd.vortex.template+zip',
                  });
                  const loaded = await loadVortexPackage(vortexFile);
                  templateStore.registerVortexPackage(loaded);

                  const downloadUrl = URL.createObjectURL(result.packageBlob);
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.download = `${result.manifest.templateName}.vortex`;
                  link.click();
                  URL.revokeObjectURL(downloadUrl);

                  const warningText = result.warnings.length ? ` (${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'})` : '';
                  setImportStatus(`Imported ${file.name}${warningText}`);
                } catch (error) {
                  const message = error instanceof IllustratorImportValidationError || error instanceof Error
                    ? error.message
                    : 'Failed to import SVG';
                  setImportStatus(`Import failed: ${message}`);
                }
              }}
            />
          </label>
          <button className={iconBtn} title="Create folder" onClick={() => {
            const name = window.prompt('Name this new folder')?.trim();
            if (name) templateStore.addFolder(name, currentFolderId);
          }}>➕</button>
          <button className={iconBtn} title="Delete selected folder" onClick={() => templateStore.deleteFolder(currentFolderId)} disabled={currentFolderId === templateStore.rootId}>🗑</button>
        </div>

        <div className="grid gap-2 text-sm" onClick={(event) => event.stopPropagation()}>
          {importStatus && <p className="text-xs text-slate-300">{importStatus}</p>}
          <p className="text-xs text-slate-400">Selected: <span className="font-semibold text-slate-200">{templateStore.selectedIds.length}</span></p>
          <div className="grid grid-cols-[1.6fr_0.8fr_1fr_1fr_auto_auto] text-slate-400"><span>Name</span><span>Type</span><span>Dimensions</span><span>Modified</span><span>Load</span><span>Delete</span></div>
          {templatesForDisplay.map((template) => {
            const isVortex = template.source === 'vortex';
            const isSelected = template.source === 'native' && selectedSet.has(template.id);
            const updatedAt = template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : '—';
            return (
              <div
                key={`${template.source}:${template.id}`}
                className={`grid grid-cols-[1.6fr_0.8fr_1fr_1fr_auto_auto] items-center gap-2 rounded border p-2 ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900 hover:border-blue-500/60 hover:bg-slate-800'}`}
                draggable={!isVortex}
                onDragStart={(event) => {
                  if (isVortex) return;
                  const templateIds = selectedSet.has(template.id) ? templateStore.selectedIds : [template.id];
                  if (!selectedSet.has(template.id)) {
                    templateStore.setSelection([template.id], template.id);
                  }
                  const payload = { kind: 'templates', ids: templateIds } satisfies DragPayload;
                  event.dataTransfer.effectAllowed = 'move';
                  const serialized = JSON.stringify(payload);
                  event.dataTransfer.setData('application/json', serialized);
                  event.dataTransfer.setData('text/plain', serialized);
                  if (DEBUG_DND) console.log('[TemplateExplorer:dnd] dragstart', payload);
                }}
                onClick={(event) => {
                  if (isVortex) return;
                  if (event.shiftKey) {
                    templateStore.rangeSelect(orderedVisibleIds, template.id);
                  } else if (event.ctrlKey || event.metaKey) {
                    templateStore.toggleSelection(template.id);
                  } else {
                    templateStore.setSelection([template.id], template.id);
                  }
                }}
                onDoubleClick={() => {
                  if (isVortex) return;
                  const nativeTemplate = templateStore.getTemplateById(template.id);
                  if (!nativeTemplate) return;
                  const next = window.prompt('Rename template', nativeTemplate.name)?.trim();
                  if (next && next !== nativeTemplate.name) {
                    templateStore.updateTemplate(nativeTemplate.id, {
                      name: next,
                      folderId: nativeTemplate.folderId,
                      canvasWidth: nativeTemplate.canvasWidth,
                      canvasHeight: nativeTemplate.canvasHeight,
                      layers: nativeTemplate.layers,
                    });
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  {template.previewUrl ? <img src={template.previewUrl} alt={`${template.name} preview`} className="h-8 w-12 rounded border border-slate-700 object-cover" /> : null}
                  <span>🧩 {template.name}{template.formatId ? <span className="ml-2 text-xs text-slate-400">({template.formatId})</span> : null}</span>
                </span>
                <span>{isVortex ? <span className="rounded border border-violet-500/70 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">VORTEX</span> : 'Template'}</span>
                <span>{template.width && template.height ? `${template.width}x${template.height}` : '—'}</span>
                <span>{updatedAt}</span>
                <button
                  className="rounded bg-blue-700 px-2 py-1 text-xs"
                  onClick={() => {
                    templateStore.selectTemplate({ source: template.source, id: template.id });
                    if (!isVortex) {
                      const nativeTemplate = templateStore.getTemplateById(template.id);
                      if (!nativeTemplate) return;
                      loadTemplate(nativeTemplate);
                      navigate('/design');
                    }
                  }}
                >
                  Select
                </button>
                {isVortex ? (
                  <span className="text-center text-xs text-slate-500">—</span>
                ) : (
                  <button className={iconBtn} title="Delete template" onClick={() => templateStore.deleteTemplate(template.id)}>🗑</button>
                )}
              </div>
            );
          })}
          {!templatesForDisplay.length && <p className="text-slate-500">No templates in this folder yet. Save one from Design.</p>}
        </div>
      </div>

      <aside className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <h4 className="mb-2 font-semibold">Templates Protocol</h4>
        <p className="text-xs text-slate-400">Templates are saved design compositions (layers + canvas size + bindings), not raw assets.</p>
      </aside>
    </section>
  );
}
