import { useDataEngineStore } from '../store/useDataEngineStore';
import { StatusBadge } from '../components/ui/StatusBadge';

export function DataEngineRoute() {
  const { game, history, running } = useDataEngineStore();

  const feeds = [
    { id: 'live-game', name: 'Live Game Feed', status: running ? 'connected' : 'disconnected' },
    { id: 'derived-stats', name: 'Derived Stats Feed', status: running ? 'connected' : 'disconnected' },
    { id: 'sponsor-catalog', name: 'Sponsor Catalog Feed (demo)', status: 'connected' },
  ] as const;

  const samplePayload = {
    gameId: 'demo-001',
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    score: { home: game.scoreHome, away: game.scoreAway },
    pitcher: game.pitcher,
    batter: game.batter,
    lastPitch: game.lastPitch,
    updatedAt: new Date().toISOString(),
  };

  return (
    <section className="grid h-[calc(100vh-11.5rem)] min-h-[560px] gap-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-700 bg-slate-950 p-3">
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
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-100">Live Game Feed</h3>
          {running ? <StatusBadge tone="ready">CONNECTED</StatusBadge> : <StatusBadge tone="not-ready">DISCONNECTED</StatusBadge>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Last Update</p>
            <p className="font-semibold text-slate-100">{history[0] ? `Pitch #${history[0].pitchNumber}` : 'No data yet'}</p>
            <p className="mt-1 text-xs text-slate-500">{new Date().toLocaleTimeString()}</p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Endpoints</p>
            <p>GET /api/feed/live-game</p>
            <p>GET /api/endpoints/derived-stats</p>
            <p>GET /api/endpoints/normalized-scorebug</p>
          </div>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Sample Payload Preview</p>
          <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">{JSON.stringify(samplePayload, null, 2)}</pre>
        </div>

        <div className="rounded border border-slate-700 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">Available Fields</p>
          <div className="grid gap-1 text-sm text-slate-200 md:grid-cols-2">
            {['score.home', 'score.away', 'pitch.velocity', 'pitch.location', 'matchup.pitcher', 'matchup.batter', 'inning.number', 'inning.state'].map((field) => (
              <span key={field} className="rounded border border-slate-700 bg-slate-950 px-2 py-1">{field}</span>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
