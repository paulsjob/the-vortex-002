const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean']);

const isIdentifier = (segment: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment);

const appendPath = (base: string, segment: string) => {
  if (!base) return isIdentifier(segment) ? segment : `[${JSON.stringify(segment)}]`;
  return isIdentifier(segment) ? `${base}.${segment}` : `${base}[${JSON.stringify(segment)}]`;
};

const shouldTreatAsLeaf = (value: unknown) => (
  value === null || value === undefined || PRIMITIVE_TYPES.has(typeof value)
);

export const extractBindingPaths = (value: unknown, path = ''): string[] => {
  if (Array.isArray(value)) {
    if (!value.length) return path ? [path] : [];
    return path ? [path] : [];
  }

  if (shouldTreatAsLeaf(value)) {
    return path ? [path] : [];
  }

  if (!value || typeof value !== 'object') {
    return path ? [path] : [];
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) {
    return path ? [path] : [];
  }

  const paths = path ? [path] : [];
  entries.forEach(([key, nextValue]) => {
    paths.push(...extractBindingPaths(nextValue, appendPath(path, key)));
  });

  return paths;
};

export const buildFieldOptions = (value: unknown): string[] => {
  const deduped = new Set(extractBindingPaths(value));
  return [...deduped].sort((a, b) => a.localeCompare(b));
};
