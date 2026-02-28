import { useTemplateStore } from '../../store/useTemplateStore';

const vortexAssetUrlCache = new Map<string, Map<string, string>>();

const normalizeAssetPath = (assetPath: string): string[] => {
  const trimmed = assetPath.trim();
  if (!trimmed) return [];
  return trimmed.startsWith('assets/') ? [trimmed] : [trimmed, `assets/${trimmed}`];
};

export function getVortexAssetUrl(templateId: string, assetPath: string): string | undefined {
  const candidates = normalizeAssetPath(assetPath);
  if (!candidates.length) return undefined;

  let templateCache = vortexAssetUrlCache.get(templateId);
  if (!templateCache) {
    templateCache = new Map<string, string>();
    vortexAssetUrlCache.set(templateId, templateCache);
  }

  for (const candidate of candidates) {
    const cachedUrl = templateCache.get(candidate);
    if (cachedUrl) return cachedUrl;

    const pkg = useTemplateStore.getState().getVortexPackage(templateId);
    const blob = pkg?.files.assets[candidate];
    if (!blob) {
      continue;
    }

    const url = URL.createObjectURL(blob);
    templateCache.set(candidate, url);
    return url;
  }

  return undefined;
}

export function revokeVortexAssetUrls(templateId: string): void {
  const templateCache = vortexAssetUrlCache.get(templateId);
  if (!templateCache) return;

  for (const url of templateCache.values()) {
    URL.revokeObjectURL(url);
  }

  vortexAssetUrlCache.delete(templateId);
}
