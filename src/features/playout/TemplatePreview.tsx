import { useDataEngineStore } from '../../store/useDataEngineStore';
import type { SavedTemplate } from '../../store/useTemplateStore';
import { TemplateSceneSvg } from './TemplateSceneSvg';

interface Props {
  template: SavedTemplate | null;
  label: string;
  tone?: 'preview' | 'program';
}

export function TemplatePreview({ template, label, tone = 'preview' }: Props) {
  const game = useDataEngineStore((s) => s.game);
  const running = useDataEngineStore((s) => s.running);
  const isProgram = tone === 'program';
  const aspectRatio = template ? `${template.canvasWidth} / ${template.canvasHeight}` : '16 / 9';

  return (
    <section className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-semibold uppercase tracking-[0.2em] ${isProgram ? 'text-red-300' : 'text-blue-200'}`}>{label}</h4>
        <div className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider ${running ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-amber-600 bg-amber-900/30 text-amber-300'}`}>
          Data Engine {running ? 'Live' : 'Paused'}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {template ? (
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{template.name}</span>
            <span>{template.canvasWidth} × {template.canvasHeight}</span>
          </div>
        ) : (
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-300">No template loaded</span>
            <span>16 × 9</span>
          </div>
        )}
        <div className={`relative flex-1 overflow-hidden rounded-lg border ${isProgram ? 'border-red-600/70 bg-slate-950' : 'border-blue-600/40 bg-slate-950'}`}>
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-full" style={{ aspectRatio }} />
          </div>
          {!template ? (
            <div className={`absolute inset-0 grid place-items-center text-sm ${isProgram ? 'text-red-200' : 'text-slate-400'}`}>
              No template loaded.
            </div>
          ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#0f172a_25%,#111827_25%,#111827_50%,#0f172a_50%,#0f172a_75%,#111827_75%,#111827_100%)] bg-[length:18px_18px] opacity-70" />
            {template ? <div className="relative z-10 mx-auto w-full" style={{ aspectRatio }}><TemplateSceneSvg template={template} className="absolute inset-0 h-full w-full" /></div> : null}
            <div className={`absolute right-2 top-2 rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wider ${isProgram ? 'border-red-500 bg-red-900/60 text-red-100' : 'border-blue-500 bg-blue-900/45 text-blue-100'}`}>
              {isProgram ? 'LOCKED' : 'EDITABLE'}
            </div>
          </div>
        <div className="mt-1 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
          <span>Pitch #{game.lastPitch.pitchNumber}</span>
          <span>{game.awayTeam} {game.scoreAway} - {game.scoreHome} {game.homeTeam}</span>
          <span>{game.half.toUpperCase()} {game.inning} · {game.balls}-{game.strikes} · {game.outs} out</span>
        </div>
      </div>
    </section>
  );
}
