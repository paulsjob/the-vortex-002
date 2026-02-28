import { useMemo, useRef, useState } from 'react';
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
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set([assetStore.brandedExplorer.rootId, fontRootId, templateStore.rootId]));
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('branded');
  const [activeFolderId, setActiveFolderId] = useState(assetStore.brandedExplorer.rootId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const folderNodeForSection = useMemo(() => {
    if (selectedSection === 'templates') {
      return templateStore.getFolderById(activeFolderId) ?? templateStore.getRootFolder();
    }
    return activeFolder?.type === 'folder' ? activeFolder : getNode(selectedSection === 'fonts' ? fontRootId : activeExplorer.rootId);
  }, [selectedSection, activeFolder, activeFolderId, templateStore, fontRootId, activeExplorer.rootId]);

  const contentNodes = useMemo(() => {
    if (selectedSection === 'templates') {
      const folder = templateStore.getFolderById(activeFolderId) ?? templateStore.getRootFolder();
      const childFolders = folder.children
        .map((id) => templateStore.getFolderById(id))
        .filter((node): node is NonNullable<typeof node> => !!node)
        .map((node) => ({ id: node.id, name: node.name, type: 'folder' as const }));
      const childTemplates = templates
        .filter((template) => template.folderId === folder.id)
        .map((template) => ({ id: template.id, name: template.name, type: 'template' as const, subtitle: `${template.canvasWidth}×${template.canvasHeight} · ${template.layers.length} layers` }));
      return [...childFolders, ...childTemplates];
    }

    if (!activeFolder || activeFolder.type !== 'folder') return [];
    return activeFolder.children.map(getNode).filter(Boolean) as ExplorerNode[];
  }, [selectedSection, activeFolder, activeFolderId, activeExplorer.nodes, templates, templateStore]);

  const selectSection = (section: DashboardSection, rootId?: string) => {
    setSelectedSection(section);
    if (rootId) setActiveFolderId(rootId);
  };

  const renderAssetFolderTree = (nodeId: string, depth = 0) => {
    const node = getNode(nodeId);
    if (!node || node.type !== 'folder') return null;
    const expanded = expandedNodeIds.has(node.id);
    return (
      <div key={node.id}>
        <button
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${activeFolderId === node.id ? 'bg-blue-900/40 text-blue-100' : 'text-slate-300 hover:bg-slate-800'}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => {
            setActiveFolderId(node.id);
            setExpandedNodeIds((prev) => {
              const next = new Set(prev);
              if (next.has(node.id)) next.delete(node.id);
              else next.add(node.id);
              return next;
            });
          }}
        >
          <span>{expanded ? '▾' : '▸'}</span>
          <span>📁 {node.name}</span>
        </button>
        {expanded && node.children.map((childId: string) => renderAssetFolderTree(childId, depth + 1))}
      </div>
    );
  };

  const renderTemplateFolderTree = (folderId: string, depth = 0) => {
    const folder = templateStore.getFolderById(folderId);
    if (!folder) return null;
    const expanded = expandedNodeIds.has(folder.id);
    return (
      <div key={folder.id}>
        <button
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${activeFolderId === folder.id ? 'bg-blue-900/40 text-blue-100' : 'text-slate-300 hover:bg-slate-800'}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => {
            setActiveFolderId(folder.id);
            setExpandedNodeIds((prev) => {
              const next = new Set(prev);
              if (next.has(folder.id)) next.delete(folder.id);
              else next.add(folder.id);
              return next;
            });
          }}
        >
          <span>{expanded ? '▾' : '▸'}</span>
          <span>📁 {folder.name}</span>
        </button>
        {expanded && folder.children.map((childId) => renderTemplateFolderTree(childId, depth + 1))}
      </div>
    );
  };

  const onCreateFolder = () => {
    const currentFolderId = (folderNodeForSection && 'id' in folderNodeForSection) ? folderNodeForSection.id : null;
    if (!currentFolderId) return;
    const name = window.prompt('New folder name');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    if (selectedSection === 'templates') {
      const parent = templateStore.getFolderById(currentFolderId);
      if (!parent) return;
      const duplicate = parent.children
        .map((id) => templateStore.getFolderById(id))
        .filter((node): node is NonNullable<typeof node> => !!node)
        .some((node) => node.name.toLowerCase() === trimmed.toLowerCase());
      if (duplicate) {
        window.alert('A folder with this name already exists in this location.');
        return;
      }
      templateStore.addFolder(trimmed, currentFolderId);
      return;
    }

    const parent = getNode(currentFolderId);
    if (!parent || parent.type !== 'folder') return;
    const duplicate = parent.children
      .map((id) => getNode(id))
      .filter((node): node is ExplorerNode => !!node)
      .some((node) => node.type === 'folder' && node.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      window.alert('A folder with this name already exists in this location.');
      return;
    }
    assetStore.addFolder(trimmed, currentFolderId, 'branded');
    setExpandedNodeIds((prev) => new Set(prev).add(currentFolderId));
  };

  const onDeleteFolder = () => {
    const currentFolderId = (folderNodeForSection && 'id' in folderNodeForSection) ? folderNodeForSection.id : null;
    if (!currentFolderId) return;

    if (selectedSection === 'templates') {
      if (currentFolderId === templateStore.rootId) return;
      const folder = templateStore.getFolderById(currentFolderId);
      if (!folder) return;
      const hasNestedFolders = folder.children.length > 0;
      const hasTemplates = templates.some((template) => template.folderId === folder.id);
      const msg = hasNestedFolders || hasTemplates
        ? `Delete non-empty folder "${folder.name}" and all nested content?`
        : `Delete folder "${folder.name}"?`;
      if (!window.confirm(msg)) return;
      templateStore.deleteFolder(folder.id);
      setActiveFolderId(templateStore.rootId);
      return;
    }

    if (currentFolderId === activeExplorer.rootId || currentFolderId === fontRootId) return;
    const folder = getNode(currentFolderId);
    if (!folder || folder.type !== 'folder') return;
    const hasChildren = folder.children.length > 0;
    const msg = hasChildren
      ? `Delete non-empty folder "${folder.name}" and all nested content?`
      : `Delete folder "${folder.name}"?`;
    if (!window.confirm(msg)) return;
    assetStore.deleteFolder(folder.id, 'branded');
    setActiveFolderId(folder.parentId ?? activeExplorer.rootId);
  };

  const onUploadFiles = () => fileInputRef.current?.click();

  const onDeleteFile = (nodeId: string, name: string) => {
    if (!window.confirm(`Delete file "${name}"?`)) return;
    assetStore.deleteNode(nodeId, 'branded');
  };

  return (
    <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">Project organization for assets, fonts, templates, and folders.</p>
        <div className="mt-4 space-y-2">
          <button className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold ${selectedSection === 'branded' ? 'border-blue-500 bg-blue-900/30 text-blue-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => selectSection('branded', assetStore.brandedExplorer.rootId)}>Branded Assets</button>
          <button className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold ${selectedSection === 'fonts' ? 'border-blue-500 bg-blue-900/30 text-blue-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => selectSection('fonts', fontRootId)}>Fonts</button>
          <button className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold ${selectedSection === 'templates' ? 'border-blue-500 bg-blue-900/30 text-blue-100' : 'border-slate-700 bg-slate-900 text-slate-200'}`} onClick={() => selectSection('templates', templateStore.rootId)}>Templates</button>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" onClick={onCreateFolder}>New Folder</button>
          <button className="rounded border border-red-700 px-2 py-1 text-xs text-red-300" onClick={onDeleteFolder}>Delete Folder</button>
        </div>

        <div className="mt-3 rounded-md border border-slate-700 bg-slate-900 p-2">
          {selectedSection === 'templates'
            ? renderTemplateFolderTree(templateStore.rootId)
            : renderAssetFolderTree(selectedSection === 'fonts' ? fontRootId : activeExplorer.rootId)}
        </div>
      </aside>

      <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">{selectedSection === 'templates' ? 'Templates' : 'Files'}</h3>
          <div className="flex items-center gap-2">
            {selectedSection !== 'templates' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={async (event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (!files.length || !folderNodeForSection || !('id' in folderNodeForSection)) return;
                    await assetStore.uploadFiles(files, folderNodeForSection.id, 'branded');
                    event.currentTarget.value = '';
                  }}
                />
                <button className="rounded border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100" onClick={onUploadFiles}>Upload Files</button>
              </>
            )}
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
          </div>
        </header>

        <div className="overflow-hidden rounded-md border border-slate-700">
          {selectedSection === 'templates' ? (
            <>
              <div className="grid grid-cols-[2.2fr_0.9fr_0.9fr_0.8fr_0.7fr] bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Template</span><span>Status</span><span>Format</span><span>Version</span><span>Updated</span>
              </div>
              <div className="divide-y divide-slate-800">
                {templates.filter((template) => template.folderId === ((folderNodeForSection && 'id' in folderNodeForSection) ? folderNodeForSection.id : templateStore.rootId)).map((template, index) => {
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
                <div key={node.id} className="flex items-center justify-between px-3 py-3 text-sm text-slate-200 hover:bg-slate-900/70">
                  <button className="flex-1 truncate text-left" onClick={() => {
                    if ('type' in node && node.type === 'folder') {
                      setActiveFolderId(node.id);
                      setExpandedNodeIds((prev) => new Set(prev).add(node.id));
                    }
                  }}>
                    {'type' in node && node.type === 'folder' ? `📁 ${node.name}` : `📄 ${node.name}`}
                  </button>
                  {'type' in node && node.type === 'file' && (
                    <button className="rounded border border-red-700 px-2 py-1 text-xs text-red-300" onClick={() => onDeleteFile(node.id, node.name)}>
                      Delete File
                    </button>
                  )}
                  {'dimension' in node && node.dimension ? <span className="ml-2 text-xs text-slate-500">{node.dimension}</span> : null}
                </div>
              ))}
              {!contentNodes.length && <p className="px-3 py-6 text-sm text-slate-500">No items in selected folder.</p>}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
