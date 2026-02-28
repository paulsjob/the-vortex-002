import type { SavedTemplate } from '../../store/useTemplateStore';
import type { Layer } from '../../types/domain';

export type BindingType = 'text' | 'number' | 'image' | 'color';

export type BindingDefinition = {
  key: string;
  type: BindingType;
  required?: boolean;
  layerId: string;
  overflowPolicy?: string;
  maxLines?: number;
};

export type BindingSchema = {
  bindings: BindingDefinition[];
  fontOverrides?: {
    allowed?: boolean;
    fallbackFamilies?: string[];
  };
};

export type BindingValidationError = {
  key: string;
  message: string;
};

export type VortexBindingState = {
  templateId: string;
  values: Record<string, unknown>;
  validation: {
    isValid: boolean;
    missingRequired: string[];
    errors: BindingValidationError[];
  };
  readyToAir: boolean;
  fontGateSatisfied: boolean;
};

const emptyValidation = {
  isValid: true,
  missingRequired: [] as string[],
  errors: [] as BindingValidationError[],
};

const isEmptyValue = (value: unknown): boolean => (
  value === null
  || value === undefined
  || (typeof value === 'string' && value.trim() === '')
);

const defaultValueForBinding = (binding: BindingDefinition): unknown => {
  switch (binding.type) {
    case 'number':
      return '';
    case 'color':
      return '#ffffff';
    default:
      return '';
  }
};

export const normalizeBindingSchema = (raw: unknown): BindingSchema => {
  if (!raw || typeof raw !== 'object') {
    return { bindings: [] };
  }

  const value = raw as { bindings?: unknown; fontOverrides?: unknown };
  const rawBindings = Array.isArray(value.bindings) ? value.bindings : [];
  const bindings = rawBindings
    .map<BindingDefinition | null>((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const candidate = entry as Record<string, unknown>;
      const type = candidate.type;
      if (typeof candidate.key !== 'string' || typeof candidate.layerId !== 'string') return null;
      if (type !== 'text' && type !== 'number' && type !== 'image' && type !== 'color') return null;
      return {
        key: candidate.key,
        layerId: candidate.layerId,
        type,
        required: candidate.required === true,
        overflowPolicy: typeof candidate.overflowPolicy === 'string' ? candidate.overflowPolicy : undefined,
        maxLines: typeof candidate.maxLines === 'number' ? candidate.maxLines : undefined,
      } satisfies BindingDefinition;
    })
    .filter((binding): binding is BindingDefinition => binding !== null);

  const fontOverrides = value.fontOverrides && typeof value.fontOverrides === 'object'
    ? value.fontOverrides as { allowed?: unknown; fallbackFamilies?: unknown }
    : undefined;

  return {
    bindings,
    fontOverrides: fontOverrides
      ? {
        allowed: fontOverrides.allowed === true,
        fallbackFamilies: Array.isArray(fontOverrides.fallbackFamilies)
          ? fontOverrides.fallbackFamilies.filter((family): family is string => typeof family === 'string')
          : [],
      }
      : undefined,
  };
};

export const createInitialBindingValues = (schema: BindingSchema): Record<string, unknown> => (
  schema.bindings.reduce<Record<string, unknown>>((acc, binding) => {
    acc[binding.key] = defaultValueForBinding(binding);
    return acc;
  }, {})
);

export const validateBindingValues = (
  schema: BindingSchema,
  values: Record<string, unknown>,
  fontGateSatisfied: boolean,
): Pick<VortexBindingState, 'validation' | 'readyToAir'> => {
  const missingRequired: string[] = [];
  const errors: BindingValidationError[] = [];

  schema.bindings.forEach((binding) => {
    const value = values[binding.key];

    if (binding.required && isEmptyValue(value)) {
      missingRequired.push(binding.key);
      return;
    }

    if (isEmptyValue(value)) {
      return;
    }

    if (binding.type === 'number') {
      const parsed = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(parsed)) {
        errors.push({ key: binding.key, message: 'Must be a valid number.' });
      }
    }

    if (binding.type === 'image' && typeof value !== 'string') {
      errors.push({ key: binding.key, message: 'Image source must be a valid asset path or URL.' });
    }

    if (binding.type === 'text' && binding.required && typeof value === 'string' && value.trim() === '') {
      errors.push({ key: binding.key, message: 'Text value is required.' });
    }
  });

  const isValid = missingRequired.length === 0 && errors.length === 0;

  return {
    validation: {
      isValid,
      missingRequired,
      errors,
    },
    readyToAir: isValid && fontGateSatisfied,
  };
};

const applyToLayer = (layer: Layer, binding: BindingDefinition, value: unknown): Layer => {
  if (isEmptyValue(value)) {
    return layer;
  }

  if (binding.type === 'text' && layer.kind === 'text' && typeof value === 'string') {
    return { ...layer, text: value };
  }

  if (binding.type === 'image' && layer.kind === 'asset' && typeof value === 'string') {
    return { ...layer, assetId: value };
  }

  if (binding.type === 'color' && typeof value === 'string') {
    if (layer.kind === 'text') {
      return { ...layer, color: value };
    }
    if (layer.kind === 'shape') {
      return { ...layer, fill: value };
    }
  }

  if (binding.type === 'number') {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed)) {
      return layer;
    }
    if (layer.kind === 'text') {
      return { ...layer, text: String(parsed) };
    }
    if (layer.kind === 'shape') {
      return { ...layer, width: parsed };
    }
    if (layer.kind === 'asset') {
      return { ...layer, width: parsed };
    }
  }

  return layer;
};

export const applyBindingsToScene = (
  scene: Pick<SavedTemplate, 'id' | 'name' | 'canvasWidth' | 'canvasHeight' | 'layers'>,
  schema: BindingSchema,
  bindingState: VortexBindingState | undefined,
): Pick<SavedTemplate, 'id' | 'name' | 'canvasWidth' | 'canvasHeight' | 'layers'> => {
  const clonedScene = {
    ...scene,
    layers: scene.layers.map((layer) => ({ ...layer })),
  };

  if (!bindingState) {
    return clonedScene;
  }

  const bindingByLayerId = new Map(schema.bindings.map((binding) => [binding.layerId, binding]));

  clonedScene.layers = clonedScene.layers.map((layer) => {
    const binding = bindingByLayerId.get(layer.id);
    if (!binding) {
      return layer;
    }
    return applyToLayer(layer, binding, bindingState.values[binding.key]);
  });

  return clonedScene;
};
