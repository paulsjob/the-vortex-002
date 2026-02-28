import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { DashboardRoute } from './DashboardRoute';
import { DesignRoute } from './DesignRoute';
import { DataEngineRoute } from './DataEngineRoute';
import { ControlRoomRoute } from './ControlRoomRoute';
import { OutputRoute } from './OutputRoute';
import { PublicTemplateRoute } from './PublicTemplateRoute';
import { PublicOutputRoute } from './PublicOutputRoute';
import { usePlayoutStore } from '../store/usePlayoutStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useTemplateStore } from '../store/useTemplateStore';
import { useDemoSessionStore } from '../store/useDemoSessionStore';

const tabs = [
  { to: '/', label: 'Dashboard' },
  { to: '/design', label: 'Design' },
  { to: '/data-engine', label: 'Data Engine' },
  { to: '/control-room', label: 'Control Room' },
  { to: '/output', label: 'Output' },
];

export function AppRoutes() {
  const previewTemplate = usePlayoutStore((s) => s.previewTemplate);
  const takeToProgram = usePlayoutStore((s) => s.takeToProgram);
  const setPreviewTemplate = usePlayoutStore((s) => s.setPreviewTemplate);

  const templateStore = useTemplateStore();
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);
  const initializeSession = useDemoSessionStore((s) => s.initializeSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (selectedTemplate) return;
    const firstTemplate = templateStore.listAllTemplates()[0];
    if (!firstTemplate) return;
    selectTemplate({ source: firstTemplate.source, id: firstTemplate.id });
  }, [selectedTemplate, templateStore, selectTemplate]);

  useEffect(() => {
    if (previewTemplate) return;
    const firstNative = templateStore.templates[0];
    if (!firstNative) return;
    setPreviewTemplate(firstNative);
  }, [previewTemplate, templateStore.templates, setPreviewTemplate]);

  const location = useLocation();
  const isPublicTemplateFeed = location.pathname.startsWith('/template-feed/');
  const isPublicOutputFeed = location.pathname.startsWith('/output-feed');
  const isOutputRoute = location.pathname === '/output';

  if (isPublicTemplateFeed || isPublicOutputFeed) {
    return (
      <Routes>
        <Route path="/template-feed/:templateId" element={<PublicTemplateRoute />} />
        <Route path="/output-feed" element={<PublicOutputRoute />} />
      </Routes>
    );
  }

  if (isOutputRoute) {
    return (
      <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
        <Routes>
          <Route path="/output" element={<OutputRoute />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-wide text-slate-100">Renderless</h1>
          <div className="flex items-center gap-4">
            <nav className="flex gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2">
              {tabs.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-blue-700 text-blue-50' : 'text-slate-300 hover:bg-slate-800'}`}>
                  {tab.label}
                </NavLink>
              ))}
            </nav>
            <StatusBadge tone="ready">READY</StatusBadge>
            <button
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              onClick={takeToProgram}
              disabled={!previewTemplate}
              title={previewTemplate ? `Take ${previewTemplate.name} to Output` : 'Load a template in Control Room first'}
            >
              TAKE
            </button>
          </div>
        </div>
      </header>
      <main className="p-6">
        <Routes>
          <Route path="/" element={<DashboardRoute />} />
          <Route path="/design" element={<DesignRoute />} />
          <Route path="/data-engine" element={<DataEngineRoute />} />
          <Route path="/control-room" element={<ControlRoomRoute />} />
          <Route path="/output" element={<OutputRoute />} />
          <Route path="/template-feed/:templateId" element={<PublicTemplateRoute />} />
          <Route path="/output-feed" element={<PublicOutputRoute />} />
          <Route path="*" element={<div className="grid h-screen place-items-center text-sm text-slate-400">Route not found.</div>} />
        </Routes>
      </main>
    </div>
  );
}
