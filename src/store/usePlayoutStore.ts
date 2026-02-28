import { create } from 'zustand';
import type { SavedTemplate } from './useTemplateStore';
import type { BindingSchema, VortexBindingState } from '../features/playout/vortexBindings';
import { createInitialBindingValues, validateBindingValues } from '../features/playout/vortexBindings';

export type FontOverride = {
  enabled: boolean;
  fallbackFamily: string;
  timestamp: string;
};

interface PlayoutStore {
  vortexBindings: Record<string, VortexBindingState | undefined>;
  previewTemplate: SavedTemplate | null;
  programTemplate: SavedTemplate | null;
  lastTakeAt: string | null;
  fontOverrides: Record<string, FontOverride | undefined>;
  vortexBindingSchemas: Record<string, BindingSchema | undefined>;
  setPreviewTemplate: (template: SavedTemplate | null) => void;
  takeToProgram: () => void;
  clearProgram: () => void;
  setFontOverride: (templateId: string, override: FontOverride) => void;
  clearFontOverride: (templateId: string) => void;

  initializeBindings: (templateId: string, bindingsSchema: BindingSchema) => void;
  setBindingValue: (templateId: string, key: string, value: unknown) => void;
  validateBindings: (templateId: string) => void;
  clearBindings: (templateId: string) => void;
  setBindingFontGateSatisfied: (templateId: string, satisfied: boolean) => void;
  getBindingState: (templateId: string) => VortexBindingState | undefined;
  getBindingSchema: (templateId: string) => BindingSchema | undefined;
}

export const usePlayoutStore = create<PlayoutStore>((set, get) => ({
  previewTemplate: null,
  vortexBindings: {},
  programTemplate: null,
  lastTakeAt: null,
  fontOverrides: {},
  vortexBindingSchemas: {},
  setPreviewTemplate: (template) => set({ previewTemplate: template }),
  takeToProgram: () => {
    const preview = get().previewTemplate;
    const program = get().programTemplate;
    if (!preview) return;
    if (program?.id === preview.id) return;
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
  initializeBindings: (templateId, bindingsSchema) => {
    const existingBindingState = get().vortexBindings[templateId];
    const existingSchema = get().vortexBindingSchemas[templateId];
    if (existingBindingState && existingSchema) return;

    const values = createInitialBindingValues(bindingsSchema);
    const baseState: VortexBindingState = {
      templateId,
      values,
      validation: {
        isValid: true,
        missingRequired: [],
        errors: [],
      },
      readyToAir: false,
      fontGateSatisfied: false,
    };
    const validated = validateBindingValues(bindingsSchema, values, baseState.fontGateSatisfied);
    set((state) => ({
      vortexBindings: {
        ...state.vortexBindings,
        [templateId]: {
          ...baseState,
          ...validated,
        },
      },
      vortexBindingSchemas: {
        ...state.vortexBindingSchemas,
        [templateId]: bindingsSchema,
      },
    }));
  },
  setBindingValue: (templateId, key, value) => {
    const schema = get().vortexBindingSchemas[templateId];
    const bindingState = get().vortexBindings[templateId];
    if (!schema || !bindingState) return;
    const values = { ...bindingState.values, [key]: value };
    const validated = validateBindingValues(schema, values, bindingState.fontGateSatisfied);
    set((state) => ({
      vortexBindings: {
        ...state.vortexBindings,
        [templateId]: {
          ...bindingState,
          values,
          ...validated,
        },
      },
    }));
  },
  validateBindings: (templateId) => {
    const schema = get().vortexBindingSchemas[templateId];
    const bindingState = get().vortexBindings[templateId];
    if (!schema || !bindingState) return;
    const validated = validateBindingValues(schema, bindingState.values, bindingState.fontGateSatisfied);
    set((state) => ({
      vortexBindings: {
        ...state.vortexBindings,
        [templateId]: {
          ...bindingState,
          ...validated,
        },
      },
    }));
  },
  clearBindings: (templateId) => set((state) => {
    const { [templateId]: _removedBinding, ...vortexBindings } = state.vortexBindings;
    const { [templateId]: _removedSchema, ...vortexBindingSchemas } = state.vortexBindingSchemas;
    return { vortexBindings, vortexBindingSchemas };
  }),
  setBindingFontGateSatisfied: (templateId, satisfied) => {
    const schema = get().vortexBindingSchemas[templateId];
    const bindingState = get().vortexBindings[templateId];
    if (!schema || !bindingState) return;
    const validated = validateBindingValues(schema, bindingState.values, satisfied);
    set((state) => ({
      vortexBindings: {
        ...state.vortexBindings,
        [templateId]: {
          ...bindingState,
          fontGateSatisfied: satisfied,
          ...validated,
        },
      },
    }));
  },
  getBindingState: (templateId) => get().vortexBindings[templateId],
  getBindingSchema: (templateId) => get().vortexBindingSchemas[templateId],
}));
