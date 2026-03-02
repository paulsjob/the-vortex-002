import { StatusBadge } from '../components/ui/StatusBadge';
import { buildNormalizedPayload, buildTeamMetrics } from '../features/simulation/derived';
import { requiredAdvancedMetrics, validateAdvancedMetrics } from '../features/simulation/advancedMetrics';
import { simulatorOptions } from '../features/simulation/registry';
import { Speed, useDataEngineStore } from '../store/useDataEngineStore';

const speedOptions: Array<{ label: string; value: Speed }> = [
  { label: 'Slow', value: 'slow' },
  { label: 'Normal', value: 'normal' },
  { label: 'Fast', value: 'fast' },
];

const clockLabel = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export function DataEngineRoute() {
  const { activeSport, game, history, consistency, running, speed, start, stop, reset, setSpeed, setSport, stepPitch, forceActions } = useDataEngineStore();

  const feeds = [
    { id: 'live-game', name: 'Live Game Feed', status: running ? 'connected' : 'disconnected' },
    { id: 'derived-stats', name: 'Derived Stats Feed', status: running ? 'connected' : 'disconnected' },
    { id: 'sponsor-catalog', name: 'Sponsor Catalog Feed (demo)', status: 'connected' },
  ] as const;


  const leaderCategories = Object.keys(game.teamLeaders?.home ?? {});

  const samplePayload = buildNormalizedPayload(game, 'demo-001');
  const teamMetrics = buildTeamMetrics(game);
  const missingAdvanced = running ? validateAdvancedMetrics(game) : [];
  const consistencyCode = missingAdvanced.length > 0
    ? `CONSISTENCY: FAIL (missing ${missingAdvanced.join(', ')})`
    : consistency.issues && consistency.issues.length > 0
      ? consistency.issues[0]
      : 'OK';
  const advancedOrder = requiredAdvancedMetrics[game.sport];

  return (
    <section className="grid h-full min-h-0 gap-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3">
        <h2 className="text-base font-semibold text-slate-100">Feeds</h2>
        <p className="mt-1 text-xs text-slate-400">Demo feed inventory</p>
        <div className="mt-3 space-y-2">
          {feeds.map((feed) => (
            <div key={feed.id} className="rounded border border-slate-700 bg-slate-900 p-2 text-sm">
              <p className="font-medium text-slate-100">{feed.name}</p>
              <p className="mt-1 text-xs text-slate-400">{feed.id}</p>
              <p className="mt-1 text-xs">Status: {feed.status}</p>
            </div>
          ))}
        </div>
      </aside>

      <section className="space-y-4 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="space-y-3 rounded border border-slate-700 bg-slate-900 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-100">Live Game Feed</h3>
            {running ? <StatusBadge tone="ready">CONNECTED</StatusBadge> : <StatusBadge tone="not-ready">DISCONNECTED</StatusBadge>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="mr-2 flex items-center gap-1 rounded border border-slate-700 bg-slate-950 p-1">
              {simulatorOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSport(option.key)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    activeSport === option.key ? 'bg-cyan-700 text-cyan-100' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={start}
              disabled={running}
              className="rounded border border-emerald-700 bg-emerald-900/40 px-3 py-1.5 font-medium text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start
            </button>
            <button
              type="button"
              onClick={stop}
              disabled={!running}
              className="rounded border border-amber-700 bg-amber-900/30 px-3 py-1.5 font-medium text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 font-medium text-slate-200"
            >
              Restart
            </button>
            <div className="ml-2 flex items-center gap-1 rounded border border-slate-700 bg-slate-950 p-1">
              {speedOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSpeed(option.value)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    speed === option.value ? 'bg-indigo-700 text-indigo-100' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => stepPitch()}
              disabled={running}
              className="rounded border border-indigo-700 bg-indigo-900/40 px-3 py-1.5 font-medium text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Step
            </button>

            {forceActions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {forceActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => stepPitch(action)}
                    disabled={running}
                    className="rounded border border-fuchsia-700 bg-fuchsia-900/30 px-2 py-1 text-xs font-medium text-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Force {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Game Snapshot</p>
            <p className="font-semibold text-slate-100">
              {game.awayTeam} {game.scoreAway} - {game.homeTeam} {game.scoreHome}
            </p>
            <p className="mt-1 text-xs text-slate-300">{game.periodLabel} · {clockLabel(game.clockSeconds)}</p>
            <p className="mt-1 text-xs text-slate-500">{game.lastEvent}</p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Endpoints</p>
            <p>GET /api/feed/live-game</p>
            <p>GET /api/endpoints/derived-stats</p>
            <p>GET /api/endpoints/normalized-scorebug</p>
          </div>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Key Stats</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {game.keyStats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">
                <p className="text-slate-400">{stat.label}</p>
                <p
                  className={`font-medium ${
                    stat.emphasis === 'high' ? 'text-amber-200' : stat.emphasis === 'med' ? 'text-cyan-200' : 'text-slate-100'
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Consistency</p>
          <p className={`text-sm ${consistencyCode === 'OK' ? 'text-emerald-300' : 'text-amber-200'}`}>{consistencyCode}</p>
          {(missingAdvanced.length > 0 || (consistency.issues ?? []).length > 0) && (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-200">
              {missingAdvanced.map((issue) => <li key={issue}>missing {issue}</li>)}
              {(consistency.issues ?? []).map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          )}
        </div>


        <div className="grid gap-3 md:grid-cols-2"> 
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Team Leaders</p>
            {leaderCategories.map((cat) => (
              <p key={cat} className="text-xs text-slate-200">{cat}: {game.homeTeam} {game.teamLeaders?.home?.[cat]?.player} ({game.teamLeaders?.home?.[cat]?.value}) · {game.awayTeam} {game.teamLeaders?.away?.[cat]?.player} ({game.teamLeaders?.away?.[cat]?.value})</p>
            ))}
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Game Leaders</p>
            {leaderCategories.map((cat) => (
              <p key={cat} className="text-xs text-slate-200">{cat}: {(game.gameLeaders?.[cat] ?? []).map((entry) => `${entry.player} ${entry.value}`).join(', ')}</p>
            ))}
          </div>
        </div>


        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Team Metrics</p>
          <div className="space-y-1 text-xs">
            {teamMetrics.map((metric) => (
              <p key={metric.label} className="text-slate-200">
                {metric.label}: {game.homeTeam} {metric.home} · {game.awayTeam} {metric.away}
              </p>
            ))}
          </div>
        </div>


        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Advanced Metrics</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {advancedOrder.map((name) => (
              <div key={name} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">
                <p className="text-slate-400">{name}</p>
                <p className="font-medium text-cyan-200">{(game.advancedMetrics as unknown as Record<string, number>)[name]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Sample Payload Preview</p>
          <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">{JSON.stringify(samplePayload, null, 2)}</pre>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Recent Simulation Events</p>
          <div className="space-y-1 text-sm text-slate-200">
            {history.slice(0, 8).map((event) => (
              <p key={event.id} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
                {event.periodLabel} {event.clockLabel} · {event.summary} ({game.awayTeam} {event.scoreAway}-{event.scoreHome} {game.homeTeam})
              </p>
            ))}
            {history.length === 0 && <p className="text-slate-400">No events yet.</p>}
          </div>
        </div>
      </section>
    </section>
  );
}
