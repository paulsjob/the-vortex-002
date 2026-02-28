import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayerStore } from '../store/useLayerStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useAssetStore } from '../store/useAssetStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { ExplorerNode } from '../types/domain';

type DashboardSection = 'branded' | 'fonts' | 'templates';

export function DashboardRoute() {
  const navigate = useNavigate();
  const templateStore = useTemplateStore();
  const assetStore = useAssetStore();
  const loadTemplate = useLayerStore((s) => s.loadTemplate);

  const selectedTemplateRef = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);

  const fontRootId = useMemo(() => assetStore.brandedExplorer.nodes.find((node) => node.type === 'folder' && /font/i.test(node.name))?.id ?? assetStore.brandedExplorer.rootId, [assetStore.brandedExplorer]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set([assetStore.brandedExplorer.rootId]));
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('branded');
  const [activeFolderId, setActiveFolderId] = useState(assetStore.brandedExplorer.rootId);

  const templates = useMemo(
    () => [...templateStore.templates].sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt)),
    [templateStore.templates],
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateRef?.id) ?? templates[0],
    [templates, selectedTemplateRef],
  );

  const activeExplorer = assetStore.brandedExplorer;

  const getNode = (id: string): ExplorerNode | undefined => activeExplorer.nodes.find((node: ExplorerNode) => node.id === id);
  const activeFolder = getNode(activeFolderId);
  const contentNodes = useMemo(() => {
    if (selectedSection === 'templates') {
      return templates.map((template) => ({ id: template.id, name: template.name, type: 'template' as const, subtitle: `${template.canvasWidth}×${template.canvasHeight} · ${template.layers.length} layers` }));
    }
    if (!activeFolder || activeFolder.type !== 'folder') return [];
    return activeFolder.children.map(getNode).filter(Boolean) as ExplorerNode[];
  }, [selectedSection, templates, activeFolder, activeExplorer.nodes]);

  const selectSection = (section: DashboardSection, rootId?: string) => {
    setSelectedSection(section);
    if (rootId) setActiveFolderId(rootId);
  };

  const renderFolderTree = (nodeId: string, depth = 0) => {
    const node = getNode(nodeId);
    if (!node || node.type !== 'folder') return null;
    const expanded = expandedNodeIds.has(node.id);
    return (
      <div key={node.id}>
        <button
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${activeFolderId === node.id ? 'bg-blue-900/40 text-blue-100' : 'text-slate-300 hover:bg-slate-800'}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => {
            setExpandedNodeIds((prev) => {
              const next = new Set(prev);
              if (next.has(node.id)) next.delete(node.id);
              else next.add(node.id);
              return next;
            });
          }}
          onDoubleClick={() => {
            setActiveFolderId(node.id);
            setSelectedSection(node.id.includes('font') ? 'fonts' : 'branded');
          }}
        >
          <span>{expanded ? '▾' : '▸'}</span>
          <span>📁 {node.name}</span>
        </button>
        {expanded && node.children.map((childId: string) => renderFolderTree(childId, depth + 1))}
      </div>
    );
  };

  return (
    <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">Project organization for assets, fonts, templates, and folders.</p>
        <div className="mt-4 space-y-2">
          <button className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold ${selectedSection === 'branded' ? 'border-blue-500 bg-blue-900/30 text-blue-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => selectSection('branded', assetStore.brandedExplorer.rootId)}>Branded Assets</button>
          <button className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold ${selectedSection === 'fonts' ? 'border-blue-500 bg-blue-900/30 text-blue-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => selectSection('fonts', fontRootId)}>Fonts</button>
          <button className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold ${selectedSection === 'templates' ? 'border-blue-500 bg-blue-900/30 text-blue-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => selectSection('templates')}>Templates</button>
        </div>
        <div className="mt-4 rounded-md border border-slate-700 bg-slate-900 p-2">
          {selectedSection !== 'templates'
            ? renderFolderTree(selectedSection === 'fonts' ? fontRootId : activeExplorer.rootId)
            : <p className="px-2 py-2 text-xs text-slate-400">Template library is flat and shown in content pane.</p>}
        </div>
      </aside>

      <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Templates</h3>
          <button
            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
            disabled={selectedSection !== 'templates' || !selectedTemplate}
            onClick={() => {
              if (!selectedTemplate) return;
              loadTemplate(selectedTemplate);
              navigate('/design');
            }}
          >
            LOAD TO DESIGN
          </button>
        </header>

        <div className="overflow-hidden rounded-md border border-slate-700">
          {selectedSection === 'templates' ? (
            <>
              <div className="grid grid-cols-[2.2fr_0.9fr_0.9fr_0.8fr_0.7fr] bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Template</span><span>Status</span><span>Format</span><span>Version</span><span>Updated</span>
              </div>
              <div className="divide-y divide-slate-800">
                {templates.map((template, index) => {
                  const isActive = selectedTemplate?.id === template.id;
                  const isValid = template.layers.length > 0;
                  return (
                    <button key={template.id} className={`grid w-full grid-cols-[2.2fr_0.9fr_0.9fr_0.8fr_0.7fr] items-center px-3 py-3 text-left text-sm ${isActive ? 'bg-blue-900/25 text-blue-50' : 'bg-transparent text-slate-200 hover:bg-slate-900/70'}`} onClick={() => selectTemplate({ source: 'native', id: template.id })}>
                      <span className="font-medium">{template.name}</span>
                      <span>{isValid ? <StatusBadge tone="valid">VALID</StatusBadge> : <StatusBadge tone="invalid">INVALID</StatusBadge>}</span>
                      <span>{template.canvasWidth}×{template.canvasHeight}</span>
                      <span>v{index + 1}</span>
                      <span className="text-xs text-slate-400">{new Date(template.updatedAt ?? template.createdAt).toLocaleDateString()}</span>
                    </button>
                  );
                })}
                {!templates.length && <p className="px-3 py-6 text-sm text-slate-500">No templates available.</p>}
              </div>
            </>
          ) : (
            <div className="divide-y divide-slate-800">
              {contentNodes.map((node) => (
                <button key={node.id} className="flex w-full items-center justify-between px-3 py-3 text-left text-sm text-slate-200 hover:bg-slate-900/70" onClick={() => {
                  if ('type' in node && node.type === 'folder') setExpandedNodeIds((prev) => new Set(prev).add(node.id));
                }} onDoubleClick={() => {
                  if ('type' in node && node.type === 'folder') setActiveFolderId(node.id);
                }}>
                  <span className="truncate">{'type' in node && node.type === 'folder' ? `📁 ${node.name}` : `📄 ${node.name}`}</span>
                  {'dimension' in node && node.dimension ? <span className="text-xs text-slate-500">{node.dimension}</span> : null}
                </button>
              ))}
              {!contentNodes.length && <p className="px-3 py-6 text-sm text-slate-500">No items in selected folder.</p>}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
