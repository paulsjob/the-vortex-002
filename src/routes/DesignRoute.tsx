import { useMemo, useState } from 'react';
import { useAssetStore } from '../store/useAssetStore';
import { useLayerStore } from '../store/useLayerStore';
import type { ExplorerNode } from '../types/domain';

const TEMPLATE_SIZES = [
  { value: '1920x1080', label: '1920 × 1080' },
  { value: '1080x1920', label: '1080 × 1920' },
  { value: '1080x1350', label: '1080 × 1350' },
  { value: '1080x1080', label: '1080 × 1080' },
];

export function DesignRoute() {
  const assetStore = useAssetStore();
  const {
    layers,
    canvasWidth,
    canvasHeight,
    addText,
    addAssetLayer,
    setCanvasSize,
    setZOrder,
    deleteLayer,
    renameLayer,
    saveTemplate,
  } = useLayerStore();

  const [folderId, setFolderId] = useState(assetStore.brandedExplorer.rootId);
  const [search, setSearch] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerValue, setEditingLayerValue] = useState('');

  const orderedLayers = useMemo(() => [...layers].sort((a, b) => b.zIndex - a.zIndex), [layers]);

  const getNode = (id: string) => assetStore.brandedExplorer.nodes.find((n) => n.id === id);
  const folderChildren = useMemo(() => {
    const folder = getNode(folderId);
    if (!folder || folder.type !== 'folder') return [];
    return folder.children.map(getNode).filter(Boolean) as ExplorerNode[];
  }, [folderId, assetStore.brandedExplorer]);

  const files = folderChildren.filter((n) => n.type === 'file');
  const filtered = folderChildren.filter((n) => n.name.toLowerCase().includes(search.toLowerCase()));

  const addAssetFromLibrary = () => {
    const first = files[0];
    if (first && first.type === 'file') addAssetLayer(first.id);
  };

  const renderFolderTree = (id: string, depth = 0): JSX.Element | null => {
    const node = getNode(id);
    if (!node || node.type !== 'folder') return null;
    const children = node.children.map(getNode).filter((x): x is ExplorerNode => !!x && x.type === 'folder');
    const isOpen = assetStore.expandedBranded[id] ?? depth === 0;
    return (
      <div key={id} style={{ marginLeft: depth * 12 }} className="space-y-1">
        <div className="flex items-center gap-1">
          {children.length > 0 ? (
            <button className="h-5 w-5 rounded border border-slate-700 bg-slate-800 text-xs" onClick={() => assetStore.toggleExpanded(id, 'branded')}>{isOpen ? '▾' : '▸'}</button>
          ) : <span className="inline-block h-5 w-5" />}
          <button onClick={() => setFolderId(id)} className={`w-full rounded border px-2 py-1 text-left ${folderId === id ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}`}>{node.name}</button>
        </div>
        {isOpen && children.map((child) => renderFolderTree(child.id, depth + 1))}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Canvas · {canvasWidth} × {canvasHeight}</h3>
          <div className="relative w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800" style={{ aspectRatio: `${canvasWidth}/${canvasHeight}` }}>
            {!orderedLayers.length ? (
              <p className="absolute inset-0 grid place-items-center text-xl text-slate-400">Stage is blank. Add an asset or text layer to begin.</p>
            ) : orderedLayers.map((layer) => (
              <div key={layer.id} className="absolute" style={{ left: `${(layer.x / canvasWidth) * 100}%`, top: `${(layer.y / canvasHeight) * 100}%`, opacity: layer.opacity / 100 }}>
                {layer.kind === 'text' && <span style={{ fontSize: `${layer.size / 2}px`, color: layer.color, fontWeight: 700 }}>{layer.text}</span>}
                {layer.kind === 'shape' && <div style={{ width: `${layer.width / 2}px`, height: `${layer.height / 2}px`, background: layer.fill }} />}
                {layer.kind === 'asset' && <div className="h-14 w-32 rounded bg-slate-700/90 px-2 py-1 text-xs text-slate-200">Asset Layer</div>}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Layer Stack</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded bg-blue-700 px-3 py-2 font-semibold" onClick={() => saveTemplate(`Template ${Date.now()}`)}>+New Template</button>
              <button className="rounded bg-blue-700 px-3 py-2 font-semibold" onClick={() => saveTemplate(`Saved ${Date.now()}`)}>Save Template</button>
              <button className="rounded bg-blue-700 px-3 py-2 font-semibold" onClick={addAssetFromLibrary}>Add Asset Layer</button>
              <button className="rounded bg-blue-700 px-3 py-2 font-semibold" onClick={addText}>Add Text Layer</button>
            </div>
          </div>

          <label className="mb-2 block text-sm">Template Size
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2"
              value={`${canvasWidth}x${canvasHeight}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x').map(Number);
                setCanvasSize(w, h);
              }}
            >
              {TEMPLATE_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <p className="mb-3 text-slate-400">Viewport coordinates: top-left 0,0 · center {Math.round(canvasWidth / 2)},{Math.round(canvasHeight / 2)} · bottom-right {canvasWidth},{canvasHeight}</p>

          {!orderedLayers.length ? <p className="text-slate-400">No layers yet. Add an asset layer or text layer.</p> : (
            <div className="space-y-2">
              {orderedLayers.map((layer) => (
                <div key={layer.id} className="rounded border border-slate-700 bg-slate-900 p-2">
                  <div className="flex items-center gap-2">
                    {editingLayerId === layer.id ? (
                      <input
                        className="flex-1 rounded border border-blue-500 bg-slate-950 px-2 py-1"
                        value={editingLayerValue}
                        onChange={(e) => setEditingLayerValue(e.target.value)}
                        onBlur={() => {
                          renameLayer(layer.id, editingLayerValue.trim() || layer.name);
                          setEditingLayerId(null);
                          setEditingLayerValue('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameLayer(layer.id, editingLayerValue.trim() || layer.name);
                            setEditingLayerId(null);
                            setEditingLayerValue('');
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <strong className="flex-1" onDoubleClick={() => { setEditingLayerId(layer.id); setEditingLayerValue(layer.name); }}>{layer.name}</strong>
                    )}
                    <button className="rounded border border-slate-600 px-2" onClick={() => setZOrder(layer.id, 'up')}>↑</button>
                    <button className="rounded border border-slate-600 px-2" onClick={() => setZOrder(layer.id, 'down')}>↓</button>
                    <button className="rounded bg-red-800 px-2" onClick={() => deleteLayer(layer.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Branded Assets Locker</h3>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-slate-700 bg-slate-950 p-3">
            <h4 className="mb-2 text-xl font-bold">Folders</h4>
            {renderFolderTree(assetStore.brandedExplorer.rootId)}
          </aside>

          <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets" className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2" />
              <button className="rounded bg-blue-700 px-3 py-2" onClick={() => {
                const name = window.prompt('Name this new folder')?.trim();
                if (name) assetStore.addFolder(name, folderId, 'branded');
              }}>Create Folder</button>
              <button className="rounded bg-slate-700 px-3 py-2" onClick={() => assetStore.deleteFolder(folderId, 'branded')}>Delete Folder</button>
              <label className="cursor-pointer rounded bg-blue-700 px-3 py-2">Upload
                <input
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length) await assetStore.uploadFiles(files, folderId, 'branded');
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-4 text-slate-400">
              <span>NAME</span><span>TYPE</span><span>DIMENSION</span><span>MODIFIED</span>
            </div>
            <div className="mt-2 space-y-2">
              {filtered.map((item) => (
                <div key={item.id} className="grid grid-cols-4 rounded border border-slate-700 bg-slate-900 p-2 text-sm">
                  <span>{item.type === 'folder' ? `📁 ${item.name}` : `🖼️ ${item.name}`}</span>
                  <span>{item.type === 'folder' ? 'Folder' : 'File'}</span>
                  <span>{item.type === 'folder' ? `${item.children.length} item(s)` : item.dimension}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              {!filtered.length && <p className="text-slate-500">No matching assets in this folder.</p>}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
