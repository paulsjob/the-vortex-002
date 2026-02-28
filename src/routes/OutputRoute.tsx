import { useEffect, useMemo, useState } from 'react';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';
import { type FontLoadResult, loadVortexFonts } from '../features/packages/vortexFontGate';
import { getManifestFormat } from '../features/packages/loadVortexPackage';
import { FontGateOverlay } from '../features/playout/FontGateOverlay';
import { applyBindingsToScene, normalizeBindingSchema } from '../features/playout/vortexBindings';
import { StatusBadge } from '../components/ui/StatusBadge';

export function OutputRoute() {
  const templateStore = useTemplateStore();
  const programTemplate = usePlayoutStore((s) => s.programTemplate);
  const fontOverrides = usePlayoutStore((s) => s.fontOverrides);
  const initializeBindings = usePlayoutStore((s) => s.initializeBindings);
  const getBindingState = usePlayoutStore((s) => s.getBindingState);
  const setBindingFontGateSatisfied = usePlayoutStore((s) => s.setBindingFontGateSatisfied);
  const setFontOverride = usePlayoutStore((s) => s.setFontOverride);

  const selectedTemplate = templateStore.selectedTemplate;
  const [fontGateResult, setFontGateResult] = useState<FontLoadResult | null>(null);
  const [fontGateLoading, setFontGateLoading] = useState(false);

  const vortexRenderState = useMemo(() => {
    if (!selectedTemplate || selectedTemplate.source !== 'vortex') return null;
    const pkg = templateStore.getVortexPackage(selectedTemplate.id);
    if (!pkg) return { error: 'Selected Vortex template package is missing.' as const };

    try {
      const scene = sceneFromVortexPackage(pkg);
      const schema = normalizeBindingSchema(pkg.bindings);
      const format = getManifestFormat(pkg.manifest);
      return {
        template: {
          id: pkg.manifest.templateId,
          name: pkg.manifest.templateName,
          canvasWidth: scene.canvas.width,
          canvasHeight: scene.canvas.height,
          layers: scene.layers,
        },
        schema,
        formatLabel: `${format.formatId} · ${scene.canvas.width} × ${scene.canvas.height}`,
        packageRef: pkg,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid Vortex scene data.' };
    }
  }, [selectedTemplate, templateStore.vortexPackages]);

  useEffect(() => {
    if (!vortexRenderState || !('template' in vortexRenderState) || !vortexRenderState.template || !vortexRenderState.schema) return;
    initializeBindings(vortexRenderState.template.id, vortexRenderState.schema);
  }, [vortexRenderState, initializeBindings]);

  useEffect(() => {
    if (!vortexRenderState || !('template' in vortexRenderState) || !vortexRenderState.packageRef) {
      setFontGateResult(null);
      setFontGateLoading(false);
      return;
    }

    let active = true;
    setFontGateLoading(true);
    loadVortexFonts(vortexRenderState.packageRef, vortexRenderState.template.layers)
      .then((result) => {
        if (!active) return;
        setFontGateResult(result);
      })
      .finally(() => {
        if (!active) return;
        setFontGateLoading(false);
      });

    return () => {
      active = false;
    };
  }, [vortexRenderState]);

  useEffect(() => {
    if (!vortexRenderState || !('template' in vortexRenderState) || !vortexRenderState.template) return;
    const override = fontOverrides[vortexRenderState.template.id];
    setBindingFontGateSatisfied(vortexRenderState.template.id, Boolean(!fontGateResult || fontGateResult.ok || override?.enabled));
  }, [vortexRenderState, fontGateResult, fontOverrides, setBindingFontGateSatisfied]);

  const vortexTemplate = vortexRenderState && 'template' in vortexRenderState ? vortexRenderState.template : undefined;
  const vortexSchema = vortexRenderState && 'template' in vortexRenderState ? vortexRenderState.schema : undefined;
  const bindingState = vortexTemplate ? getBindingState(vortexTemplate.id) : undefined;
  const transformedVortexTemplate = vortexTemplate && vortexSchema ? applyBindingsToScene(vortexTemplate, vortexSchema, bindingState) : undefined;
  const activeTemplate = transformedVortexTemplate || programTemplate;
  const override = vortexTemplate ? fontOverrides[vortexTemplate.id] : undefined;

  const shouldBlockForFonts = Boolean(vortexRenderState?.template && fontGateResult && !fontGateResult.ok && !override?.enabled);
  const shouldBlockForBindings = Boolean(vortexRenderState?.template && bindingState && !bindingState.readyToAir);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        {activeTemplate ? <StatusBadge tone="on-air">ON AIR</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}
        {vortexTemplate && bindingState?.readyToAir ? <StatusBadge tone="ready">READY</StatusBadge> : null}
      </div>

      {vortexRenderState?.error ? (
        <div className="grid h-full place-items-center text-sm text-rose-300">{vortexRenderState.error}</div>
      ) : !activeTemplate ? (
        <div className="grid h-full place-items-center text-sm text-slate-500">No template on air.</div>
      ) : (
        <div className="relative grid h-full place-items-center p-4">
          {fontGateLoading && vortexRenderState?.template && (
            <div className="absolute inset-0 z-20 grid place-items-center text-sm text-slate-200">Loading template fonts…</div>
          )}

          {shouldBlockForFonts && vortexRenderState?.template && fontGateResult && (
            <FontGateOverlay
              templateName={vortexRenderState.template.name}
              formatLabel={vortexRenderState.formatLabel}
              missingFamilies={fontGateResult.missingFamilies}
              loadedFamilies={fontGateResult.loadedFamilies}
              onKeepStopped={() => undefined}
              onOverride={(fallbackFamily) => {
                if (!vortexTemplate) return;
                setFontOverride(vortexTemplate.id, {
                  enabled: true,
                  fallbackFamily,
                  timestamp: new Date().toISOString(),
                });
              }}
            />
          )}

          {shouldBlockForBindings && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-6 text-center text-sm text-rose-200">
              Rendering blocked: required bindings are missing.
            </div>
          )}

          <div
            className="relative w-full max-w-full"
            style={{
              aspectRatio: `${activeTemplate.canvasWidth} / ${activeTemplate.canvasHeight}`,
              fontFamily: override?.enabled ? override.fallbackFamily : undefined,
            }}
          >
            {!shouldBlockForFonts && !shouldBlockForBindings && (
              <TemplateSceneSvg
                template={activeTemplate}
                className="absolute inset-0 h-full w-full"
                assetResolver={vortexTemplate ? (path) => getVortexAssetUrl(vortexTemplate.id, path) : undefined}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
