import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '../store/useAssetStore';
import { useLayerStore } from '../store/useLayerStore';
import { useTemplateStore } from '../store/useTemplateStore';
import type { ExplorerNode } from '../types/domain';
import { TemplatePreview } from '../features/playout/TemplatePreview';

type RootSection = 'branded' | 'templates' | 'fonts';
type ViewMode = 'grid' | 'list';

export function DashboardRoute() {
  const navigate = useNavigate();
  const assetStore = useAssetStore();
  const templateStore = useTemplateStore();
  const loadTemplate = useLayerStore((s) => s.loadTemplate);

  const [selectedRoot, setSelectedRoot] = useState<RootSection>('branded');
  const [selectedBrandedFolderId, setSelectedBrandedFolderId] = useState(assetStore.brandedExplorer.rootId);
  const [selectedTemplateFolderId, setSelectedTemplateFolderId] = useState(templateStore.rootId);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const brandedGetNode = (id: string) => assetStore.brandedExplorer.nodes.find((n) => n.id === id);
  const brandedFolder = brandedGetNode(selectedBrandedFolderId);

  const brandedChildren = useMemo(() => {
    if (!brandedFolder || brandedFolder.type !== 'folder') return [];
    return brandedFolder.children.map(brandedGetNode).filter(Boolean) as ExplorerNode[];
  }, [brandedFolder, assetStore.brandedExplorer.nodes]);

  const templates = useMemo(() => templateStore.getTemplatesInFolder(selectedTemplateFolderId), [templateStore.templates, selectedTemplateFolderId]);
  const previewTemplate = useMemo(() => {
    if (!templates.length) return null;
    return templates.find((template) => template.id === previewTemplateId) ?? templates[0];
  }, [templates, previewTemplateId]);

  const renameBrandedNode = (node: ExplorerNode) => {
    const next = window.prompt('Rename item', node.name)?.trim();
    if (!next || next === node.name) return;
    assetStore.renameNode(node.id, next, 'branded');
  };

  const renameTemplateFolder = (folderId: string, currentName: string) => {
    const next = window.prompt('Rename folder', currentName)?.trim();
    if (!next || next === currentName) return;
    templateStore.renameFolder(folderId, next);
  };

  const renameTemplate = (templateId: string) => {
    const current = templateStore.getTemplateById(templateId);
    if (!current) return;
    const next = window.prompt('Rename template', current.name)?.trim();
    if (!next || next === current.name) return;
    templateStore.updateTemplate(templateId, {
      name: next,
      folderId: current.folderId,
      canvasWidth: current.canvasWidth,
      canvasHeight: current.canvasHeight,
      layers: current.layers,
    });
  };

  const renderBrandedTree = (id: string, depth = 0): JSX.Element | null => {
    const node = brandedGetNode(id);
    if (!node || node.type !== 'folder') return null;
    const childFolders = node.children.map(brandedGetNode).filter((child): child is ExplorerNode => !!child && child.type === 'folder');
    const isOpen = assetStore.expandedBranded[id] ?? depth === 0;
    return (
      <div key={id} className="space-y-1" style={{ marginLeft: depth * 12 }}>
        <div className="flex items-center gap-1">
          {childFolders.length > 0 ? (
            <button className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs" onClick={() => assetStore.toggleExpanded(id, 'branded')}>
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="inline-block h-5 w-5" />
          )}
          <button className={`flex-1 rounded border px-2 py-1 text-left ${selectedRoot === 'branded' && selectedBrandedFolderId === id ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}`} onClick={() => { setSelectedRoot('branded'); setSelectedBrandedFolderId(id); }} onDoubleClick={() => renameBrandedNode(node)}>
            {node.name}
          </button>
        </div>
        {isOpen && childFolders.map((child) => renderBrandedTree(child.id, depth + 1))}
      </div>
    );
  };

  const renderTemplateTree = (id: string, depth = 0): JSX.Element | null => {
    const folder = templateStore.getFolderById(id);
    if (!folder) return null;
    const childFolders = folder.children.map((childId) => templateStore.getFolderById(childId)).filter(Boolean) as NonNullable<ReturnType<typeof templateStore.getFolderById>>[];
    const isOpen = templateStore.expanded[id] ?? depth === 0;
    return (
      <div key={id} className="space-y-1" style={{ marginLeft: depth * 12 }}>
        <div className="flex items-center gap-1">
          {childFolders.length > 0 ? (
            <button className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs" onClick={() => templateStore.toggleExpanded(id)}>
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="inline-block h-5 w-5" />
          )}
          <button className={`flex-1 rounded border px-2 py-1 text-left ${selectedRoot === 'templates' && selectedTemplateFolderId === id ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}`} onClick={() => { setSelectedRoot('templates'); setSelectedTemplateFolderId(id); }} onDoubleClick={() => renameTemplateFolder(folder.id, folder.name)}>
            {folder.name}
          </button>
        </div>
        {isOpen && childFolders.map((child) => renderTemplateTree(child.id, depth + 1))}
      </div>
    );
  };

  return (
    <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-700 bg-slate-950 p-3">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Global Asset Library</h2>
        <div className="space-y-2 text-sm">
          <div className="rounded border border-slate-700 bg-slate-900 p-2">
            <div className="mb-2 font-semibold text-slate-200">Branded Assets</div>
            {(() => { const root = assetStore.brandedExplorer.nodes.find((n) => n.id === assetStore.brandedExplorer.rootId); if (!root || root.type !== 'folder') return null; return root.children.map((childId: string) => renderBrandedTree(childId)).filter(Boolean); })()}
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-2">
            <div className="mb-2 font-semibold text-slate-200">Templates</div>
            {templateStore.getRootFolder().children.map((childId) => renderTemplateTree(childId)).filter(Boolean)}
          </div>
          <button className={`w-full rounded border px-2 py-2 text-left font-semibold ${selectedRoot === 'fonts' ? 'border-blue-500 bg-slate-800 text-slate-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`} onClick={() => setSelectedRoot('fonts')}>
            Fonts
          </button>
        </div>
      </aside>

      <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">
            {selectedRoot === 'branded' && 'Branded Assets'}
            {selectedRoot === 'templates' && 'Templates'}
            {selectedRoot === 'fonts' && 'Fonts'}
          </h3>
          <div className="flex gap-2 text-xs">
            <button className={`rounded border px-2 py-1 ${viewMode === 'grid' ? 'border-blue-500 text-blue-300' : 'border-slate-700 text-slate-300'}`} onClick={() => setViewMode('grid')}>Grid</button>
            <button className={`rounded border px-2 py-1 ${viewMode === 'list' ? 'border-blue-500 text-blue-300' : 'border-slate-700 text-slate-300'}`} onClick={() => setViewMode('list')}>List</button>
          </div>
        </div>

        {selectedRoot === 'branded' && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 lg:grid-cols-4' : 'space-y-2'}>
            {brandedChildren.map((item) => (
              <article key={item.id} className={`cursor-pointer rounded border border-slate-700 bg-slate-900 p-2 hover:border-blue-500/60 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`} onClick={() => { if (item.type === 'folder') setSelectedBrandedFolderId(item.id); }} onDoubleClick={() => renameBrandedNode(item)}>
                <div>
                  <p className="font-semibold text-slate-100">{item.type === 'folder' ? `📁 ${item.name}` : item.name}</p>
                  <p className="text-xs text-slate-400">{item.type === 'folder' ? `${item.children.length} items` : item.dimension}</p>
                </div>
                {item.type === 'file' && (
                  <img src={item.src} alt={item.name} className={viewMode === 'grid' ? 'mt-2 h-28 w-full rounded object-contain bg-slate-950' : 'h-16 w-24 rounded object-contain bg-slate-950'} />
                )}
              </article>
            ))}
            {!brandedChildren.length && <p className="text-sm text-slate-500">Folder is empty.</p>}
          </div>
        )}

        {selectedRoot === 'templates' && (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3 md:grid-cols-2' : 'space-y-2'}>
              {templates.map((template) => (
                <article key={template.id} className={`cursor-pointer rounded border border-slate-700 bg-slate-900 p-3 hover:border-blue-500/60 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`} onClick={() => setPreviewTemplateId(template.id)} onDoubleClick={() => renameTemplate(template.id)}>
                  <div>
                    <p className="font-semibold text-slate-100">🧩 {template.name}</p>
                    <p className="text-xs text-slate-400">{template.canvasWidth} × {template.canvasHeight} · {template.layers.length} layers</p>
                  </div>
                  <div className="mt-2 flex gap-2 text-xs">
                    <button className="rounded bg-blue-700 px-2 py-1" onClick={(event) => { event.stopPropagation(); loadTemplate(template); navigate('/design'); }}>Load</button>
                  </div>
                </article>
              ))}
              {!templates.length && <p className="text-sm text-slate-500">No templates in this folder yet.</p>}
            </div>
            <div className="rounded border border-slate-700 bg-slate-900 p-3">
              <TemplatePreview template={previewTemplate} label="Template Preview" />
            </div>
          </div>
        )}

        {selectedRoot === 'fonts' && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-2 md:grid-cols-3' : 'space-y-2'}>
            {['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Arial'].map((font) => (
              <div key={font} className="rounded border border-slate-700 bg-slate-900 p-3">
                <p className="font-semibold">{font}</p>
                <p className="text-xs text-slate-400">Active</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
