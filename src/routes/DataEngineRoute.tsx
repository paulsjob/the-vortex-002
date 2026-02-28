import { useDataEngineStore } from '../store/useDataEngineStore';
import { StatusBadge } from '../components/ui/StatusBadge';

export function DataEngineRoute() {
  const { game, history, running, speed, start, stop, reset, setSpeed, stepPitch } = useDataEngineStore();

  return (
    <section className="space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-100">Data Engine</h2>
          {running ? <StatusBadge tone="ready">READY</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button className="rounded border border-blue-600 bg-blue-700 px-3 py-2 text-sm font-semibold hover:bg-blue-600" onClick={running ? stop : start}>{running ? 'Pause' : 'Start'}</button>
          <button className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600" onClick={stepPitch}>Poll Feed</button>
          <button className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600" onClick={reset}>Reset</button>
          <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={speed} onChange={(e) => setSpeed(e.target.value as 'slow' | 'normal' | 'fast')}>
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Feed Configuration</p>
            <p className="font-semibold text-slate-100">{game.awayTeam} {game.scoreAway} - {game.homeTeam} {game.scoreHome}</p>
            <p>Polling mode: {running ? 'Live' : 'Paused'}</p>
            <p>Rate profile: {speed}</p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Endpoint</p>
            <p>GET /api/feed/live-game</p>
            <p>POST /api/endpoint/template-bindings</p>
            <p>Health: {running ? 'Healthy' : 'Standby'}</p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Mapping + Validation</p>
            <p>Pitcher: {game.pitcher}</p>
            <p>Batter: {game.batter}</p>
            <p>Last payload: {game.lastPitch.result}</p>
            <p>{history.length ? 'Validation passing' : 'No data yet'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">Mock Dataset Feed</h3>
        <div className="space-y-2">
          {history.slice(0, 12).map((pitch) => (
            <div key={pitch.pitchNumber} className="rounded border border-slate-700 bg-slate-900 p-2 text-sm">
              #{pitch.pitchNumber} · {pitch.result} · {pitch.pitchType} {pitch.velocityMph}mph @ {pitch.location}
            </div>
          ))}
          {!history.length && <p className="text-sm text-slate-500">No pitches yet.</p>}
        </div>
      </section>
    </section>
  );
}
