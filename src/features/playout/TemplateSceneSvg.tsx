import { useMemo } from 'react';
import { useAssetStore } from '../../store/useAssetStore';
import type { Layer } from '../../types/domain';
import type { SavedTemplate } from '../../store/useTemplateStore';
import { useDataEngineStore } from '../../store/useDataEngineStore';
import { resolveTextLayerBindingValue } from '../../components/design/dataBindingPaths';
import { buildNormalizedPayload, buildTeamMetrics } from '../simulation/derived';

type SceneTemplate = Pick<SavedTemplate, 'id' | 'name' | 'canvasWidth' | 'canvasHeight' | 'layers'>;

type Props = {
  template: SceneTemplate;
  className?: string;
  assetResolver?: (path: string) => string | undefined;
  debugLiveLabel?: 'program' | 'output' | 'preview';
};

const DEFAULT_TRANSFORM = {
  anchorX: 0,
  anchorY: 0,
  scaleX: 100,
  scaleY: 100,
  rotation: 0,
};

export function TemplateSceneSvg({ template, className, assetResolver, debugLiveLabel }: Props) {
  const assets = useAssetStore((s) => s.assets);
  const game = useDataEngineStore((s) => s.game);
  const externalGame = useDataEngineStore((s) => s.externalGame);
  const running = useDataEngineStore((s) => s.running);
  const activeSport = useDataEngineStore((s) => s.activeSport);
  const externalMode = useDataEngineStore((s) => s.externalMode);
  const livePublisherActive = useDataEngineStore((s) => s.livePublisherActive);
  const lastBroadcastAt = useDataEngineStore((s) => s.lastBroadcastAt);
  const historyLength = useDataEngineStore((s) => s.history.length);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const hasLiveData = externalMode ? Boolean(externalGame) : historyLength > 0;
  const engineGame = externalMode && externalGame ? externalGame : game;
  const liveFeedPayload = hasLiveData ? engineGame : null;
  const derivedPayload = useMemo(() => {
    if (!hasLiveData) return null;
    return {
      teamMetrics: buildTeamMetrics(engineGame),
      advancedMetrics: engineGame.advancedMetrics,
      consistencyIssues: engineGame.consistencyIssues ?? [],
      sport: engineGame.sport,
    };
  }, [engineGame, hasLiveData]);
  const scorebugPayload = useMemo(() => (
    hasLiveData ? buildNormalizedPayload(engineGame, 'live-scorebug') : null
  ), [engineGame, hasLiveData]);

  const showLiveOverlay = useMemo(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false;
    return window.localStorage.getItem('debug_live') === '1';
  }, []);

  const getTextContent = (layer: Extract<Layer, { kind: 'text' }>) => resolveTextLayerBindingValue(layer, {
    liveFeedPayload,
    derivedPayload,
    scorebugPayload,
  });

  const sampleBindings = useMemo(() => {
    const textLayers = template.layers
      .filter((layer): layer is Extract<Layer, { kind: 'text' }> => layer.kind === 'text')
      .filter((layer) => layer.dataBindingSource !== 'manual' && Boolean(layer.dataBindingField))
      .slice(0, 3);

    return textLayers.map((layer) => ({
      layerId: layer.id,
      source: layer.dataBindingSource,
      field: layer.dataBindingField,
      rendered: getTextContent(layer),
    }));
  }, [template.layers, liveFeedPayload, derivedPayload, scorebugPayload]);

  const renderLayer = (layer: Layer) => {
    const opacity = (layer.opacity ?? 100) / 100;
    const anchorX = layer.anchorX ?? DEFAULT_TRANSFORM.anchorX;
    const anchorY = layer.anchorY ?? DEFAULT_TRANSFORM.anchorY;
    const scaleX = (layer.scaleX ?? DEFAULT_TRANSFORM.scaleX) / 100;
    const scaleY = (layer.scaleY ?? DEFAULT_TRANSFORM.scaleY) / 100;
    const rotation = layer.rotation ?? DEFAULT_TRANSFORM.rotation;

    const transform = `translate(${layer.x} ${layer.y}) rotate(${rotation}) scale(${scaleX} ${scaleY}) translate(${-anchorX} ${-anchorY})`;

    if (layer.kind === 'text') {
      const resolved = getTextContent(layer);
      const textValue = layer.dataBindingSource !== 'manual'
        ? (resolved && resolved.trim().length > 0 ? resolved : (layer.text || ' '))
        : (resolved || layer.text || ' ');
      const textAnchor = layer.textAlign === 'center' ? 'middle' : layer.textAlign === 'right' ? 'end' : 'start';
      const textX = layer.textAlign === 'center' ? anchorX : layer.textAlign === 'right' ? anchorX * 2 : 0;
      return (
        <g key={layer.id} transform={transform} opacity={opacity} data-layer-id={layer.id}>
          <text
            x={textX}
            y={0}
            fill={layer.color}
            fontSize={layer.size}
            fontFamily={layer.fontFamily}
            fontWeight="700"
            dominantBaseline="hanging"
            textAnchor={textAnchor}
          >
            {textValue}
          </text>
        </g>
      );
    }

    if (layer.kind === 'shape') {
      return (
        <g key={layer.id} transform={transform} opacity={opacity} data-layer-id={layer.id}>
          {layer.shapeType === 'ellipse' ? (
            <ellipse
              cx={Math.max(1, layer.width / 2)}
              cy={Math.max(1, layer.height / 2)}
              rx={Math.max(1, layer.width / 2)}
              ry={Math.max(1, layer.height / 2)}
              fill={layer.fill}
            />
          ) : (
            <rect x={0} y={0} width={layer.width} height={layer.height} fill={layer.fill} />
          )}
        </g>
      );
    }

    const asset = assetById.get(layer.assetId);
    const resolvedAssetPath = layer.assetId || (layer as { assetPath?: string }).assetPath || '';
    const resolvedAssetUrl = assetResolver?.(resolvedAssetPath);
    const imageUrl = asset?.src ?? resolvedAssetUrl;
    return (
      <g key={layer.id} transform={transform} opacity={opacity} data-layer-id={layer.id}>
        {imageUrl ? (
          <image
            href={imageUrl}
            x={0}
            y={0}
            width={layer.width}
            height={layer.height}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <g>
            <rect width={layer.width} height={layer.height} fill="rgba(120,53,15,0.7)" stroke="rgb(245,158,11)" strokeDasharray="10 8" />
            <text x={8} y={8} fill="rgb(254,243,199)" fontSize={18} fontWeight="700" dominantBaseline="hanging">
              Missing asset
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${template.canvasWidth} ${template.canvasHeight}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Template scene"
    >

      {showLiveOverlay && debugLiveLabel ? (
        <foreignObject x={8} y={8} width={Math.max(200, template.canvasWidth * 0.45)} height={120}>
          <div xmlns="http://www.w3.org/1999/xhtml" className="pointer-events-none rounded border border-emerald-500/70 bg-black/70 px-2 py-1 text-[10px] leading-tight text-emerald-200">
            <p>{debugLiveLabel} · running: {String(running)}</p>
            <p>publisherActive: {String(livePublisherActive)} · externalMode: {String(externalMode)}</p>
            <p>externalGame: {String(Boolean(externalGame))} · historyLength: {String(historyLength)} · hasLiveData: {String(hasLiveData)}</p>
            <p>activeSport: {String(activeSport)} · engineGame sport: {String(engineGame.sport)}</p>
            <p>clockSeconds: {String(engineGame.clockSeconds)} · periodLabel: {String(engineGame.periodLabel)}</p>
            <p>lastBroadcastAgeMs: {lastBroadcastAt ? String(Math.max(0, Date.now() - lastBroadcastAt)) : 'Infinity'}</p>
            {sampleBindings.map((entry) => (
              <p key={`${debugLiveLabel}-${entry.layerId}`}>
                {entry.source}.{entry.field}: {entry.rendered || '(empty)'}
              </p>
            ))}
          </div>
        </foreignObject>
      ) : null}
      {[...template.layers]
        .filter((layer) => layer.visible !== false)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(renderLayer)}
    </svg>
  );
}
