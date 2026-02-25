import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTemplateStore } from '../store/useTemplateStore';
import { useAssetStore } from '../store/useAssetStore';
import { useDataEngineStore } from '../store/useDataEngineStore';
import { getLiveTextContent } from '../features/playout/liveBindings';

export function PublicTemplateRoute() {
  const { templateId = '' } = useParams();
  const templateStore = useTemplateStore();
  const assets = useAssetStore((s) => s.assets);
  const game = useDataEngineStore((s) => s.game);
  const template = useMemo(() => templateStore.getTemplateById(templateId), [templateStore.templates, templateId]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  if (!template) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-slate-300">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Graphic unavailable</h1>
          <p className="text-sm text-slate-500">Template not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black">
      <svg
        viewBox={`0 0 ${template.canvasWidth} ${template.canvasHeight}`}
        className="h-auto w-full max-h-screen max-w-screen"
        role="img"
        aria-label="Public graphics output"
      >
        {[...template.layers]
          .filter((layer) => layer.visible !== false)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => {
            const opacity = (layer.opacity ?? 100) / 100;

            if (layer.kind === 'text') {
              const textValue = getLiveTextContent(layer, game);
              const anchor = layer.textAlign === 'center' ? 'middle' : layer.textAlign === 'right' ? 'end' : 'start';
              return (
                <text
                  key={layer.id}
                  x={layer.x}
                  y={layer.y + layer.size}
                  fill={layer.color}
                  fontSize={layer.size}
                  fontFamily={layer.fontFamily}
                  fontWeight="700"
                  opacity={opacity}
                  dominantBaseline="hanging"
                  textAnchor={anchor}
                >
                  {textValue}
                </text>
              );
            }

            if (layer.kind === 'shape') {
              if (layer.shapeType === 'ellipse') {
                return (
                  <ellipse
                    key={layer.id}
                    cx={layer.x + (layer.width / 2)}
                    cy={layer.y + (layer.height / 2)}
                    rx={Math.max(1, layer.width / 2)}
                    ry={Math.max(1, layer.height / 2)}
                    fill={layer.fill}
                    opacity={opacity}
                  />
                );
              }
              return (
                <rect
                  key={layer.id}
                  x={layer.x}
                  y={layer.y}
                  width={layer.width}
                  height={layer.height}
                  fill={layer.fill}
                  opacity={opacity}
                />
              );
            }

            const asset = assetById.get(layer.assetId);
            return asset ? (
              <image
                key={layer.id}
                href={asset.src}
                x={layer.x}
                y={layer.y}
                width={layer.width}
                height={layer.height}
                preserveAspectRatio="xMidYMid meet"
                opacity={opacity}
              />
            ) : null;
          })}
      </svg>
    </main>
  );
}
