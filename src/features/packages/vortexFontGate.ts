import type { Layer } from '../../types/domain';
import type { VortexPackage } from './loadVortexPackage';

export type FontLoadResult = {
  ok: boolean;
  loadedFamilies: string[];
  missingFamilies: string[];
  errors: { fontFile: string; message: string }[];
};

type FontManifestEntry = {
  family: string;
  style?: string;
  weight?: string | number;
  file: string;
};

type FontManifestV1 = {
  fonts?: FontManifestEntry[];
  requiredFamilies?: string[];
};

const DEFAULT_RESULT: FontLoadResult = {
  ok: true,
  loadedFamilies: [],
  missingFamilies: [],
  errors: [],
};

const fontLoadCache = new Map<string, Promise<FontLoadResult>>();

const normalizeFamilies = (families: unknown): string[] => {
  if (!Array.isArray(families)) {
    return [];
  }

  return [...new Set(families.filter((family): family is string => typeof family === 'string').map((family) => family.trim()).filter(Boolean))];
};

const normalizeFontEntries = (entries: unknown): FontManifestEntry[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => (entry && typeof entry === 'object' ? entry : null))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      family: typeof entry.family === 'string' ? entry.family.trim() : '',
      style: typeof entry.style === 'string' ? entry.style : 'normal',
      weight: typeof entry.weight === 'number' || typeof entry.weight === 'string' ? entry.weight : 'normal',
      file: typeof entry.file === 'string' ? entry.file.trim() : '',
    }))
    .filter((entry) => entry.family && entry.file);
};

const safeParseJson = async <T>(blob: Blob): Promise<T | null> => {
  try {
    return JSON.parse(await blob.text()) as T;
  } catch {
    return null;
  }
};

const collectFamiliesFromScene = (scene: unknown): string[] => {
  const families = new Set<string>();

  const walk = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    const family = record.fontFamily;
    if (typeof family === 'string' && family.trim()) {
      families.add(family.trim());
    }

    Object.values(record).forEach(walk);
  };

  walk(scene);
  return [...families];
};

const collectFamiliesFromLayers = (layers: Layer[]): string[] => {
  const families = new Set<string>();
  layers.forEach((layer) => {
    if (layer.kind === 'text' && layer.fontFamily.trim()) {
      families.add(layer.fontFamily.trim());
    }
  });
  return [...families];
};

const getFontManifest = async (pkg: VortexPackage): Promise<FontManifestV1 | null> => {
  const blob = pkg.files.fonts['fonts/fonts.json'];
  if (!blob) {
    return null;
  }
  return safeParseJson<FontManifestV1>(blob);
};

const getManifestFallbackFamilies = (pkg: VortexPackage): string[] => {
  const manifest = pkg.manifest as Record<string, unknown>;
  const requiredFamilies = normalizeFamilies(manifest.requiredFamilies);
  if (requiredFamilies.length > 0) {
    return requiredFamilies;
  }

  const manifestFonts = normalizeFontEntries(manifest.fonts);
  if (manifestFonts.length > 0) {
    return [...new Set(manifestFonts.map((font) => font.family))];
  }

  return [];
};

const resolveRequiredFamilies = (pkg: VortexPackage, manifest: FontManifestV1 | null): string[] => {
  const explicit = normalizeFamilies(manifest?.requiredFamilies);
  if (explicit.length > 0) {
    return explicit;
  }

  const manifestFallback = getManifestFallbackFamilies(pkg);
  if (manifestFallback.length > 0) {
    return manifestFallback;
  }

  const fromScene = collectFamiliesFromScene(pkg.scene);
  if (fromScene.length > 0) {
    return fromScene;
  }

  console.warn(`[vortex-fonts] Could not infer required font families for template ${pkg.manifest.templateId}. Font gate will not block rendering.`);
  return [];
};

const resolveFontEntries = (pkg: VortexPackage, manifest: FontManifestV1 | null): FontManifestEntry[] => {
  const manifestFonts = normalizeFontEntries(manifest?.fonts);
  if (manifestFonts.length > 0) {
    return manifestFonts;
  }

  const manifestFontEntries = normalizeFontEntries((pkg.manifest as Record<string, unknown>).fonts);
  if (manifestFontEntries.length > 0) {
    return manifestFontEntries;
  }

  return [];
};

const checkLoadedFamily = (family: string): boolean => {
  if (typeof document === 'undefined' || !document.fonts) {
    return false;
  }
  return document.fonts.check(`16px "${family}"`) || document.fonts.check(`16px ${family}`);
};

const loadFontsForPackage = async (pkg: VortexPackage, knownSceneLayers?: Layer[]): Promise<FontLoadResult> => {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return { ...DEFAULT_RESULT };
  }

  const manifest = await getFontManifest(pkg);
  const fontEntries = resolveFontEntries(pkg, manifest);
  const requiredFamilies = resolveRequiredFamilies(pkg, manifest);
  if (requiredFamilies.length === 0 && knownSceneLayers && knownSceneLayers.length > 0) {
    requiredFamilies.push(...collectFamiliesFromLayers(knownSceneLayers));
  }

  const errors: { fontFile: string; message: string }[] = [];
  const loadedFamilies = new Set<string>();

  for (const entry of fontEntries) {
    const fontBlob = pkg.files.fonts[entry.file];
    if (!fontBlob) {
      errors.push({ fontFile: entry.file, message: 'Font file not found in package.' });
      continue;
    }

    const fontUrl = URL.createObjectURL(fontBlob);
    try {
      const face = new FontFace(entry.family, `url(${fontUrl})`, {
        style: entry.style,
        weight: String(entry.weight ?? 'normal'),
      });
      const loadedFace = await face.load();
      document.fonts.add(loadedFace);
      loadedFamilies.add(entry.family);
    } catch (error) {
      errors.push({
        fontFile: entry.file,
        message: error instanceof Error ? error.message : 'Unknown font loading error.',
      });
    } finally {
      URL.revokeObjectURL(fontUrl);
    }
  }

  const missingFamilies = requiredFamilies.filter((family) => !loadedFamilies.has(family) && !checkLoadedFamily(family));

  return {
    ok: missingFamilies.length === 0,
    loadedFamilies: [...loadedFamilies],
    missingFamilies,
    errors,
  };
};

export const loadVortexFonts = (pkg: VortexPackage, knownSceneLayers?: Layer[]): Promise<FontLoadResult> => {
  const templateId = pkg.manifest.templateId;
  const cached = fontLoadCache.get(templateId);
  if (cached) {
    return cached;
  }

  const pending = loadFontsForPackage(pkg, knownSceneLayers)
    .catch((error) => ({
      ok: false,
      loadedFamilies: [],
      missingFamilies: resolveRequiredFamilies(pkg, null),
      errors: [{ fontFile: 'fonts/fonts.json', message: error instanceof Error ? error.message : 'Unknown error while loading fonts.' }],
    }));

  fontLoadCache.set(templateId, pending);
  return pending;
};

export const clearVortexFontCache = (templateId: string) => {
  fontLoadCache.delete(templateId);
};
