import { create } from 'zustand';
import type { Layer } from '../types/domain';
import { getManifestFormat, type VortexPackage } from '../features/packages/loadVortexPackage';
import { revokeVortexAssetUrls } from '../features/packages/vortexAssetResolver';
import { clearVortexFontCache } from '../features/packages/vortexFontGate';
import { useAssetStore } from './useAssetStore';
import { usePlayoutStore } from './usePlayoutStore';

const STORAGE_KEY = 'renderless.savedDesignTemplates.v1';
const FAVORITES_STORAGE_KEY = 'renderless.templates.favorites.v1';
const QUICK_LAUNCH_STORAGE_KEY = 'renderless.templates.quickLaunch.v1';

type TemplateFolder = {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];
  childrenFolderIds: string[];
  childrenTemplateIds: string[];
  createdAt: string;
};

export type SavedTemplate = {
  id: string;
  name: string;
  folderId: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: Layer[];
  createdAt: string;
  updatedAt?: string;
};

export type TemplateListItem = {
  id: string;
  name: string;
  source: 'native' | 'vortex';
  formatId?: string;
  width?: number;
  height?: number;
  variantGroupId?: string;
  updatedAt?: string;
  previewUrl?: string;
};

type SelectedTemplate = {
  source: 'native' | 'vortex';
  id: string;
};

export type SelectedTemplateRef = SelectedTemplate;

type PersistedTemplateState = {
  rootId: string;
  folders: TemplateFolder[];
  templates: SavedTemplate[];
};

const defaultState = (): PersistedTemplateState => ({
  rootId: 'template-root',
  folders: [{ id: 'template-root', name: 'Templates', parentId: null, children: [], childrenFolderIds: [], childrenTemplateIds: [], createdAt: new Date().toISOString() }],
  templates: [],
});

const normalizeState = (state: PersistedTemplateState): PersistedTemplateState => {
  const folderById = new Map<string, TemplateFolder>();
  const folders = state.folders.map((folder) => {
    const childrenFolderIds = Array.isArray(folder.childrenFolderIds)
      ? [...folder.childrenFolderIds]
      : Array.isArray(folder.children)
        ? [...folder.children]
        : [];
    const normalized: TemplateFolder = {
      ...folder,
      parentId: folder.parentId ?? null,
      children: [...childrenFolderIds],
      childrenFolderIds,
      childrenTemplateIds: Array.isArray(folder.childrenTemplateIds) ? [...folder.childrenTemplateIds] : [],
      createdAt: folder.createdAt ?? new Date().toISOString(),
    };
    folderById.set(folder.id, normalized);
    return normalized;
  });

  const templates = state.templates.map((template) => ({
    ...template,
    folderId: template.folderId || state.rootId,
  }));

  folders.forEach((folder) => {
    folder.childrenFolderIds = folder.childrenFolderIds.filter((childId) => folderById.has(childId));
    folder.children = [...folder.childrenFolderIds];
  });

  const root = folderById.get(state.rootId);
  if (!root) {
    return defaultState();
  }

  const childrenByParent = new Map<string, string[]>();
  folders.forEach((folder) => {
    if (!folder.parentId || !folderById.has(folder.parentId) || folder.id === state.rootId) return;
    const list = childrenByParent.get(folder.parentId) ?? [];
    if (!list.includes(folder.id)) list.push(folder.id);
    childrenByParent.set(folder.parentId, list);
  });
  childrenByParent.forEach((childIds, parentId) => {
    const parent = folderById.get(parentId);
    if (!parent) return;
    const merged = [...parent.childrenFolderIds.filter((id) => childIds.includes(id)), ...childIds.filter((id) => !parent.childrenFolderIds.includes(id))];
    parent.childrenFolderIds = merged;
    parent.children = [...merged];
  });

  const templatesByFolder = new Map<string, string[]>();
  templates.forEach((template) => {
    const folderId = folderById.has(template.folderId) ? template.folderId : state.rootId;
    template.folderId = folderId;
    const list = templatesByFolder.get(folderId) ?? [];
    if (!list.includes(template.id)) list.push(template.id);
    templatesByFolder.set(folderId, list);
  });
  folders.forEach((folder) => {
    const existing = folder.childrenTemplateIds.filter((templateId) => templates.some((template) => template.id === templateId && template.folderId === folder.id));
    const required = templatesByFolder.get(folder.id) ?? [];
    folder.childrenTemplateIds = [...existing, ...required.filter((id) => !existing.includes(id))];
  });

  return {
    rootId: state.rootId,
    folders,
    templates,
  };
};

const load = (): PersistedTemplateState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as PersistedTemplateState;
    if (!parsed?.rootId || !Array.isArray(parsed.folders) || !Array.isArray(parsed.templates)) return defaultState();
    return normalizeState(parsed);
  } catch {
    return defaultState();
  }
};

const persist = (state: PersistedTemplateState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const uniqueIds = (ids: string[]) => [...new Set(ids)];

interface TemplateStore extends PersistedTemplateState {
  favoriteTemplateIds: string[];
  quickLaunchTemplateIds: string[];
  expanded: Record<string, boolean>;
  vortexPackages: Record<string, VortexPackage>;
  vortexPreviewUrls: Record<string, string | undefined>;
  selectedTemplate: SelectedTemplate | null;
  selectedIds: string[];
  selectionAnchorId: string | null;
  addFolder: (name: string, parentId: string) => void;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  toggleExpanded: (folderId: string) => void;
  saveTemplate: (input: { name: string; folderId: string; canvasWidth: number; canvasHeight: number; layers: Layer[] }) => string | null;
  updateTemplate: (templateId: string, input: { name: string; folderId: string; canvasWidth: number; canvasHeight: number; layers: Layer[] }) => void;
  deleteTemplate: (templateId: string) => void;
  getTemplatesInFolder: (folderId: string) => SavedTemplate[];
  getTemplateById: (templateId: string) => SavedTemplate | undefined;
  getFolderById: (folderId: string) => TemplateFolder | undefined;
  getRootFolder: () => TemplateFolder;
  registerVortexPackage: (pkg: VortexPackage) => void;
  removeVortexPackage: (templateId: string) => void;
  getVortexPackage: (templateId: string) => VortexPackage | undefined;
  listAllTemplates: () => TemplateListItem[];
  selectTemplate: (selection: SelectedTemplate) => void;
  clearSelection: () => void;
  setSelection: (ids: string[], anchorId?: string | null) => void;
  toggleSelection: (id: string) => void;
  rangeSelect: (orderedVisibleIds: string[], clickedId: string) => void;
  moveSelectionToFolder: (targetFolderId: string | null) => boolean;
  moveTemplates: (templateIds: string[], targetFolderId: string | null) => void;
  moveTemplatesToFolder: (templateIds: string[], targetFolderId: string | null) => void;
  moveFolder: (folderId: string, targetParentId: string | null) => void;
  moveFolderToFolder: (folderId: string, targetParentId: string | null) => void;
  canMoveFolder: (folderId: string, targetParentId: string | null) => { ok: boolean; reason?: string };
  isDescendantFolder: (ancestorId: string, possibleDescendantId: string) => boolean;
  reorderWithinFolder: (params: { folderId: string; templateIds?: string[]; folderIds?: string[] }) => void;
  toggleFavoriteTemplate: (templateId: string) => void;
  isTemplateFavorited: (templateId: string) => boolean;
  toggleQuickLaunchTemplate: (templateId: string) => void;
  removeQuickLaunchTemplate: (templateId: string) => void;
  seedQuickLaunchTemplates: (templateIds: string[]) => void;
  isTemplateQuickLaunch: (templateId: string) => boolean;
}

const initial = load();

const loadIdList = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
};

const persistIdList = (key: string, ids: string[]) => {
  localStorage.setItem(key, JSON.stringify(uniqueIds(ids)));
};

const removeUnknownTemplateIds = (ids: string[], templates: SavedTemplate[]) => {
  const templateIdSet = new Set(templates.map((template) => template.id));
  return uniqueIds(ids).filter((id) => templateIdSet.has(id));
};

const initialFavoriteTemplateIds = removeUnknownTemplateIds(loadIdList(FAVORITES_STORAGE_KEY), initial.templates);
const initialQuickLaunchTemplateIds = removeUnknownTemplateIds(loadIdList(QUICK_LAUNCH_STORAGE_KEY), initial.templates);

persistIdList(FAVORITES_STORAGE_KEY, initialFavoriteTemplateIds);
persistIdList(QUICK_LAUNCH_STORAGE_KEY, initialQuickLaunchTemplateIds);

const resolveFolderId = (rootId: string, folderId: string | null) => folderId ?? rootId;

const syncLegacyChildren = (folders: TemplateFolder[]) => folders.map((folder) => ({ ...folder, children: [...folder.childrenFolderIds] }));

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  ...initial,
  favoriteTemplateIds: initialFavoriteTemplateIds,
  quickLaunchTemplateIds: initialQuickLaunchTemplateIds,
  expanded: { [initial.rootId]: true },
  vortexPackages: {},
  vortexPreviewUrls: {},
  selectedTemplate: null,
  selectedIds: [],
  selectionAnchorId: null,
  addFolder: (name, parentId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const folders = structuredClone(get().folders);
    const parent = folders.find((f) => f.id === parentId);
    if (!parent) return;
    const id = `tpl-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    parent.childrenFolderIds.push(id);
    parent.children = [...parent.childrenFolderIds];
    folders.push({ id, name: trimmed, parentId, children: [], childrenFolderIds: [], childrenTemplateIds: [], createdAt: new Date().toISOString() });
    const next = { rootId: get().rootId, folders: syncLegacyChildren(folders), templates: get().templates };
    persist(next);
    set({ folders: syncLegacyChildren(folders) });
  },
  renameFolder: (folderId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const folders = structuredClone(get().folders);
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    folder.name = trimmed;
    const next = { rootId: get().rootId, folders: syncLegacyChildren(folders), templates: get().templates };
    persist(next);
    set({ folders: syncLegacyChildren(folders) });
  },
  deleteFolder: (folderId) => {
    if (folderId === get().rootId) return;
    const doomed = new Set<string>();
    const folders = structuredClone(get().folders);
    const templates = structuredClone(get().templates);
    const walk = (id: string) => {
      doomed.add(id);
      const folder = folders.find((f) => f.id === id);
      if (!folder) return;
      folder.childrenFolderIds.forEach(walk);
    };
    walk(folderId);
    const nextFolders = syncLegacyChildren(folders
      .filter((f) => !doomed.has(f.id))
      .map((f) => ({
        ...f,
        childrenFolderIds: f.childrenFolderIds.filter((c) => !doomed.has(c)),
        childrenTemplateIds: f.childrenTemplateIds.filter((templateId) => templates.some((template) => template.id === templateId && !doomed.has(template.folderId))),
      })));
    const nextTemplates = templates.filter((t) => !doomed.has(t.folderId));
    const nextFavoriteTemplateIds = removeUnknownTemplateIds(get().favoriteTemplateIds, nextTemplates);
    const nextQuickLaunchTemplateIds = removeUnknownTemplateIds(get().quickLaunchTemplateIds, nextTemplates);
    const next = { rootId: get().rootId, folders: nextFolders, templates: nextTemplates };
    persist(next);
    persistIdList(FAVORITES_STORAGE_KEY, nextFavoriteTemplateIds);
    persistIdList(QUICK_LAUNCH_STORAGE_KEY, nextQuickLaunchTemplateIds);
    set({
      folders: nextFolders,
      templates: nextTemplates,
      favoriteTemplateIds: nextFavoriteTemplateIds,
      quickLaunchTemplateIds: nextQuickLaunchTemplateIds,
    });
  },
  toggleExpanded: (folderId) => set((s) => ({ expanded: { ...s.expanded, [folderId]: !s.expanded[folderId] } })),
  saveTemplate: ({ name, folderId, canvasWidth, canvasHeight, layers }) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id = `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const template: SavedTemplate = {
      id,
      name: trimmed,
      folderId,
      canvasWidth,
      canvasHeight,
      layers: structuredClone(layers),
      createdAt: new Date().toISOString(),
    };
    const targetFolderId = resolveFolderId(get().rootId, folderId);
    const templateWithFolder = { ...template, folderId: targetFolderId };
    const templates = [templateWithFolder, ...get().templates];
    const folders = structuredClone(get().folders);
    const folder = folders.find((entry) => entry.id === targetFolderId);
    if (folder && !folder.childrenTemplateIds.includes(id)) {
      folder.childrenTemplateIds.push(id);
    }
    const next = { rootId: get().rootId, folders: syncLegacyChildren(folders), templates };
    persist(next);
    set({ templates, folders: syncLegacyChildren(folders) });
    useAssetStore.getState().upsertTemplateAsset(templateWithFolder);
    return id;
  },
  updateTemplate: (templateId, { name, folderId, canvasWidth, canvasHeight, layers }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    let updatedTemplate: SavedTemplate | null = null;
    const targetFolderId = resolveFolderId(get().rootId, folderId);
    const templates = get().templates.map((template) => (
      template.id === templateId
        ? (() => {
          updatedTemplate = { ...template, name: trimmed, folderId: targetFolderId, canvasWidth, canvasHeight, layers: structuredClone(layers), updatedAt: new Date().toISOString() };
          return updatedTemplate;
        })()
        : template
    ));
    const folders = structuredClone(get().folders).map((folder) => ({
      ...folder,
      childrenTemplateIds: folder.childrenTemplateIds.filter((id) => id !== templateId),
    }));
    const nextFolder = folders.find((folder) => folder.id === targetFolderId);
    if (nextFolder && !nextFolder.childrenTemplateIds.includes(templateId)) {
      nextFolder.childrenTemplateIds.push(templateId);
    }
    const next = { rootId: get().rootId, folders: syncLegacyChildren(folders), templates };
    persist(next);
    set({ templates, folders: syncLegacyChildren(folders) });
    if (updatedTemplate) useAssetStore.getState().upsertTemplateAsset(updatedTemplate);
  },
  deleteTemplate: (templateId) => {
    const templates = get().templates.filter((template) => template.id !== templateId);
    const folders = structuredClone(get().folders).map((folder) => ({
      ...folder,
      childrenTemplateIds: folder.childrenTemplateIds.filter((id) => id !== templateId),
    }));
    const next = { rootId: get().rootId, folders: syncLegacyChildren(folders), templates };
    const nextFavoriteTemplateIds = get().favoriteTemplateIds.filter((id) => id !== templateId);
    const nextQuickLaunchTemplateIds = get().quickLaunchTemplateIds.filter((id) => id !== templateId);
    persist(next);
    persistIdList(FAVORITES_STORAGE_KEY, nextFavoriteTemplateIds);
    persistIdList(QUICK_LAUNCH_STORAGE_KEY, nextQuickLaunchTemplateIds);
    set({
      templates,
      folders: syncLegacyChildren(folders),
      favoriteTemplateIds: nextFavoriteTemplateIds,
      quickLaunchTemplateIds: nextQuickLaunchTemplateIds,
    });
    useAssetStore.getState().removeTemplateAsset(templateId);
  },
  getTemplatesInFolder: (folderId) => {
    const folder = get().folders.find((entry) => entry.id === folderId);
    if (!folder) return [];
    const templateById = new Map(get().templates.map((template) => [template.id, template]));
    return folder.childrenTemplateIds
      .map((templateId) => templateById.get(templateId))
      .filter((template): template is SavedTemplate => Boolean(template));
  },
  getTemplateById: (templateId) => get().templates.find((t) => t.id === templateId),
  getFolderById: (folderId) => get().folders.find((f) => f.id === folderId),
  getRootFolder: () => get().folders.find((f) => f.id === get().rootId) || get().folders[0],
  registerVortexPackage: (pkg) => {
    const templateId = pkg.manifest.templateId;
    revokeVortexAssetUrls(templateId);
    clearVortexFontCache(templateId);
    const previewBlob = pkg.files.previews['previews/poster.png'];
    const previewUrl = previewBlob ? URL.createObjectURL(previewBlob) : undefined;
    const previousPreview = get().vortexPreviewUrls[templateId];
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
    }
    set((state) => ({
      vortexPackages: { ...state.vortexPackages, [templateId]: pkg },
      vortexPreviewUrls: { ...state.vortexPreviewUrls, [templateId]: previewUrl },
    }));
  },
  removeVortexPackage: (templateId) => {
    const state = get();
    revokeVortexAssetUrls(templateId);
    clearVortexFontCache(templateId);
    const previewUrl = state.vortexPreviewUrls[templateId];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const { [templateId]: _removedPackage, ...vortexPackages } = state.vortexPackages;
    const { [templateId]: _removedPreview, ...vortexPreviewUrls } = state.vortexPreviewUrls;
    usePlayoutStore.getState().clearBindings(templateId);
    set({
      vortexPackages,
      vortexPreviewUrls,
      selectedTemplate: state.selectedTemplate?.id === templateId && state.selectedTemplate.source === 'vortex'
        ? null
        : state.selectedTemplate,
    });
  },
  getVortexPackage: (templateId) => get().vortexPackages[templateId],
  listAllTemplates: () => {
    const state = get();
    const nativeTemplates: TemplateListItem[] = state.templates.map((template) => ({
      id: template.id,
      name: template.name,
      source: 'native',
      width: template.canvasWidth,
      height: template.canvasHeight,
      updatedAt: template.updatedAt ?? template.createdAt,
    }));
    const vortexTemplates: TemplateListItem[] = Object.values(state.vortexPackages).map((pkg) => ({
      ...(() => {
        const format = getManifestFormat(pkg.manifest);
        return {
          formatId: format.formatId,
          width: format.width,
          height: format.height,
        };
      })(),
      id: pkg.manifest.templateId,
      name: pkg.manifest.templateName,
      source: 'vortex',
      variantGroupId: typeof pkg.manifest.variantGroupId === 'string' ? pkg.manifest.variantGroupId : undefined,
      updatedAt: typeof pkg.manifest.updatedAt === 'string' ? pkg.manifest.updatedAt : undefined,
      previewUrl: state.vortexPreviewUrls[pkg.manifest.templateId],
    }));
    return [...nativeTemplates, ...vortexTemplates];
  },
  clearSelection: () => set({ selectedIds: [], selectionAnchorId: null }),
  setSelection: (ids, anchorId) => set({ selectedIds: uniqueIds(ids), selectionAnchorId: anchorId ?? ids[0] ?? null }),
  toggleSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter((entry) => entry !== id)
      : [...state.selectedIds, id],
    selectionAnchorId: id,
  })),
  rangeSelect: (orderedVisibleIds, clickedId) => set((state) => {
    const anchorId = state.selectionAnchorId ?? clickedId;
    const start = orderedVisibleIds.indexOf(anchorId);
    const end = orderedVisibleIds.indexOf(clickedId);
    if (start === -1 || end === -1) {
      return { selectedIds: [clickedId], selectionAnchorId: clickedId };
    }
    const [from, to] = start < end ? [start, end] : [end, start];
    return {
      selectedIds: orderedVisibleIds.slice(from, to + 1),
      selectionAnchorId: anchorId,
    };
  }),
  moveSelectionToFolder: (targetFolderId) => {
    const selectedIds = uniqueIds(get().selectedIds).filter((id) => get().templates.some((template) => template.id === id));
    if (!selectedIds.length) return false;
    get().moveTemplates(selectedIds, targetFolderId);
    set({ selectedIds, selectionAnchorId: selectedIds[0] ?? null });
    return true;
  },
  moveTemplates: (templateIds, targetFolderId) => {
    const selectedIds = uniqueIds(templateIds);
    if (!selectedIds.length) return;
    const resolvedTargetId = resolveFolderId(get().rootId, targetFolderId);
    const folders = structuredClone(get().folders);
    const targetFolder = folders.find((folder) => folder.id === resolvedTargetId);
    if (!targetFolder) return;
    const now = new Date().toISOString();
    const templates = get().templates.map((template) => (
      selectedIds.includes(template.id)
        ? { ...template, folderId: resolvedTargetId, updatedAt: now }
        : template
    ));
    folders.forEach((folder) => {
      folder.childrenTemplateIds = folder.childrenTemplateIds.filter((id) => !selectedIds.includes(id));
    });
    selectedIds.forEach((id) => {
      if (!targetFolder.childrenTemplateIds.includes(id)) targetFolder.childrenTemplateIds.push(id);
    });
    const syncedFolders = syncLegacyChildren(folders);
    const next = { rootId: get().rootId, folders: syncedFolders, templates };
    persist(next);
    set({ templates, folders: syncedFolders });
    templates.filter((template) => selectedIds.includes(template.id)).forEach((template) => useAssetStore.getState().upsertTemplateAsset(template));
  },

  moveTemplatesToFolder: (templateIds, targetFolderId) => {
    get().moveTemplates(templateIds, targetFolderId);
  },
  isDescendantFolder: (ancestorId, possibleDescendantId) => {
    const folderById = new Map(get().folders.map((folder) => [folder.id, folder]));
    const stack = [...(folderById.get(ancestorId)?.childrenFolderIds ?? [])];
    while (stack.length) {
      const nextId = stack.pop();
      if (!nextId) continue;
      if (nextId === possibleDescendantId) return true;
      const folder = folderById.get(nextId);
      if (folder) stack.push(...folder.childrenFolderIds);
    }
    return false;
  },
  canMoveFolder: (folderId, targetParentId) => {
    const rootId = get().rootId;
    const resolvedTargetParentId = resolveFolderId(rootId, targetParentId);
    const folder = get().folders.find((entry) => entry.id === folderId);
    const target = get().folders.find((entry) => entry.id === resolvedTargetParentId);
    if (!folder || !target) return { ok: false, reason: 'Folder not found' };
    if (folder.id === rootId) return { ok: false, reason: 'Cannot move root folder' };
    if (folder.id === resolvedTargetParentId) return { ok: false, reason: 'Cannot move folder into itself' };
    if (get().isDescendantFolder(folder.id, resolvedTargetParentId)) return { ok: false, reason: 'Cannot move folder into descendant' };
    if (folder.parentId === resolvedTargetParentId) return { ok: false, reason: 'Folder already in target parent' };
    return { ok: true };
  },
  moveFolder: (folderId, targetParentId) => {
    const rootId = get().rootId;
    const resolvedTargetParentId = resolveFolderId(rootId, targetParentId);
    const guard = get().canMoveFolder(folderId, resolvedTargetParentId);
    if (!guard.ok) return;
    const folders = structuredClone(get().folders);
    const folder = folders.find((entry) => entry.id === folderId);
    if (!folder) return;
    const prevParent = folders.find((entry) => entry.id === folder.parentId);
    if (prevParent) {
      prevParent.childrenFolderIds = prevParent.childrenFolderIds.filter((id) => id !== folderId);
    }
    const target = folders.find((entry) => entry.id === resolvedTargetParentId);
    if (!target) return;
    if (!target.childrenFolderIds.includes(folderId)) {
      target.childrenFolderIds.push(folderId);
    }
    folder.parentId = resolvedTargetParentId;
    const syncedFolders = syncLegacyChildren(folders);
    const next = { rootId, folders: syncedFolders, templates: get().templates };
    persist(next);
    set({ folders: syncedFolders });
  },

  moveFolderToFolder: (folderId, targetParentId) => {
    get().moveFolder(folderId, targetParentId);
  },
  reorderWithinFolder: ({ folderId, templateIds, folderIds }) => {
    const folders = structuredClone(get().folders);
    const folder = folders.find((entry) => entry.id === folderId);
    if (!folder) return;
    if (templateIds) folder.childrenTemplateIds = uniqueIds(templateIds);
    if (folderIds) folder.childrenFolderIds = uniqueIds(folderIds);
    const syncedFolders = syncLegacyChildren(folders);
    const next = { rootId: get().rootId, folders: syncedFolders, templates: get().templates };
    persist(next);
    set({ folders: syncedFolders });
  },
  toggleFavoriteTemplate: (templateId) => set((state) => {
    const favoriteTemplateIds = state.favoriteTemplateIds.includes(templateId)
      ? state.favoriteTemplateIds.filter((id) => id !== templateId)
      : [...state.favoriteTemplateIds, templateId];
    persistIdList(FAVORITES_STORAGE_KEY, favoriteTemplateIds);
    return { favoriteTemplateIds };
  }),
  isTemplateFavorited: (templateId) => get().favoriteTemplateIds.includes(templateId),
  toggleQuickLaunchTemplate: (templateId) => set((state) => {
    const quickLaunchTemplateIds = state.quickLaunchTemplateIds.includes(templateId)
      ? state.quickLaunchTemplateIds.filter((id) => id !== templateId)
      : [...state.quickLaunchTemplateIds, templateId];
    persistIdList(QUICK_LAUNCH_STORAGE_KEY, quickLaunchTemplateIds);
    return { quickLaunchTemplateIds };
  }),
  removeQuickLaunchTemplate: (templateId) => set((state) => {
    const quickLaunchTemplateIds = state.quickLaunchTemplateIds.filter((id) => id !== templateId);
    persistIdList(QUICK_LAUNCH_STORAGE_KEY, quickLaunchTemplateIds);
    return { quickLaunchTemplateIds };
  }),
  seedQuickLaunchTemplates: (templateIds) => set((state) => {
    if (state.quickLaunchTemplateIds.length > 0) return {};
    const availableTemplateIds = new Set(state.templates.map((template) => template.id));
    const quickLaunchTemplateIds = uniqueIds(templateIds).filter((id) => availableTemplateIds.has(id));
    persistIdList(QUICK_LAUNCH_STORAGE_KEY, quickLaunchTemplateIds);
    return { quickLaunchTemplateIds };
  }),
  isTemplateQuickLaunch: (templateId) => get().quickLaunchTemplateIds.includes(templateId),
  selectTemplate: (selection) => set({ selectedTemplate: selection }),
}));
