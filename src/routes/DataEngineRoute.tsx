import { useDataEngineStore } from '../store/useDataEngineStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useDemoSessionStore, type DemoStat } from '../store/useDemoSessionStore';

const players = ['A. Jones', 'B. Cruz', 'C. Watts', 'J. Cole', 'K. Ford', 'L. Pope'];
const statOptions: DemoStat[] = ['pitch.velocity', 'pitch.type', 'bat.exitvelo', 'score.home'];

export function DataEngineRoute() {
  const { game, history, running, speed, start, stop, reset, setSpeed, stepPitch } = useDataEngineStore();
  const selectedPlayer = useDemoSessionStore((s) => s.selectedPlayer);
  const selectedStat = useDemoSessionStore((s) => s.selectedStat);
  const selectedSponsor = useDemoSessionStore((s) => s.selectedSponsor);
  const sponsorChoices = useDemoSessionStore((s) => s.sponsorChoices);
  const updateSelections = useDemoSessionStore((s) => s.updateSelections);

  return (
    <section className="space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-100">Data Engine</h2>
          {running ? <StatusBadge tone="ready">READY</StatusBadge> : <StatusBadge tone="not-ready">NOT READY</StatusBadge>}
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button className="rounded border border-blue-600 bg-blue-700 px-3 py-2 text-sm font-semibold hover:bg-blue-600" onClick={running ? stop : start}>{running ? 'Pause' : 'Start'}</button>
          <button className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600" onClick={stepPitch}>Step Pitch</button>
          <button className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600" onClick={reset}>Reset</button>
          <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={speed} onChange={(e) => setSpeed(e.target.value as 'slow' | 'normal' | 'fast')}>
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
          <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={selectedPlayer} onChange={(e) => updateSelections({ player: e.target.value })}>
            {players.map((player) => <option key={player} value={player}>{player}</option>)}
          </select>
          <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={selectedStat} onChange={(e) => updateSelections({ stat: e.target.value as DemoStat })}>
            {statOptions.map((stat) => <option key={stat} value={stat}>{stat}</option>)}
          </select>
          <select className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={selectedSponsor} onChange={(e) => updateSelections({ sponsor: e.target.value })}>
            {sponsorChoices.map((sponsor) => <option key={sponsor} value={sponsor}>{sponsor}</option>)}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Game</p>
            <p className="font-semibold text-slate-100">{game.awayTeam} {game.scoreAway} - {game.homeTeam} {game.scoreHome}</p>
            <p>Inning {game.half === 'top' ? 'TOP' : 'BOTTOM'} {game.inning}</p>
            <p>Count {game.balls}-{game.strikes} · Outs {game.outs}</p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Matchup</p>
            <p>Pitcher: {game.pitcher}</p>
            <p>Batter: {game.batter}</p>
            <p>Selected Player: {selectedPlayer}</p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <p className="text-slate-400">Demo State</p>
            <p>Stat: {selectedStat}</p>
            <p>Sponsor: {selectedSponsor}</p>
            <p>{game.lastPitch.result}</p>
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
