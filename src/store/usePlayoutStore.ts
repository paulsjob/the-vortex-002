import { create } from 'zustand';
import type { SavedTemplate } from './useTemplateStore';
import type { BindingSchema, VortexBindingState } from '../features/playout/vortexBindings';
import { createInitialBindingValues, validateBindingValues } from '../features/playout/vortexBindings';

export type FontOverride = {
  enabled: boolean;
  fallbackFamily: string;
  timestamp: string;
};

export type TransitionType = 'cut' | 'fade' | 'ftb' | 'luma';

export type TemplateSnapshot = {
  templateId: string;
  revision: number;
  capturedAt: string;
  sceneDefinition: Pick<SavedTemplate, 'id' | 'name' | 'canvasWidth' | 'canvasHeight' | 'layers'>;
};

const deepClone = <T>(value: T): T => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const deepFreeze = <T>(value: T): T => {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);
  Object.values(value).forEach((entry) => {
    if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) {
      deepFreeze(entry);
    }
  });
  return value;
};

const createImmutableTemplate = (template: SavedTemplate): SavedTemplate => {
  const cloned = deepClone(template);
  if (import.meta.env.DEV) {
    return deepFreeze(cloned);
  }
  return cloned;
};

const createSceneDefinition = (template: SavedTemplate): TemplateSnapshot['sceneDefinition'] => {
  const sceneDefinition = {
    id: template.id,
    name: template.name,
    canvasWidth: template.canvasWidth,
    canvasHeight: template.canvasHeight,
    layers: deepClone(template.layers),
  };
  if (import.meta.env.DEV) {
    return deepFreeze(sceneDefinition);
  }
  return sceneDefinition;
};

export const createTemplateSnapshot = (template: SavedTemplate, revision = 1): TemplateSnapshot => ({
  templateId: template.id,
  revision,
  capturedAt: new Date().toISOString(),
  sceneDefinition: createSceneDefinition(template),
});

interface PlayoutStore {
  vortexBindings: Record<string, VortexBindingState | undefined>;
  previewSnapshot: TemplateSnapshot | null;
  programSnapshot: TemplateSnapshot | null;
  previewTemplate: SavedTemplate | null;
  programTemplate: SavedTemplate | null;
  previewSponsor: string | null;
  programSponsor: string | null;
  previewRevision: number;
  programRevision: number;
  outputRevision: number;
  transitionType: TransitionType;
  transitionDurationMs: number;
  lastTakeAt: string | null;
  fontOverrides: Record<string, FontOverride | undefined>;
  vortexBindingSchemas: Record<string, BindingSchema | undefined>;
  setPreviewTemplate: (template: SavedTemplate | null) => void;
  setPreviewSnapshot: (snapshot: TemplateSnapshot | null) => void;
  setProgramSnapshot: (snapshot: TemplateSnapshot | null) => void;
  setPreviewSponsor: (sponsor: string | null) => void;
  setTransitionType: (type: TransitionType) => void;
  setTransitionDurationMs: (ms: number) => void;
  takeToProgram: () => void;
  clearProgram: () => void;
  activateProgramTemplate: (template: SavedTemplate | null) => void;
  resetPlayoutState: () => void;
  setFontOverride: (templateId: string, override: FontOverride) => void;
  clearFontOverride: (templateId: string) => void;

  initializeBindings: (templateId: string, bindingsSchema: BindingSchema, options?: { force?: boolean }) => void;
  setBindingValue: (templateId: string, key: string, value: unknown) => void;
  setBindingValues: (templateId: string, values: Record<string, unknown>) => void;
  validateBindings: (templateId: string) => void;
  clearBindings: (templateId: string) => void;
  setBindingFontGateSatisfied: (templateId: string, satisfied: boolean) => void;
  getBindingState: (templateId: string) => VortexBindingState | undefined;
  getBindingSchema: (templateId: string) => BindingSchema | undefined;
}

const cloneTemplate = (template: SavedTemplate): SavedTemplate => deepClone(template);

const templatesMatch = (left: SavedTemplate | null, right: SavedTemplate | null): boolean => {
  if (!left || !right) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
};

export const usePlayoutStore = create<PlayoutStore>((set, get) => ({
  previewSponsor: 'Renderless Sports',
  programSponsor: null,
  transitionType: 'cut',
  transitionDurationMs: 300,
  previewRevision: 0,
  programRevision: 0,
  outputRevision: 0,
  previewTemplate: null,
  previewSnapshot: null,
  vortexBindings: {},
  programTemplate: null,
  programSnapshot: null,
  lastTakeAt: null,
  fontOverrides: {},
  vortexBindingSchemas: {},
  setPreviewTemplate: (template) => {
    if (!template) {
      set((state) => ({
        previewTemplate: null,
        previewSnapshot: null,
        previewRevision: state.previewRevision + 1,
      }));
      return;
    }
    const state = get();
    const nextRevision = state.previewRevision + 1;
    const snapshot = createTemplateSnapshot(template, nextRevision);
    set({
      previewSnapshot: snapshot,
      previewTemplate: cloneTemplate(createImmutableTemplate(template)),
      previewRevision: nextRevision,
    });
  },
  setPreviewSnapshot: (snapshot) => {
    if (!snapshot) {
      set((state) => ({
        previewSnapshot: null,
        previewTemplate: null,
        previewRevision: state.previewRevision + 1,
      }));
      return;
    }
    const state = get();
    const nextRevision = state.previewRevision + 1;
    const existing = state.previewTemplate;
    const immutableTemplate = existing && existing.id === snapshot.templateId
      ? createImmutableTemplate(existing)
      : null;
    set({
      previewSnapshot: {
        ...snapshot,
        revision: nextRevision,
      },
      previewTemplate: immutableTemplate ? cloneTemplate(immutableTemplate) : state.previewTemplate,
      previewRevision: nextRevision,
    });
  },
  setProgramSnapshot: (snapshot) => {
    if (!snapshot) {
      set((state) => ({
        programSnapshot: null,
        programTemplate: null,
        programSponsor: null,
        programRevision: state.programRevision + 1,
        outputRevision: state.outputRevision + 1,
      }));
      return;
    }
    const state = get();
    const nextRevision = state.programRevision + 1;
    const currentProgram = state.programTemplate;
    const immutableTemplate = currentProgram && currentProgram.id === snapshot.templateId
      ? createImmutableTemplate(currentProgram)
      : null;
    set({
      programSnapshot: {
        ...snapshot,
        revision: nextRevision,
      },
      programTemplate: immutableTemplate ? cloneTemplate(immutableTemplate) : state.programTemplate,
      lastTakeAt: snapshot.capturedAt,
      programRevision: nextRevision,
      outputRevision: state.outputRevision + 1,
    });
  },
  setPreviewSponsor: (sponsor) => set({ previewSponsor: sponsor }),
  setTransitionType: (type) => set({ transitionType: type }),
  setTransitionDurationMs: (ms) => set({ transitionDurationMs: ms }),
  takeToProgram: () => {
    const preview = get().previewTemplate;
    const state = get();
    const program = state.programTemplate;
    const previewSponsor = get().previewSponsor;
    if (!preview) return;
    if (templatesMatch(program, preview) && get().programSponsor === previewSponsor) return;
    const nextRevision = state.programRevision + 1;
    const snapshot = createTemplateSnapshot(preview, nextRevision);
    set({
      programSnapshot: snapshot,
      programTemplate: cloneTemplate(createImmutableTemplate(preview)),
      programSponsor: previewSponsor,
      lastTakeAt: snapshot.capturedAt,
      programRevision: nextRevision,
      outputRevision: state.outputRevision + 1,
    });
  },
  clearProgram: () => set((state) => ({
    programTemplate: null,
    programSnapshot: null,
    programSponsor: null,
    programRevision: state.programRevision + 1,
    outputRevision: state.outputRevision + 1,
  })),
  activateProgramTemplate: (template) => set((state) => {
    if (!template) return state;
    const nextProgram = cloneTemplate(template);
    if (templatesMatch(state.programTemplate, nextProgram)) return state;
    const nextRevision = state.programRevision + 1;
    const snapshot = createTemplateSnapshot(nextProgram, nextRevision);
    return {
      programSnapshot: snapshot,
      programTemplate: cloneTemplate(createImmutableTemplate(nextProgram)),
      lastTakeAt: snapshot.capturedAt,
      programRevision: nextRevision,
      outputRevision: state.outputRevision + 1,
    };
  }),
  resetPlayoutState: () => set({
    previewTemplate: null,
    previewSnapshot: null,
    programTemplate: null,
    programSnapshot: null,
    previewRevision: 0,
    programRevision: 0,
    outputRevision: 0,
    previewSponsor: 'Renderless Sports',
    programSponsor: null,
    transitionType: 'cut',
    transitionDurationMs: 300,
    lastTakeAt: null,
    vortexBindings: {},
    vortexBindingSchemas: {},
    fontOverrides: {},
  }),
  setFontOverride: (templateId, override) => set((state) => ({
    fontOverrides: { ...state.fontOverrides, [templateId]: override },
  })),
  clearFontOverride: (templateId) => set((state) => {
    const { [templateId]: _removed, ...rest } = state.fontOverrides;
    return { fontOverrides: rest };
  }),
  initializeBindings: (templateId, bindingsSchema, options) => {
    const existingBindingState = get().vortexBindings[templateId];
    const existingSchema = get().vortexBindingSchemas[templateId];
    if (existingBindingState && existingSchema && !options?.force) return;

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
  setBindingValues: (templateId, nextValues) => {
    const schema = get().vortexBindingSchemas[templateId];
    const bindingState = get().vortexBindings[templateId];
    if (!schema || !bindingState) return;
    const values = { ...bindingState.values, ...nextValues };
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
