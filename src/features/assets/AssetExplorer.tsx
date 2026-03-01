import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAssetStore } from '../../store/useAssetStore';
import type { ExplorerNode } from '../../types/domain';

interface Props { kind: 'branded' | 'fonts' | 'templates'; title: string }

const iconBtn = 'h-8 w-8 rounded border border-slate-700 bg-slate-900 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50';

type DragPayload = {
  nodeId: string;
  kind: 'branded' | 'fonts' | 'templates';
};

export function AssetExplorer({ kind, title }: Props) {
  const store = useAssetStore();
  const explorer = kind === 'branded' ? store.brandedExplorer : kind === 'fonts' ? store.fontsExplorer : store.templateExplorer;
  const expanded = kind === 'branded' ? store.expandedBranded : kind === 'fonts' ? store.expandedFonts : store.expandedTemplates;
  const [currentFolderId, setCurrentFolderId] = useState(explorer.rootId);
  const [query, setQuery] = useState('');
  const uploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentFolderId(explorer.rootId);
  }, [kind, explorer.rootId]);

  const getNode = (id: string) => explorer.nodes.find((n) => n.id === id);
  const rootNode = getNode(explorer.rootId);
  const currentFolderNode = getNode(currentFolderId);
  const currentFolder = currentFolderNode?.type === 'folder' ? currentFolderNode : rootNode;

  const getFolderPath = (folderId: string) => {
    const segments: string[] = [];
    let cursor = getNode(folderId);
    while (cursor && cursor.type === 'folder') {
      segments.unshift(cursor.name);
      cursor = cursor.parentId ? getNode(cursor.parentId) : undefined;
    }
    return segments.join(' / ');
  };

  const uploadFolderId = currentFolder?.type === 'folder' ? currentFolder.id : explorer.rootId;
  const uploadPath = getFolderPath(uploadFolderId);

  const children = useMemo(() => {
    const folder = getNode(uploadFolderId);
    if (!folder || folder.type !== 'folder') return [];
    return folder.children.map(getNode).filter(Boolean) as ExplorerNode[];
  }, [uploadFolderId, explorer]);

  const filteredChildren = children.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

  const renameItem = (item: ExplorerNode) => {
    const nextName = window.prompt('Rename item', item.name)?.trim();
    if (!nextName || nextName === item.name) return;
    store.renameNode(item.id, nextName, kind);
  };

  const deleteItem = (item: ExplorerNode) => {
    if (item.type === 'folder' && item.children.length > 0) {
      const confirmed = window.confirm(`Folder "${item.name}" has ${item.children.length} child item(s). Delete it and everything inside?`);
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(`Delete "${item.name}"?`);
      if (!confirmed) return;
    }
    store.deleteNode(item.id, kind);
    if (item.id === currentFolderId) setCurrentFolderId(explorer.rootId);
  };

  const onDropOnFolder = (event: DragEvent, targetFolderId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const raw = event.dataTransfer.getData('application/json');
    if (!raw) return;
    let payload: DragPayload | null = null;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      payload = null;
    }
    if (!payload || payload.kind !== kind || payload.nodeId === targetFolderId) return;
    const check = store.canMoveNode(payload.nodeId, targetFolderId, kind);
    if (!check.ok) {
      if (check.reason) window.alert(check.reason);
      return;
    }
    const moved = store.moveNode(payload.nodeId, targetFolderId, kind);
    if (moved) setCurrentFolderId(targetFolderId);
  };

  const renderTree = (folderId: string, depth = 0): JSX.Element | null => {
    const folder = getNode(folderId);
    if (!folder || folder.type !== 'folder') return null;
    const childFolders = folder.children
      .map(getNode)
      .filter((n): n is ExplorerNode => !!n && n.type === 'folder');
    const isOpen = expanded[folderId] ?? depth === 0;
    return (
      <div key={folderId} style={{ marginLeft: depth * 12 }} className="space-y-1">
        <div className="flex items-center gap-1">
          {childFolders.length > 0 ? (
            <button className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs" onClick={() => store.toggleExpanded(folderId, kind)}>{isOpen ? '▾' : '▸'}</button>
          ) : <span className="inline-block h-5 w-5" />}
          <button
            className={`w-full rounded border px-2 py-1 text-left ${uploadFolderId === folder.id ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}`}
            onClick={() => setCurrentFolderId(folder.id)}
            onDoubleClick={() => renameItem(folder)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDropOnFolder(event, folder.id)}
          >
            {folder.name}
          </button>
        </div>
        {isOpen && childFolders.map((c) => renderTree(c.id, depth + 1))}
      </div>
    );
  };

  return (
    <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <h3 className="mb-2 font-semibold">{title} Folders</h3>
        {renderTree(explorer.rootId)}
      </aside>
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <p className="mb-1 text-xs text-slate-400">Breadcrumb: <span className="font-semibold text-slate-200">{uploadPath || title}</span></p>
        <p className="mb-2 text-xs text-slate-400">Uploading to: <span className="font-semibold text-slate-200">{uploadPath || title}</span></p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1" placeholder={`Search ${title.toLowerCase()}`} />
          <button
            className={iconBtn}
            title="Create folder"
            onClick={() => {
              const name = window.prompt('Name this new folder')?.trim();
              if (name) store.addFolder(name, uploadFolderId, kind);
            }}
          >
            ➕
          </button>
          <button
            className={iconBtn}
            title="Delete selected folder"
            onClick={() => {
              if (uploadFolderId === explorer.rootId) return;
              if (currentFolder && currentFolder.type === 'folder') deleteItem(currentFolder);
            }}
            disabled={uploadFolderId === explorer.rootId}
          >
            🗑
          </button>
          <button className={iconBtn} title="Upload file" onClick={() => uploadRef.current?.click()}>⤴</button>
          <input
            ref={uploadRef}
            type="file"
            accept={kind === 'fonts' ? '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,*/*' : 'image/png,image/jpeg,.png,.jpg,.jpeg'}
            multiple
            className="hidden"
            onChange={async (event) => {
              const files = Array.from(event.target.files || []);
              if (!files.length) return;
              await store.uploadFiles(files, uploadFolderId, kind);
              setCurrentFolderId(uploadFolderId);
              event.currentTarget.value = '';
            }}
          />
        </div>
        <div className="grid gap-2 text-sm">
          <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_auto] text-slate-400"><span>Name</span><span>Type</span><span>Dimension</span><span>Modified</span><span /></div>
          {filteredChildren.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.8fr_1fr_1fr_1fr_auto] items-center gap-2 rounded border border-slate-800 bg-slate-900 p-2 text-left hover:border-blue-500/60 hover:bg-slate-800"
              role="button"
              tabIndex={0}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/json', JSON.stringify({ nodeId: item.id, kind } satisfies DragPayload));
              }}
              onClick={() => { if (item.type === 'folder') setCurrentFolderId(item.id); }}
              onDoubleClick={() => renameItem(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && item.type === 'folder') setCurrentFolderId(item.id);
              }}
              onDragOver={(event) => {
                if (item.type === 'folder') event.preventDefault();
              }}
              onDrop={(event) => {
                if (item.type === 'folder') onDropOnFolder(event, item.id);
              }}
            >
              <span className="flex items-center gap-2">
                {item.type === 'folder' ? (
                  <span>📁</span>
                ) : item.kind === 'asset' && item.src ? (
                  <img src={item.src} alt={item.name} className="h-8 w-8 rounded border border-slate-700 object-cover" />
                ) : (
                  <span>🖼️</span>
                )}
                <span>{item.name}</span>
              </span>
              <span>{item.type === 'folder' ? 'Folder' : item.kind}</span>
              <span>{item.type === 'folder' ? `${item.children.length} item(s)` : item.dimension}</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              <button className={iconBtn} title="Delete" onClick={(event) => { event.stopPropagation(); deleteItem(item); }}>🗑</button>
            </div>
          ))}
          {!children.length && <p className="text-slate-500">This folder is empty.</p>}
          {children.length > 0 && !filteredChildren.length && <p className="text-slate-500">No items match your search.</p>}
        </div>
      </div>
    </section>
  );
}
