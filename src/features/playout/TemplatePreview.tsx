import { useMemo } from 'react';
import { useAssetStore } from '../../store/useAssetStore';
import { useDataEngineStore } from '../../store/useDataEngineStore';
import type { SavedTemplate } from '../../store/useTemplateStore';
import { getLiveTextContent } from './liveBindings';

interface Props {
  template: SavedTemplate | null;
  label: string;
  tone?: 'preview' | 'program';
}

export function TemplatePreview({ template, label, tone = 'preview' }: Props) {
  const assets = useAssetStore((s) => s.assets);
  const game = useDataEngineStore((s) => s.game);
  const running = useDataEngineStore((s) => s.running);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-semibold uppercase tracking-[0.2em] ${tone === 'program' ? 'text-red-300' : 'text-slate-400'}`}>{label}</h4>
        <div className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider ${running ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-amber-600 bg-amber-900/30 text-amber-300'}`}>
          Data Engine {running ? 'Live' : 'Paused'}
        </div>
      </div>
      {!template ? (
        <div className="grid h-[240px] place-items-center rounded-lg border border-slate-700 bg-slate-950 text-sm text-slate-500">
          No template loaded.
        </div>
      ) : (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{template.name}</span>
            <span>{template.canvasWidth} × {template.canvasHeight}</span>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-950" style={{ aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}` }}>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#0f172a_25%,#111827_25%,#111827_50%,#0f172a_50%,#0f172a_75%,#111827_75%,#111827_100%)] bg-[length:18px_18px] opacity-70" />
            <svg
              viewBox={`0 0 ${template.canvasWidth} ${template.canvasHeight}`}
              className="absolute inset-0 z-10 h-full w-full"
              aria-label={`${label} template preview`}
              role="img"
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
                  ) : (
                    <g key={layer.id} opacity={opacity}>
                      <rect x={layer.x} y={layer.y} width={layer.width} height={layer.height} fill="rgba(120,53,15,0.7)" stroke="rgb(245,158,11)" strokeDasharray="10 8" />
                      <text x={layer.x + 8} y={layer.y + 8} fill="rgb(254,243,199)" fontSize={18} fontWeight="700" dominantBaseline="hanging">Missing asset</text>
                    </g>
                  );
                })}
            </svg>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
            <span>Pitch #{game.lastPitch.pitchNumber}</span>
            <span>{game.awayTeam} {game.scoreAway} - {game.scoreHome} {game.homeTeam}</span>
            <span>{game.half.toUpperCase()} {game.inning} · {game.balls}-{game.strikes} · {game.outs} out</span>
          </div>
        </div>
      )}
    </section>
  );
}
