import { create } from 'zustand';
import type { SavedTemplate } from './useTemplateStore';

export type FontOverride = {
  enabled: boolean;
  fallbackFamily: string;
  timestamp: string;
};

interface PlayoutStore {
  previewTemplate: SavedTemplate | null;
  programTemplate: SavedTemplate | null;
  lastTakeAt: string | null;
  fontOverrides: Record<string, FontOverride | undefined>;
  setPreviewTemplate: (template: SavedTemplate | null) => void;
  takeToProgram: () => void;
  clearProgram: () => void;
  setFontOverride: (templateId: string, override: FontOverride) => void;
  clearFontOverride: (templateId: string) => void;
}

export const usePlayoutStore = create<PlayoutStore>((set, get) => ({
  previewTemplate: null,
  programTemplate: null,
  lastTakeAt: null,
  fontOverrides: {},
  setPreviewTemplate: (template) => set({ previewTemplate: template }),
  takeToProgram: () => {
    const preview = get().previewTemplate;
    if (!preview) return;
    set({
      programTemplate: preview,
      lastTakeAt: new Date().toISOString(),
    });
  },
  clearProgram: () => set({ programTemplate: null }),
  setFontOverride: (templateId, override) => set((state) => ({
    fontOverrides: { ...state.fontOverrides, [templateId]: override },
  })),
  clearFontOverride: (templateId) => set((state) => {
    const { [templateId]: _removed, ...rest } = state.fontOverrides;
    return { fontOverrides: rest };
  }),
}));
