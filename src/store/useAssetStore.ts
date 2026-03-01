import { create } from 'zustand';
import type { AssetItem, ExplorerNode, ExplorerState, FileNode, FolderNode } from '../types/domain';
import type { SavedTemplate } from './useTemplateStore';

const STORAGE_KEYS = {
  branded: 'renderless.fileExplorer.v2',
  fonts: 'renderless.fontExplorer.v2',
  templates: 'renderless.templateLibrary.v2',
};

type ExplorerKind = 'branded' | 'fonts' | 'templates';

type MoveCheck = { ok: boolean; reason?: string };

type PersistedBlob = {
  brandedExplorer: ExplorerState;
  fontsExplorer: ExplorerState;
  templateExplorer: ExplorerState;
};

const mkFolder = (name: string, parentId: string | null, id: string): FolderNode => ({
  id,
  type: 'folder',
  kind: 'folder',
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

const INITIAL_BRANDED = defaultExplorer('root', 'Branded Assets');
const INITIAL_FONTS = defaultExplorer('fonts-root', 'Fonts');
const INITIAL_TEMPLATES = defaultExplorer('template-root', 'Templates');

const normalizeExplorer = (value: unknown, fallback: ExplorerState, fileKind: FileNode['kind']): ExplorerState => {
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as ExplorerState;
  if (!raw.rootId || !Array.isArray(raw.nodes)) return fallback;
  const nodes = raw.nodes
    .map((node): ExplorerNode | null => {
      if (!node || typeof node !== 'object') return null;
      const base = node as ExplorerNode;
      if (base.type === 'folder') {
        return {
          ...base,
          kind: 'folder',
          createdAt: base.createdAt || new Date().toISOString(),
          children: Array.isArray(base.children) ? base.children : [],
          permissions: base.permissions ?? { owners: [], editors: [], viewers: [] },
        };
      }
      if (base.type === 'file') {
        return {
          ...base,
          kind: (base as FileNode).kind ?? fileKind,
          createdAt: base.createdAt || new Date().toISOString(),
          parentId: base.parentId || fallback.rootId,
        };
      }
      return null;
    })
    .filter((node): node is ExplorerNode => !!node);

  if (!nodes.some((node) => node.id === raw.rootId && node.type === 'folder')) {
    nodes.unshift(mkFolder(fallback.nodes[0].name, null, fallback.rootId));
  }

  return { rootId: raw.rootId, nodes };
};

const loadExplorer = (key: string, fallback: ExplorerState, fileKind: FileNode['kind']) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return normalizeExplorer(JSON.parse(raw), fallback, fileKind);
  } catch {
    return fallback;
  }
};

const persist = (kind: ExplorerKind, explorer: ExplorerState) => {
  const key = kind === 'branded' ? STORAGE_KEYS.branded : kind === 'fonts' ? STORAGE_KEYS.fonts : STORAGE_KEYS.templates;
  localStorage.setItem(key, JSON.stringify(explorer));
};

const getExplorerKey = (kind: ExplorerKind) => (
  kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer'
);

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

const isDescendantFolder = (explorer: ExplorerState, folderId: string, candidateId: string): boolean => {
  const folder = explorer.nodes.find((node) => node.type === 'folder' && node.id === folderId);
  if (!folder || folder.type !== 'folder') return false;
  if (folder.children.includes(candidateId)) return true;
  return folder.children.some((childId) => {
    const child = explorer.nodes.find((node) => node.id === childId);
    return child?.type === 'folder' ? isDescendantFolder(explorer, child.id, candidateId) : false;
  });
};

interface AssetStore {
  assets: AssetItem[];
  brandedExplorer: ExplorerState;
  fontsExplorer: ExplorerState;
  templateExplorer: ExplorerState;
  expandedBranded: Record<string, boolean>;
  expandedFonts: Record<string, boolean>;
  expandedTemplates: Record<string, boolean>;
  addAsset: (asset: AssetItem, targetFolderId: string, kind: ExplorerKind) => void;
  uploadFiles: (files: File[], targetFolderId: string, kind: ExplorerKind) => Promise<void>;
  addFolder: (name: string, parentId: string, kind: ExplorerKind) => void;
  renameNode: (id: string, name: string, kind: ExplorerKind) => void;
  deleteNode: (id: string, kind: ExplorerKind) => void;
  canMoveNode: (nodeId: string, targetFolderId: string, kind: ExplorerKind) => MoveCheck;
  moveNode: (nodeId: string, targetFolderId: string, kind: ExplorerKind) => boolean;
  toggleExpanded: (id: string, kind: ExplorerKind) => void;
  exportState: () => string;
  resetState: () => void;
  upsertTemplateAsset: (template: SavedTemplate) => void;
  removeTemplateAsset: (templateId: string) => void;
}

const buildMoveCheck = (explorer: ExplorerState, nodeId: string, targetFolderId: string): MoveCheck => {
  const node = explorer.nodes.find((entry) => entry.id === nodeId);
  const targetFolder = explorer.nodes.find((entry) => entry.type === 'folder' && entry.id === targetFolderId);
  if (!node) return { ok: false, reason: 'Node not found.' };
  if (!targetFolder || targetFolder.type !== 'folder') return { ok: false, reason: 'Destination folder not found.' };
  if (node.id === explorer.rootId) return { ok: false, reason: 'Root folder cannot be moved.' };
  if (node.id === targetFolderId) return { ok: false, reason: 'Cannot move item into itself.' };
  if (node.parentId === targetFolderId) return { ok: false, reason: 'Item is already in that folder.' };
  if (node.type === 'folder' && isDescendantFolder(explorer, node.id, targetFolderId)) {
    return { ok: false, reason: 'Cannot move folder into itself or its descendant.' };
  }

  const duplicate = targetFolder.children
    .map((childId) => explorer.nodes.find((childNode) => childNode.id === childId))
    .some((childNode) => !!childNode && childNode.name.toLowerCase() === node.name.toLowerCase());
  if (duplicate) return { ok: false, reason: 'A node with that name already exists in destination.' };

  const previousParent = node.parentId
    ? explorer.nodes.find((entry) => entry.type === 'folder' && entry.id === node.parentId)
    : undefined;
  if (!previousParent || previousParent.type !== 'folder') return { ok: false, reason: 'Source parent folder is invalid.' };

  return { ok: true };
};

const brandedExplorer = loadExplorer(STORAGE_KEYS.branded, INITIAL_BRANDED, 'asset');
const fontsExplorer = loadExplorer(STORAGE_KEYS.fonts, INITIAL_FONTS, 'font');
const templateExplorer = loadExplorer(STORAGE_KEYS.templates, INITIAL_TEMPLATES, 'template');

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: extractAssets(brandedExplorer, fontsExplorer, templateExplorer),
  brandedExplorer,
  fontsExplorer,
  templateExplorer,
  expandedBranded: { [brandedExplorer.rootId]: true },
  expandedFonts: { [fontsExplorer.rootId]: true },
  expandedTemplates: { [templateExplorer.rootId]: true },
  addAsset: (asset, targetFolderId, kind) => {
    const key = getExplorerKey(kind);
    const next = structuredClone(get()[key]);
    const folder = next.nodes.find((n) => n.id === targetFolderId && n.type === 'folder');
    if (!folder || folder.type !== 'folder') return;

    folder.children.push(asset.id);
    next.nodes.push({
      id: asset.id,
      type: 'file',
      kind: kind === 'fonts' ? 'font' : kind === 'templates' ? 'template' : 'asset',
      name: asset.name,
      parentId: targetFolderId,
      src: asset.src,
      dimension: asset.dimension,
      createdAt: asset.createdAt,
    });

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
    const key = getExplorerKey(kind);
    const next = structuredClone(get()[key]);
    const parent = next.nodes.find((n) => n.id === parentId && n.type === 'folder');
    if (!parent || parent.type !== 'folder') return;
    const duplicate = parent.children
      .map((childId) => next.nodes.find((node) => node.id === childId))
      .some((node) => node?.type === 'folder' && node.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return;
    const id = `${kind}-folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    parent.children.push(id);
    next.nodes.push(mkFolder(trimmed, parentId, id));
    persist(kind, next);
    set({ [key]: next } as Partial<AssetStore>);
  },
  renameNode: (id, name, kind) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = getExplorerKey(kind);
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
  deleteNode: (id, kind) => {
    const key = getExplorerKey(kind);
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
  canMoveNode: (nodeId, targetFolderId, kind) => {
    const key = getExplorerKey(kind);
    return buildMoveCheck(get()[key], nodeId, targetFolderId);
  },
  moveNode: (nodeId, targetFolderId, kind) => {
    const key = getExplorerKey(kind);
    const next = structuredClone(get()[key]);
    const check = buildMoveCheck(next, nodeId, targetFolderId);
    if (!check.ok) return false;

    const node = next.nodes.find((entry) => entry.id === nodeId);
    const targetFolder = next.nodes.find((entry) => entry.type === 'folder' && entry.id === targetFolderId);
    const previousParent = node?.parentId
      ? next.nodes.find((entry) => entry.type === 'folder' && entry.id === node.parentId)
      : undefined;

    if (!node || !targetFolder || targetFolder.type !== 'folder' || !previousParent || previousParent.type !== 'folder') {
      return false;
    }

    previousParent.children = previousParent.children.filter((childId) => childId !== node.id);
    targetFolder.children.push(node.id);
    node.parentId = targetFolder.id;

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
    return true;
  },
  toggleExpanded: (id, kind) => {
    if (kind === 'branded') set((s) => ({ expandedBranded: { ...s.expandedBranded, [id]: !s.expandedBranded[id] } }));
    else if (kind === 'fonts') set((s) => ({ expandedFonts: { ...s.expandedFonts, [id]: !s.expandedFonts[id] } }));
    else set((s) => ({ expandedTemplates: { ...s.expandedTemplates, [id]: !s.expandedTemplates[id] } }));
  },
  exportState: () => JSON.stringify({
    brandedExplorer: get().brandedExplorer,
    fontsExplorer: get().fontsExplorer,
    templateExplorer: get().templateExplorer,
  } satisfies PersistedBlob, null, 2),
  resetState: () => {
    localStorage.removeItem(STORAGE_KEYS.branded);
    localStorage.removeItem(STORAGE_KEYS.fonts);
    localStorage.removeItem(STORAGE_KEYS.templates);
    set({
      brandedExplorer: structuredClone(INITIAL_BRANDED),
      fontsExplorer: structuredClone(INITIAL_FONTS),
      templateExplorer: structuredClone(INITIAL_TEMPLATES),
      assets: extractAssets(INITIAL_BRANDED, INITIAL_FONTS, INITIAL_TEMPLATES),
      expandedBranded: { [INITIAL_BRANDED.rootId]: true },
      expandedFonts: { [INITIAL_FONTS.rootId]: true },
      expandedTemplates: { [INITIAL_TEMPLATES.rootId]: true },
    });
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
      existing.kind = 'template';
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
        kind: 'template',
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
