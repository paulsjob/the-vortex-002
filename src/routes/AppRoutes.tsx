import { NavLink, Route, Routes } from 'react-router-dom';
import { DashboardRoute } from './DashboardRoute';
import { StudioRoute } from './StudioRoute';

const tabs = [
  { to: '/', label: 'Dashboard' },
  { to: '/studio', label: 'Design Studio' },
];

export function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide text-blue-300">RenderLess</h1>
          <nav className="flex gap-2">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-blue-700 text-blue-50' : 'text-slate-300 hover:bg-slate-800'}`}>
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        <Routes>
          <Route path="/" element={<DashboardRoute />} />
          <Route path="/studio" element={<StudioRoute />} />
        </Routes>
      </main>
    </div>
  );
}
