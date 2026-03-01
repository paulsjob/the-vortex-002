import { create } from 'zustand';
import type { AssetItem, ExplorerNode, ExplorerState, FileNode, FolderNode } from '../types/domain';
import type { SavedTemplate } from './useTemplateStore';
import { clearStore, deleteBlob, getBlob, putBlob } from './blobDb';

type BlobStoreName = 'assets' | 'fonts';

const STORAGE_KEYS = {
  branded: 'renderless.fileExplorer.v2',
  fonts: 'renderless.fontExplorer.v2',
  templates: 'renderless.templateLibrary.v2',
};

type ExplorerKind = 'branded' | 'fonts' | 'templates';

type MoveCheck = { ok: boolean; reason?: string };
type AssetDragKind = 'assets' | 'assetFolders';

type PersistedBlob = {
  brandedExplorer: ExplorerState;
  fontsExplorer: ExplorerState;
  templateExplorer: ExplorerState;
};

type AssetRecord = {
  id: string;
  name: string;
  kind: 'brandedAsset' | 'font';
  mime: string;
  size: number;
  folderId: string | null;
  createdAt: number;
};

type LegacyBlobCandidate = {
  blobKey: string;
  data: string;
  mime: string;
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

const getBlobStore = (kind: 'branded' | 'fonts'): BlobStoreName => (kind === 'fonts' ? 'fonts' : 'assets');

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const toDataUrl = (value: string, mime: string): string => (
  value.startsWith('data:') ? value : `data:${mime};base64,${value}`
);

const pickLegacyCandidate = (rawNode: Record<string, unknown>, fallbackMime: string): LegacyBlobCandidate | null => {
  const blobKey = typeof rawNode.blobKey === 'string' && rawNode.blobKey.trim()
    ? rawNode.blobKey
    : typeof rawNode.id === 'string'
      ? rawNode.id
      : null;
  if (!blobKey) return null;

  const possible = [rawNode.dataUrl, rawNode.content, rawNode.base64, rawNode.fileBytes, rawNode.src];
  const data = possible.find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  if (!data) return null;

  return {
    blobKey,
    data,
    mime: typeof rawNode.mime === 'string' && rawNode.mime ? rawNode.mime : fallbackMime,
  };
};

const normalizeExplorer = (
  value: unknown,
  fallback: ExplorerState,
  fileKind: FileNode['kind'],
  legacyCandidates: LegacyBlobCandidate[],
): ExplorerState => {
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
        const rawNode = node as unknown as Record<string, unknown>;
        const incomingKind = (base as FileNode).kind ?? fileKind;
        const mime = typeof (base as FileNode).mime === 'string' ? (base as FileNode).mime : '';
        const size = typeof (base as FileNode).size === 'number' ? (base as FileNode).size : 0;
        const rawBlobKey = (base as FileNode).blobKey;
        const blobKey = typeof rawBlobKey === 'string' && rawBlobKey.trim()
          ? rawBlobKey
          : base.id;

        if (fileKind !== 'template') {
          const legacy = pickLegacyCandidate(rawNode, mime || 'application/octet-stream');
          if (legacy) legacyCandidates.push(legacy);
        }

        return {
          id: base.id,
          type: 'file',
          kind: incomingKind,
          name: base.name,
          createdAt: base.createdAt || new Date().toISOString(),
          parentId: base.parentId || fallback.rootId,
          dimension: (base as FileNode).dimension ?? 'unknown',
          src: fileKind === 'template' ? (base as FileNode).src : undefined,
          mime,
          size,
          blobKey,
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

const loadExplorer = (
  key: string,
  fallback: ExplorerState,
  fileKind: FileNode['kind'],
  legacyCandidates: LegacyBlobCandidate[],
) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return normalizeExplorer(JSON.parse(raw), fallback, fileKind, legacyCandidates);
  } catch {
    return fallback;
  }
};

const persist = (kind: ExplorerKind, explorer: ExplorerState) => {
  const key = kind === 'branded' ? STORAGE_KEYS.branded : kind === 'fonts' ? STORAGE_KEYS.fonts : STORAGE_KEYS.templates;
  const sanitized = {
    ...explorer,
    nodes: explorer.nodes.map((node) => {
      if (node.type !== 'file' || kind === 'templates') return node;
      return {
        id: node.id,
        type: node.type,
        kind: node.kind,
        name: node.name,
        parentId: node.parentId,
        dimension: node.dimension,
        createdAt: node.createdAt,
        mime: node.mime,
        size: node.size,
        blobKey: node.blobKey || node.id,
      } satisfies Omit<FileNode, 'src'> & { src?: string };
    }),
  } satisfies ExplorerState;
  localStorage.setItem(key, JSON.stringify(sanitized));
};

const getExplorerKey = (kind: ExplorerKind) => (
  kind === 'branded' ? 'brandedExplorer' : kind === 'fonts' ? 'fontsExplorer' : 'templateExplorer'
);

const mapFileToAsset = (node: ExplorerNode): AssetItem | null => {
  if (node.type !== 'file') return null;
  const src = node.src ?? node.url;
  if (!src) return null;
  return {
    id: node.id,
    name: node.name,
    src,
    dimension: node.dimension ?? 'unknown',
    createdAt: node.createdAt,
  };
};

const extractAssets = (brandedExplorer: ExplorerState, fontsExplorer: ExplorerState, templateExplorer: ExplorerState): AssetItem[] => (
  [...brandedExplorer.nodes, ...fontsExplorer.nodes, ...templateExplorer.nodes]
    .map(mapFileToAsset)
    .filter((asset): asset is AssetItem => !!asset)
);

const detectImageSize = (src: string): Promise<{ width: number; height: number }> => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
  img.onerror = () => resolve({ width: 0, height: 0 });
  img.src = src;
});

const detectImageSizeFromBlob = async (blob: Blob): Promise<{ width: number; height: number }> => {
  const url = URL.createObjectURL(blob);
  try {
    return await detectImageSize(url);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const inferAssetKind = (file: File): AssetRecord['kind'] => {
  const lowerName = file.name.toLowerCase();
  if (file.type.startsWith('font/') || /\.(ttf|otf|woff2?)$/i.test(lowerName)) return 'font';
  return 'brandedAsset';
};

const revokeFileUrl = (node: ExplorerNode | undefined) => {
  if (node?.type === 'file') {
    if (node.url) URL.revokeObjectURL(node.url);
    if (node.src && node.src.startsWith('blob:') && node.src !== node.url) URL.revokeObjectURL(node.src);
  }
};

const collectNodeAndDescendantIds = (explorer: ExplorerState, id: string): string[] => {
  if (id === explorer.rootId) return [];
  const next = structuredClone(explorer);
  const doomed = new Set<string>();
  const walk = (nodeId: string) => {
    doomed.add(nodeId);
    const node = next.nodes.find((n) => n.id === nodeId);
    if (node?.type === 'folder') node.children.forEach(walk);
  };
  walk(id);
  return [...doomed];
};

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
  selectedIds: Record<ExplorerKind, string[]>;
  selectionAnchorId: Record<ExplorerKind, string | null>;
  addAsset: (asset: AssetItem, metadata: AssetRecord, targetFolderId: string, kind: ExplorerKind) => void;
  uploadFiles: (files: File[], targetFolderId: string, kind: ExplorerKind) => Promise<void>;
  addFolder: (name: string, parentId: string, kind: ExplorerKind) => void;
  renameNode: (id: string, name: string, kind: ExplorerKind) => void;
  deleteNode: (id: string, kind: ExplorerKind) => void;
  canMoveNode: (nodeId: string, targetFolderId: string, kind: ExplorerKind) => MoveCheck;
  canMoveFolder: (folderId: string, targetParentId: string | null, kind: ExplorerKind) => MoveCheck;
  moveNode: (nodeId: string, targetFolderId: string, kind: ExplorerKind) => boolean;
  moveNodesToFolder: (nodeIds: string[], targetFolderId: string | null, kind: ExplorerKind) => boolean;
  moveFolderToFolder: (folderId: string, targetParentId: string | null, kind: ExplorerKind) => boolean;
  moveNodes: (dragKind: AssetDragKind, nodeIds: string[], targetFolderId: string | null, kind: ExplorerKind) => boolean;
  moveFolder: (dragKind: AssetDragKind, folderId: string, targetParentId: string | null, kind: ExplorerKind) => boolean;
  toggleExpanded: (id: string, kind: ExplorerKind) => void;
  exportState: () => string;
  resetState: () => void;
  upsertTemplateAsset: (template: SavedTemplate) => void;
  removeTemplateAsset: (templateId: string) => void;
  hydrateBlobBackedAssets: (kind?: 'branded' | 'fonts') => Promise<void>;
  clearSelection: (kind: ExplorerKind) => void;
  setSelection: (kind: ExplorerKind, ids: string[], anchorId?: string | null) => void;
  toggleSelection: (kind: ExplorerKind, id: string) => void;
  rangeSelect: (kind: ExplorerKind, orderedVisibleIds: string[], clickedId: string) => void;
  moveSelectionToFolder: (kind: ExplorerKind, targetFolderId: string | null) => boolean;
}

const uniqueIds = (ids: string[]) => [...new Set(ids)];

const pruneNestedSelection = (explorer: ExplorerState, ids: string[]) => {
  const selected = new Set(ids);
  return ids.filter((id) => !ids.some((candidate) => candidate !== id && isDescendantFolder(explorer, candidate, id) && selected.has(candidate)));
};

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

const migrateLegacyBinaries = async (kind: 'branded' | 'fonts', entries: LegacyBlobCandidate[]) => {
  const storeName = getBlobStore(kind);
  await Promise.all(entries.map(async (entry) => {
    try {
      const blob = await dataUrlToBlob(toDataUrl(entry.data, entry.mime));
      await putBlob(storeName, entry.blobKey, blob);
    } catch (error) {
      console.warn(`Failed to migrate legacy ${kind} binary for key ${entry.blobKey}.`, error);
    }
  }));
};

const brandedLegacyCandidates: LegacyBlobCandidate[] = [];
const fontsLegacyCandidates: LegacyBlobCandidate[] = [];

const brandedExplorer = loadExplorer(STORAGE_KEYS.branded, INITIAL_BRANDED, 'asset', brandedLegacyCandidates);
const fontsExplorer = loadExplorer(STORAGE_KEYS.fonts, INITIAL_FONTS, 'font', fontsLegacyCandidates);
const templateExplorer = loadExplorer(STORAGE_KEYS.templates, INITIAL_TEMPLATES, 'template', []);

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: extractAssets(brandedExplorer, fontsExplorer, templateExplorer),
  brandedExplorer,
  fontsExplorer,
  templateExplorer,
  expandedBranded: { [brandedExplorer.rootId]: true },
  expandedFonts: { [fontsExplorer.rootId]: true },
  expandedTemplates: { [templateExplorer.rootId]: true },
  selectedIds: {
    branded: [],
    fonts: [],
    templates: [],
  },
  selectionAnchorId: {
    branded: null,
    fonts: null,
    templates: null,
  },
  addAsset: (asset, metadata, targetFolderId, kind) => {
    const key = getExplorerKey(kind);
    const next = structuredClone(get()[key]);
    const folder = next.nodes.find((n) => n.id === targetFolderId && n.type === 'folder');
    if (!folder || folder.type !== 'folder') return;

    folder.children.push(asset.id);
    next.nodes.push({
      id: asset.id,
      type: 'file',
      kind: kind === 'fonts' ? 'font' : kind === 'templates' ? 'template' : 'asset',
      assetKind: metadata.kind === 'font' ? 'font' : 'image',
      name: asset.name,
      parentId: targetFolderId,
      dimension: asset.dimension,
      createdAt: asset.createdAt,
      mime: metadata.mime,
      size: metadata.size,
      blobKey: metadata.id,
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
      const assetId = crypto.randomUUID();
      const blobStore = kind === 'fonts' ? 'fonts' : 'assets';

      try {
        await putBlob(blobStore, assetId, file);
      } catch (error) {
        console.error('Failed to persist uploaded file in IndexedDB.', error);
        continue;
      }

      const fileKind = inferAssetKind(file);
      const canPreview = fileKind === 'brandedAsset';
      const { width, height } = canPreview ? await detectImageSizeFromBlob(file) : { width: 0, height: 0 };
      const asset: AssetItem = {
        id: assetId,
        name: file.name,
        src: '',
        dimension: width && height ? `${width}x${height}` : 'unknown',
        createdAt: new Date().toISOString(),
      };
      const metadata: AssetRecord = {
        id: assetId,
        name: file.name,
        kind: fileKind,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        folderId: targetFolderId,
        createdAt: Date.now(),
      };
      get().addAsset(asset, metadata, targetFolderId, kind);
    }

    if (kind === 'branded' || kind === 'fonts') {
      await get().hydrateBlobBackedAssets(kind);
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
    const explorer = get()[getExplorerKey(kind)];
    const doomedIds = collectNodeAndDescendantIds(explorer, id);
    doomedIds
      .map((nodeId) => explorer.nodes.find((node) => node.id === nodeId))
      .forEach((node) => revokeFileUrl(node));

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

    if (kind !== 'templates') {
      doomedIds
        .map((nodeId) => explorer.nodes.find((node) => node.type === 'file' && node.id === nodeId))
        .filter((node): node is FileNode => Boolean(node))
        .forEach((node) => {
          const blobKey = node.blobKey || node.id;
          void deleteBlob(kind === 'fonts' ? 'fonts' : 'assets', blobKey).catch((error) => console.error('Failed to delete blob from IndexedDB.', error));
        });
    }
  },
  canMoveNode: (nodeId, targetFolderId, kind) => {
    const key = getExplorerKey(kind);
    return buildMoveCheck(get()[key], nodeId, targetFolderId);
  },
  canMoveFolder: (folderId, targetParentId, kind) => {
    const key = getExplorerKey(kind);
    const explorer = get()[key];
    const resolvedTargetParentId = targetParentId ?? explorer.rootId;
    return buildMoveCheck(explorer, folderId, resolvedTargetParentId);
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
  moveNodesToFolder: (nodeIds, targetFolderId, kind) => {
    const key = getExplorerKey(kind);
    const explorer = structuredClone(get()[key]);
    const selectedIds = pruneNestedSelection(explorer, uniqueIds(nodeIds));
    if (!selectedIds.length) return false;
    const resolvedTargetFolderId = targetFolderId ?? explorer.rootId;

    for (const id of selectedIds) {
      const check = buildMoveCheck(explorer, id, resolvedTargetFolderId);
      if (!check.ok) return false;
    }

    const targetFolder = explorer.nodes.find((node) => node.type === 'folder' && node.id === resolvedTargetFolderId);
    if (!targetFolder || targetFolder.type !== 'folder') return false;

    selectedIds.forEach((id) => {
      const node = explorer.nodes.find((entry) => entry.id === id);
      const previousParent = node?.parentId
        ? explorer.nodes.find((entry) => entry.type === 'folder' && entry.id === node.parentId)
        : undefined;
      if (!node || !previousParent || previousParent.type !== 'folder') return;
      previousParent.children = previousParent.children.filter((childId) => childId !== id);
      if (!targetFolder.children.includes(id)) targetFolder.children.push(id);
      node.parentId = resolvedTargetFolderId;
    });

    persist(kind, explorer);
    const patch = { [key]: explorer } as Partial<AssetStore>;
    set((state) => ({
      ...patch,
      assets: extractAssets(
        kind === 'branded' ? explorer : state.brandedExplorer,
        kind === 'fonts' ? explorer : state.fontsExplorer,
        kind === 'templates' ? explorer : state.templateExplorer,
      ),
      selectedIds: { ...state.selectedIds, [kind]: selectedIds },
      selectionAnchorId: { ...state.selectionAnchorId, [kind]: selectedIds[0] ?? null },
    }));
    return true;
  },
  moveFolderToFolder: (folderId, targetParentId, kind) => {
    const key = getExplorerKey(kind);
    const explorer = get()[key];
    const resolvedTargetParentId = targetParentId ?? explorer.rootId;
    return get().moveNode(folderId, resolvedTargetParentId, kind);
  },
  moveNodes: (dragKind, nodeIds, targetFolderId, kind) => {
    if (dragKind !== 'assets') return false;
    return get().moveNodesToFolder(nodeIds, targetFolderId, kind);
  },
  moveFolder: (dragKind, folderId, targetParentId, kind) => {
    if (dragKind !== 'assetFolders') return false;
    return get().moveFolderToFolder(folderId, targetParentId, kind);
  },
  clearSelection: (kind) => set((state) => ({
    selectedIds: { ...state.selectedIds, [kind]: [] },
    selectionAnchorId: { ...state.selectionAnchorId, [kind]: null },
  })),
  setSelection: (kind, ids, anchorId) => set((state) => ({
    selectedIds: { ...state.selectedIds, [kind]: uniqueIds(ids) },
    selectionAnchorId: { ...state.selectionAnchorId, [kind]: anchorId ?? ids[0] ?? null },
  })),
  toggleSelection: (kind, id) => set((state) => {
    const current = state.selectedIds[kind];
    const exists = current.includes(id);
    return {
      selectedIds: { ...state.selectedIds, [kind]: exists ? current.filter((entry) => entry !== id) : [...current, id] },
      selectionAnchorId: { ...state.selectionAnchorId, [kind]: id },
    };
  }),
  rangeSelect: (kind, orderedVisibleIds, clickedId) => set((state) => {
    const anchorId = state.selectionAnchorId[kind] ?? clickedId;
    const start = orderedVisibleIds.indexOf(anchorId);
    const end = orderedVisibleIds.indexOf(clickedId);
    if (start === -1 || end === -1) {
      return {
        selectedIds: { ...state.selectedIds, [kind]: [clickedId] },
        selectionAnchorId: { ...state.selectionAnchorId, [kind]: clickedId },
      };
    }
    const [from, to] = start < end ? [start, end] : [end, start];
    return {
      selectedIds: { ...state.selectedIds, [kind]: orderedVisibleIds.slice(from, to + 1) },
      selectionAnchorId: { ...state.selectionAnchorId, [kind]: anchorId },
    };
  }),
  moveSelectionToFolder: (kind, targetFolderId) => {
    return get().moveNodesToFolder(get().selectedIds[kind], targetFolderId, kind);
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
    [...get().brandedExplorer.nodes, ...get().fontsExplorer.nodes]
      .forEach((node) => revokeFileUrl(node));
    void clearStore('assets').catch((error) => console.error('Failed to clear asset blobs.', error));
    void clearStore('fonts').catch((error) => console.error('Failed to clear font blobs.', error));
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
  hydrateBlobBackedAssets: async (kind = 'branded') => {
    const key = getExplorerKey(kind);
    const explorer = get()[key];
    const files = explorer.nodes.filter((node): node is FileNode => node.type === 'file');
    if (!files.length) return;

    const updates = await Promise.all(files.map(async (fileNode) => {
      if (fileNode.url || fileNode.src) return null;
      const blob = await getBlob(kind === 'fonts' ? 'fonts' : 'assets', fileNode.blobKey || fileNode.id);
      if (!blob) return null;
      return {
        id: fileNode.id,
        url: URL.createObjectURL(blob),
      };
    }));

    const concreteUpdates = updates.filter((entry): entry is { id: string; url: string } => Boolean(entry));
    if (!concreteUpdates.length) return;

    const next = structuredClone(get()[key]);
    next.nodes = next.nodes.map((node) => {
      if (node.type !== 'file') return node;
      const match = concreteUpdates.find((entry) => entry.id === node.id);
      return match ? { ...node, url: match.url, src: match.url } : node;
    });

    set({
      [key]: next,
      assets: extractAssets(
        kind === 'branded' ? next : get().brandedExplorer,
        kind === 'fonts' ? next : get().fontsExplorer,
        get().templateExplorer,
      ),
    } as Partial<AssetStore>);
  },
}));

if (brandedLegacyCandidates.length) {
  void migrateLegacyBinaries('branded', brandedLegacyCandidates)
    .then(() => useAssetStore.getState().hydrateBlobBackedAssets('branded'))
    .catch((error) => console.warn('Legacy branded asset migration failed.', error));
  persist('branded', useAssetStore.getState().brandedExplorer);
} else {
  void useAssetStore.getState().hydrateBlobBackedAssets('branded');
}

if (fontsLegacyCandidates.length) {
  void migrateLegacyBinaries('fonts', fontsLegacyCandidates)
    .then(() => useAssetStore.getState().hydrateBlobBackedAssets('fonts'))
    .catch((error) => console.warn('Legacy font migration failed.', error));
  persist('fonts', useAssetStore.getState().fontsExplorer);
} else {
  void useAssetStore.getState().hydrateBlobBackedAssets('fonts');
}
