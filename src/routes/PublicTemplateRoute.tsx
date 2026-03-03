import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTemplateStore } from '../store/useTemplateStore';
import { useDataEngineStore, type SportKey } from '../store/useDataEngineStore';
import { decodeTemplateFeedPayload } from '../features/playout/publicUrl';
import { TemplateSceneSvg } from '../features/playout/TemplateSceneSvg';
import { sceneFromVortexPackage } from '../features/packages/vortexSceneAdapter';
import { getVortexAssetUrl } from '../features/packages/vortexAssetResolver';
import { type FontLoadResult, loadVortexFonts } from '../features/packages/vortexFontGate';
import { getManifestFormat } from '../features/packages/loadVortexPackage';
import { FontGateOverlay } from '../features/playout/FontGateOverlay';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { applyBindingsToScene, normalizeBindingSchema } from '../features/playout/vortexBindings';
import { runVortexRenderValidation, type VortexRenderValidationReport } from '../features/playout/vortexRenderValidation';
import { createLiveFeedSubscriber } from '../features/liveFeed/liveFeedBus';

const meta = import.meta as ImportMeta & { env?: Record<string, unknown> };
const env = meta.env ?? {};
const VORTEX_VALIDATE_RENDER = Boolean(env.DEV) && (env.VORTEX_VALIDATE_RENDER === true || env.VORTEX_VALIDATE_RENDER === 'true' || env.VITE_VORTEX_VALIDATE_RENDER === true || env.VITE_VORTEX_VALIDATE_RENDER === 'true');

export function PublicTemplateRoute() {
  const { templateId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const templateStore = useTemplateStore();
  const fontOverrides = usePlayoutStore((s) => s.fontOverrides);
  const setFontOverride = usePlayoutStore((s) => s.setFontOverride);
  const [fontGateResult, setFontGateResult] = useState<FontLoadResult | null>(null);
  const [validationReport, setValidationReport] = useState<VortexRenderValidationReport | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'running' | 'failed'>('idle');
  const [sourceSvgMarkup, setSourceSvgMarkup] = useState<string | null>(null);
  const [waitingForLiveFeed, setWaitingForLiveFeed] = useState(false);
  const initializeBindings = usePlayoutStore((s) => s.initializeBindings);
  const getBindingState = usePlayoutStore((s) => s.getBindingState);
  const setBindingFontGateSatisfied = usePlayoutStore((s) => s.setBindingFontGateSatisfied);

  useEffect(() => {
    const engine = useDataEngineStore.getState();
    let receivedState = false;

    engine.setExternalMode(true);
    engine.clearExternalGame();
    setWaitingForLiveFeed(true);

    const unsubscribe = createLiveFeedSubscriber(({ activeSport, game }) => {
      receivedState = true;
      setWaitingForLiveFeed(false);
      engine.setExternalGame(game, activeSport as SportKey);
    });

    const fallbackTimer = window.setTimeout(() => {
      if (receivedState) return;
      setWaitingForLiveFeed(true);
    }, 2000);

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
      const nextEngine = useDataEngineStore.getState();
      nextEngine.setExternalMode(false);
      nextEngine.clearExternalGame();
    };
  }, []);

  const renderState = useMemo(() => {
    const encoded = searchParams.get('tpl');
    if (encoded) {
      const payload = decodeTemplateFeedPayload(encoded);
      if (payload) {
        return { template: payload.template, source: 'native' as const };
      }
      return { error: 'Template payload is invalid.' };
    }

    const vortexPackage = templateStore.getVortexPackage(templateId);
    if (vortexPackage) {
      try {
        const scene = sceneFromVortexPackage(vortexPackage);
        const schema = normalizeBindingSchema(vortexPackage.bindings);
        const format = getManifestFormat(vortexPackage.manifest);
        return {
          source: 'vortex' as const,
          packageRef: vortexPackage,
          formatLabel: `${format.formatId} · ${scene.canvas.width} × ${scene.canvas.height}`,
          schema,
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
  const template = renderState.template ?? null;
  const override = renderState.source === 'vortex' && template ? fontOverrides[template.id] : undefined;
  const bindingState = renderState.source === 'vortex' && template ? getBindingState(template.id) : undefined;
  const transformedTemplate = renderState.source === 'vortex' && template
    ? applyBindingsToScene(template, renderState.schema, bindingState)
    : template;

  useEffect(() => {
    if (renderState.source !== 'vortex' || !renderState.packageRef) {
      setFontGateResult(null);
      return;
    }

    let active = true;
    loadVortexFonts(renderState.packageRef, renderState.template.layers).then((result) => {
      if (active) {
        setFontGateResult(result);
      }
    });

    return () => {
      active = false;
    };
  }, [renderState]);


  useEffect(() => {
    if (renderState.source !== 'vortex') return;
    initializeBindings(renderState.template.id, renderState.schema);
  }, [renderState, initializeBindings]);

  useEffect(() => {
    if (renderState.source !== 'vortex') return;
    const override = fontOverrides[renderState.template.id];
    const satisfied = Boolean(!fontGateResult || fontGateResult.ok || override?.enabled);
    setBindingFontGateSatisfied(renderState.template.id, satisfied);
  }, [renderState, fontOverrides, fontGateResult, setBindingFontGateSatisfied]);

  useEffect(() => {
    if (!VORTEX_VALIDATE_RENDER || renderState.source !== 'vortex') {
      setSourceSvgMarkup(null);
      return;
    }

    const sourceEntry = Object.entries(renderState.packageRef.files.source).find(([path]) => path.endsWith('.svg'));
    if (!sourceEntry) {
      setSourceSvgMarkup(null);
      return;
    }

    let active = true;
    sourceEntry[1].text().then((text) => {
      if (active) setSourceSvgMarkup(text);
    });
    return () => {
      active = false;
    };
  }, [renderState]);

  useEffect(() => {
    if (!VORTEX_VALIDATE_RENDER || renderState.source !== 'vortex' || !sourceSvgMarkup || !template || !transformedTemplate) {
      setValidationReport(null);
      return;
    }

    const run = async () => {
      setValidationStatus('running');
      let hidden: HTMLDivElement | null = null;
      try {
        hidden = document.createElement('div');
        hidden.style.position = 'fixed';
        hidden.style.left = '-10000px';
        hidden.style.top = '-10000px';
        hidden.style.width = `${template.canvasWidth}px`;
        hidden.style.height = `${template.canvasHeight}px`;
        document.body.appendChild(hidden);

        hidden.innerHTML = sourceSvgMarkup;
        const originalSvgElement = hidden.querySelector('svg');

        const runtimeSvgFirst = renderToStaticMarkup(
          <TemplateSceneSvg
            template={transformedTemplate}
            className="h-full w-full"
            assetResolver={(path) => getVortexAssetUrl(template.id, path)}
          />,
        );
        const runtimeSvgSecond = renderToStaticMarkup(
          <TemplateSceneSvg
            template={transformedTemplate}
            className="h-full w-full"
            assetResolver={(path) => getVortexAssetUrl(template.id, path)}
          />,
        );

        const runtimeContainer = document.createElement('div');
        runtimeContainer.innerHTML = runtimeSvgFirst;
        hidden.appendChild(runtimeContainer);
        const runtimeSvgElement = runtimeContainer.querySelector('svg');

        if (!originalSvgElement || !runtimeSvgElement) {
          throw new Error('Could not prepare validation SVG containers.');
        }

        const report = await runVortexRenderValidation({
          originalSvg: originalSvgElement.outerHTML,
          runtimeSvgFirst,
          runtimeSvgSecond,
          originalSvgElement,
          runtimeSvgElement,
          template,
          width: template.canvasWidth,
          height: template.canvasHeight,
          allowFallback: Boolean(override?.enabled),
        });
        console.groupCollapsed(`[vortex-validate] ${template.name}`);
        console.table({
          passed: report.passed,
          diffPercentage: report.pixelDiff.diffPercentage,
          mismatchedPixels: report.pixelDiff.mismatchedPixels,
          totalPixels: report.pixelDiff.totalPixels,
          deterministic: report.deterministic.passed,
          fontsOk: report.fontValidation.passed,
        });
        if (report.textBoundingBoxes.length > 0) {
          console.table(report.textBoundingBoxes);
        }
        if (report.notes.length > 0) {
          console.warn(report.notes);
        }
        console.groupEnd();

        setValidationReport(report);
        setValidationStatus(report.passed ? 'idle' : 'failed');
      } catch (error) {
        console.error('[vortex-validate] Validation failed to run', error);
        setValidationStatus('failed');
      } finally {
        if (hidden && hidden.parentNode) hidden.parentNode.removeChild(hidden);
      }
    };

    run();
  }, [renderState, sourceSvgMarkup, template, transformedTemplate, override]);

  if (waitingForLiveFeed) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-slate-300">
        <p className="text-sm">Waiting for live feed...</p>
      </main>
    );
  }

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

  const renderedTemplate = transformedTemplate ?? template;

  const shouldBlockForFonts = Boolean(renderState.source === 'vortex' && fontGateResult && !fontGateResult.ok && !override?.enabled);
  const shouldBlockForBindings = Boolean(renderState.source === 'vortex' && bindingState && !bindingState.readyToAir);

  return (
    <main className="grid min-h-screen place-items-center bg-black p-4">
      <div className="relative w-full" style={{ maxWidth: '100vw', maxHeight: '100vh', aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}`, fontFamily: override?.enabled ? override.fallbackFamily : undefined }}>
        {shouldBlockForFonts && renderState.source === 'vortex' && fontGateResult && (
          <FontGateOverlay
            templateName={template.name}
            formatLabel={renderState.formatLabel}
            missingFamilies={fontGateResult.missingFamilies}
            loadedFamilies={fontGateResult.loadedFamilies}
            onKeepStopped={() => undefined}
            onOverride={(fallbackFamily) => {
              setFontOverride(template.id, {
                enabled: true,
                fallbackFamily,
                timestamp: new Date().toISOString(),
              });
            }}
          />
        )}

        {shouldBlockForBindings && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 text-center text-sm text-rose-200">
            <div>
              <p className="font-semibold">Rendering blocked: Vortex bindings are not ready.</p>
              <p className="text-xs text-rose-300">Complete required bindings in the operator Output route.</p>
            </div>
          </div>
        )}

        {!shouldBlockForFonts && !shouldBlockForBindings && (
          <TemplateSceneSvg
            template={renderedTemplate}
            className="h-full w-full"
            assetResolver={renderState.source === 'vortex' ? (path) => getVortexAssetUrl(template.id, path) : undefined}
            debugLiveLabel="output"
          />
        )}

        {VORTEX_VALIDATE_RENDER && validationStatus === 'running' && (
          <div className="absolute left-2 top-2 z-30 rounded bg-slate-900/90 px-2 py-1 text-[11px] font-semibold text-slate-200">
            Validation running…
          </div>
        )}

        {VORTEX_VALIDATE_RENDER && validationStatus === 'failed' && (
          <div className="absolute left-2 top-2 z-30 rounded bg-rose-900/90 px-2 py-1 text-[11px] font-semibold text-rose-100">
            Validation Failed{validationReport ? ` · ${validationReport.pixelDiff.diffPercentage.toFixed(3)}%` : ''}
          </div>
        )}
      </div>
    </main>
  );
}
