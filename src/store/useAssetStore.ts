import { create } from 'zustand';
import type { AssetItem, ExplorerNode, ExplorerState } from '../types/domain';

const STORAGE_KEYS = {
  branded: 'renderless.fileExplorer.v1',
  templates: 'renderless.templateLibrary.v1',
};

const mkFolder = (name: string, parentId: string | null, id: string): ExplorerNode => ({
  id,
  type: 'folder',
  name,
  parentId,
  children: [],
  createdAt: new Date().toISOString(),
  permissions: { owners: ['admin@renderless.ai'], editors: ['design@renderless.ai'], viewers: ['sales@renderless.ai'] },
});

const defaultExplorer = (rootId: string, rootName: string): ExplorerState => ({
  rootId,
  nodes: [mkFolder(rootName, null, rootId)],
});

const loadExplorer = (key: string, rootId: string, rootName: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultExplorer(rootId, rootName);
    return JSON.parse(raw) as ExplorerState;
  } catch {
    return defaultExplorer(rootId, rootName);
  }
};

interface AssetStore {
  assets: AssetItem[];
  brandedExplorer: ExplorerState;
  templateExplorer: ExplorerState;
  expandedBranded: Record<string, boolean>;
  expandedTemplates: Record<string, boolean>;
  addAsset: (asset: AssetItem, targetFolderId: string, kind: 'branded' | 'templates') => void;
  addFolder: (name: string, parentId: string, kind: 'branded' | 'templates') => void;
  renameFolder: (id: string, name: string, kind: 'branded' | 'templates') => void;
  deleteFolder: (id: string, kind: 'branded' | 'templates') => void;
  toggleExpanded: (id: string, kind: 'branded' | 'templates') => void;
}

const persist = (kind: 'branded' | 'templates', explorer: ExplorerState) => {
  localStorage.setItem(kind === 'branded' ? STORAGE_KEYS.branded : STORAGE_KEYS.templates, JSON.stringify(explorer));
};

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  brandedExplorer: loadExplorer(STORAGE_KEYS.branded, 'root', 'Branded Assets'),
  templateExplorer: loadExplorer(STORAGE_KEYS.templates, 'template-root', 'Templates'),
  expandedBranded: { root: true },
  expandedTemplates: { 'template-root': true },
  addAsset: (asset, targetFolderId, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    const folder = next.nodes.find((n) => n.id === targetFolderId && n.type === 'folder');
    if (!folder || folder.type !== 'folder') return;
    folder.children.push(asset.id);
    next.nodes.push({ id: asset.id, type: 'file', name: asset.name, parentId: targetFolderId, src: asset.src, dimension: asset.dimension, createdAt: asset.createdAt });
    persist(kind, next);
    set({ [key]: next, assets: [...get().assets, asset] } as Partial<AssetStore>);
  },
  addFolder: (name, parentId, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    const parent = next.nodes.find((n) => n.id === parentId && n.type === 'folder');
    if (!parent || parent.type !== 'folder') return;
    const id = `${kind}-folder-${Date.now()}`;
    parent.children.push(id);
    next.nodes.push(mkFolder(name, parentId, id));
    persist(kind, next);
    set({ [key]: next } as Partial<AssetStore>);
  },
  renameFolder: (id, name, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    const folder = next.nodes.find((n) => n.id === id && n.type === 'folder');
    if (!folder || folder.type !== 'folder') return;
    folder.name = name;
    persist(kind, next);
    set({ [key]: next } as Partial<AssetStore>);
  },
  deleteFolder: (id, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    if (id === next.rootId) return;
    const doomed = new Set<string>();
    const walk = (nodeId: string) => {
      doomed.add(nodeId);
      const node = next.nodes.find((n) => n.id === nodeId);
      if (node?.type === 'folder') node.children.forEach(walk);
    };
    walk(id);
    next.nodes = next.nodes.filter((n) => !doomed.has(n.id));
    next.nodes.forEach((n) => { if (n.type === 'folder') n.children = n.children.filter((c) => !doomed.has(c)); });
    persist(kind, next);
    set({ [key]: next } as Partial<AssetStore>);
  },
  toggleExpanded: (id, kind) => {
    if (kind === 'branded') set((s) => ({ expandedBranded: { ...s.expandedBranded, [id]: !s.expandedBranded[id] } }));
    else set((s) => ({ expandedTemplates: { ...s.expandedTemplates, [id]: !s.expandedTemplates[id] } }));
  },
}));
