import { create } from 'zustand';
import type { AssetItem, ExplorerNode, ExplorerState } from '../types/domain';
import type { SavedTemplate } from './useTemplateStore';

const STORAGE_KEYS = {
  branded: 'renderless.fileExplorer.v1',
  fonts: 'renderless.fontExplorer.v1',
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

const persist = (kind: 'branded' | 'fonts' | 'templates', explorer: ExplorerState) => {
  const key = kind === 'branded' ? STORAGE_KEYS.branded : kind === 'fonts' ? STORAGE_KEYS.fonts : STORAGE_KEYS.templates;
  localStorage.setItem(key, JSON.stringify(explorer));
};

const mapFileToAsset = (node: ExplorerNode): AssetItem | null => {
  if (node.type !== 'file') return null;
  return {
    id: node.id,
    name: node.name,
    src: node.src,
    dimension: node.dimension,
    createdAt: node.createdAt,
  };
};

const extractAssets = (brandedExplorer: ExplorerState, fontsExplorer: ExplorerState, templateExplorer: ExplorerState): AssetItem[] => (
  [...brandedExplorer.nodes, ...fontsExplorer.nodes, ...templateExplorer.nodes]
    .map(mapFileToAsset)
    .filter((asset): asset is AssetItem => !!asset)
);

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const detectImageSize = (src: string): Promise<{ width: number; height: number }> => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
  img.onerror = () => resolve({ width: 0, height: 0 });
  img.src = src;
});

interface AssetStore {
  assets: AssetItem[];
  brandedExplorer: ExplorerState;
  fontsExplorer: ExplorerState;
  templateExplorer: ExplorerState;
  expandedBranded: Record<string, boolean>;
  expandedFonts: Record<string, boolean>;
  expandedTemplates: Record<string, boolean>;
  addAsset: (asset: AssetItem, targetFolderId: string, kind: 'branded' | 'fonts' | 'templates') => void;
  uploadFiles: (files: File[], targetFolderId: string, kind: 'branded' | 'fonts' | 'templates') => Promise<void>;
  addFolder: (name: string, parentId: string, kind: 'branded' | 'fonts' | 'templates') => void;
  renameFolder: (id: string, name: string, kind: 'branded' | 'fonts' | 'templates') => void;
  renameNode: (id: string, name: string, kind: 'branded' | 'fonts' | 'templates') => void;
  deleteFolder: (id: string, kind: 'branded' | 'fonts' | 'templates') => void;
  deleteNode: (id: string, kind: 'branded' | 'fonts' | 'templates') => void;
  toggleExpanded: (id: string, kind: 'branded' | 'fonts' | 'templates') => void;
  upsertTemplateAsset: (template: SavedTemplate) => void;
  removeTemplateAsset: (templateId: string) => void;
}

const brandedExplorer = loadExplorer(STORAGE_KEYS.branded, 'root', 'Branded Assets');
const fontsExplorer = loadExplorer(STORAGE_KEYS.fonts, 'fonts-root', 'Fonts');
const templateExplorer = loadExplorer(STORAGE_KEYS.templates, 'template-root', 'Templates');

const removeNodeFromExplorer = (explorer: ExplorerState, id: string): ExplorerState => {
  if (id === explorer.rootId) return explorer;
  const next = structuredClone(explorer);
  const doomed = new Set<string>();
  const walk = (nodeId: string) => {
    doomed.add(nodeId);
    const node = next.nodes.find((n) => n.id === nodeId);
    if (node?.type === 'folder') node.children.forEach(walk);
  };
  walk(id);
  next.nodes = next.nodes.filter((n) => !doomed.has(n.id));
  next.nodes.forEach((node) => {
    if (node.type === 'folder') node.children = node.children.filter((childId) => !doomed.has(childId));
  });
  return next;
};

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: extractAssets(brandedExplorer, fontsExplorer, templateExplorer),
  brandedExplorer,
  fontsExplorer,
  templateExplorer,
  expandedBranded: { root: true },
  expandedFonts: { 'fonts-root': true },
  expandedTemplates: { 'template-root': true },
  addAsset: (asset, targetFolderId, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    const folder = next.nodes.find((n) => n.id === targetFolderId && n.type === 'folder');
    if (!folder || folder.type !== 'folder') return;
    folder.children.push(asset.id);
    next.nodes.push({ id: asset.id, type: 'file', name: asset.name, parentId: targetFolderId, src: asset.src, dimension: asset.dimension, createdAt: asset.createdAt });
    persist(kind, next);
    const patch = { [key]: next } as Partial<AssetStore>;
    set({
      ...patch,
      assets: extractAssets(
        kind === 'branded' ? next : get().brandedExplorer,
        kind === 'fonts' ? next : get().fontsExplorer,
        kind === 'templates' ? next : get().templateExplorer,
      ),
    });
  },
  uploadFiles: async (files, targetFolderId, kind) => {
    for (const file of files) {
      const src = await readFileAsDataUrl(file);
      const { width, height } = await detectImageSize(src);
      const asset: AssetItem = {
        id: `${kind}-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        src,
        dimension: width && height ? `${width}x${height}` : 'unknown',
        createdAt: new Date().toISOString(),
      };
      get().addAsset(asset, targetFolderId, kind);
    }
  },
  addFolder: (name, parentId, kind) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    const parent = next.nodes.find((n) => n.id === parentId && n.type === 'folder');
    if (!parent || parent.type !== 'folder') return;
    const duplicate = parent.children
      .map((childId) => next.nodes.find((node) => node.id === childId))
      .some((node) => node?.type === 'folder' && node.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return;
    const id = `${kind}-folder-${Date.now()}`;
    parent.children.push(id);
    next.nodes.push(mkFolder(trimmed, parentId, id));
    persist(kind, next);
    set({ [key]: next } as Partial<AssetStore>);
  },
  renameFolder: (id, name, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    const folder = next.nodes.find((n) => n.id === id && n.type === 'folder');
    if (!folder || folder.type !== 'folder') return;
    folder.name = name;
    persist(kind, next);
    set({ [key]: next } as Partial<AssetStore>);
  },
  renameNode: (id, name, kind) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer';
    const next = structuredClone(get()[key]);
    const node = next.nodes.find((n) => n.id === id);
    if (!node) return;
    node.name = trimmed;
    persist(kind, next);
    const patch = { [key]: next } as Partial<AssetStore>;
    set({
      ...patch,
      assets: extractAssets(
        kind === 'branded' ? next : get().brandedExplorer,
        kind === 'fonts' ? next : get().fontsExplorer,
        kind === 'templates' ? next : get().templateExplorer,
      ),
    });
  },
  deleteFolder: (id, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer';
    const next = removeNodeFromExplorer(get()[key], id);
    persist(kind, next);
    const patch = { [key]: next } as Partial<AssetStore>;
    set({
      ...patch,
      assets: extractAssets(
        kind === 'branded' ? next : get().brandedExplorer,
        kind === 'fonts' ? next : get().fontsExplorer,
        kind === 'templates' ? next : get().templateExplorer,
      ),
    });
  },
  deleteNode: (id, kind) => {
    const key = kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer';
    const next = removeNodeFromExplorer(get()[key], id);
    persist(kind, next);
    const patch = { [key]: next } as Partial<AssetStore>;
    set({
      ...patch,
      assets: extractAssets(
        kind === 'branded' ? next : get().brandedExplorer,
        kind === 'fonts' ? next : get().fontsExplorer,
        kind === 'templates' ? next : get().templateExplorer,
      ),
    });
  },
  toggleExpanded: (id, kind) => {
    if (kind === 'branded') set((s) => ({ expandedBranded: { ...s.expandedBranded, [id]: !s.expandedBranded[id] } }));
    else if (kind === 'fonts') set((s) => ({ expandedFonts: { ...s.expandedFonts, [id]: !s.expandedFonts[id] } }));
    else set((s) => ({ expandedTemplates: { ...s.expandedTemplates, [id]: !s.expandedTemplates[id] } }));
  },
  upsertTemplateAsset: (template) => {
    const next = structuredClone(get().templateExplorer);
    const parentId = next.nodes.some((node) => node.type === 'folder' && node.id === template.folderId)
      ? template.folderId
      : next.rootId;
    const folder = next.nodes.find((node) => node.type === 'folder' && node.id === parentId);
    if (!folder || folder.type !== 'folder') return;

    const existing = next.nodes.find((node) => node.type === 'file' && node.id === template.id);
    const dimension = `${template.canvasWidth}x${template.canvasHeight}`;
    if (existing && existing.type === 'file') {
      existing.name = template.name;
      existing.parentId = parentId;
      existing.dimension = dimension;
      if (!folder.children.includes(template.id)) folder.children.push(template.id);
      next.nodes.forEach((node) => {
        if (node.type === 'folder' && node.id !== folder.id) {
          node.children = node.children.filter((childId) => childId !== template.id);
        }
      });
    } else {
      folder.children.push(template.id);
      next.nodes.push({
        id: template.id,
        type: 'file',
        name: template.name,
        parentId,
        src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23e2e8f0" font-family="Arial" font-size="22">Template</text></svg>',
        dimension,
        createdAt: template.createdAt,
      });
    }

    persist('templates', next);
    set({
      templateExplorer: next,
      assets: extractAssets(get().brandedExplorer, get().fontsExplorer, next),
    });
  },
  removeTemplateAsset: (templateId) => {
    const next = removeNodeFromExplorer(get().templateExplorer, templateId);
    persist('templates', next);
    set({
      templateExplorer: next,
      assets: extractAssets(get().brandedExplorer, get().fontsExplorer, next),
    });
  },
}));
