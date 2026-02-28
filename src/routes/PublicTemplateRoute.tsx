import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTemplateStore } from '../store/useTemplateStore';
import { useDataEngineStore } from '../store/useDataEngineStore';
import { decodeTemplatePayload } from '../features/playout/publicUrl';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';

export function PublicTemplateRoute() {
  const { templateId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const templateStore = useTemplateStore();
  const startEngine = useDataEngineStore((s) => s.start);

  useEffect(() => {
    startEngine();
  }, [startEngine]);

  const renderState = useMemo(() => {
    const encoded = searchParams.get('tpl');
    if (encoded) {
      const decoded = decodeTemplatePayload(encoded);
      if (decoded) {
        return { template: decoded, source: 'native' as const };
      }
      return { error: 'Template payload is invalid.' };
    }

    const vortexPackage = templateStore.getVortexPackage(templateId);
    if (vortexPackage) {
      try {
        const scene = sceneFromVortexPackage(vortexPackage);
        return {
          source: 'vortex' as const,
          template: {
            id: vortexPackage.manifest.templateId,
            name: vortexPackage.manifest.templateName,
            canvasWidth: scene.canvas.width,
            canvasHeight: scene.canvas.height,
            layers: scene.layers,
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Vortex scene is invalid.' };
      }
    }

    const nativeTemplate = templateStore.getTemplateById(templateId);
    if (nativeTemplate) {
      return { template: nativeTemplate, source: 'native' as const };
    }

    return { error: 'Template not found.' };
  }, [searchParams, templateStore.templates, templateStore.vortexPackages, templateId]);

  if (renderState.error) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-slate-300">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Graphic unavailable</h1>
          <p className="text-sm text-slate-500">{renderState.error}</p>
        </div>
      </main>
    );
  }

  const template = renderState.template;
  if (!template) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-slate-300">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Graphic unavailable</h1>
          <p className="text-sm text-slate-500">Template could not be prepared for rendering.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black p-4">
      <div className="w-full" style={{ maxWidth: '100vw', maxHeight: '100vh', aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}` }}>
        <TemplateSceneSvg
          template={template}
          className="h-full w-full"
          assetResolver={renderState.source === 'vortex' ? (path) => getVortexAssetUrl(template.id, path) : undefined}
        />
      </div>
    </main>
  );
}
