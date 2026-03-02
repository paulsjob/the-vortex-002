import { StudioSidebar } from './components/Sidebar/StudioSidebar';
import { StageCanvas } from './components/Canvas/StageCanvas';
import { PropertiesInspector } from './components/Inspector/PropertiesInspector';

export function Workspace() {
  return (
    <section className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      <StudioSidebar />
      <StageCanvas />
      <PropertiesInspector />
    </section>
  );
}
