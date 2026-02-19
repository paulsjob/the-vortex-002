const tabs = ['Dashboard', 'Design', 'Data Engine', 'Control Room', 'Output'];

const state = {
  activeTab: 'Dashboard',
  liveScore: 'Home 2 - Away 1',
  isStreaming: false,
};

const icons = {
  logos: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  fonts: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20 10 4l6 16"/><path d="M6 14h8"/></svg>',
  palette: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="10" r="1"/><path d="M12 16h.01"/></svg>',
  animation: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20"/><path d="m5 5 14 14M19 5 5 19"/></svg>',
};

const streamButton = document.getElementById('streamButton');
const tabsEl = document.getElementById('tabs');
const viewContainer = document.getElementById('viewContainer');

function setState(patch) {
  Object.assign(state, patch);
  render();
}

function renderTabs() {
  tabsEl.innerHTML = tabs
    .map((tab) => `<button class="tab-btn ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">${tab}</button>`)
    .join('');

  tabsEl.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => setState({ activeTab: btn.dataset.tab }));
  });
}

function dashboardView() {
  return `
    <section class="panel">
      <h3>Projects</h3>
      <div class="card-grid">
        <article class="card"><strong>Braves 2027 Pack</strong><p class="muted">Live Package · Ready for Air</p></article>
        <article class="card"><strong>Champions League RT</strong><p class="muted">Ticker + Stats + Lower Third</p></article>
        <article class="card"><strong>NLL Weekly Board</strong><p class="muted">Automated score ingest</p></article>
      </div>
    </section>
    <section class="panel">
      <h3>Global Asset Library</h3>
      <div class="asset-icons">
        <div class="asset">${icons.logos}<span>Logos</span></div>
        <div class="asset">${icons.fonts}<span>Fonts</span></div>
        <div class="asset">${icons.palette}<span>Palette</span></div>
        <div class="asset">${icons.animation}<span>Anim</span></div>
        <div class="asset">${icons.logos}<span>Bug</span></div>
        <div class="asset">${icons.fonts}<span>Templates</span></div>
      </div>
    </section>
  `;
}

function designView() {
  return `
    <section class="panel">
      <h3>Design Canvas · 16:9</h3>
      <div class="canvas"><div class="score-chip">${state.liveScore}</div></div>
    </section>
    <section class="panel">
      <h3>Graph Editor</h3>
      <div class="node-row">
        <div class="node">Score API</div>
        <div class="node">Logic Gate</div>
        <div class="node">Text Renderer</div>
      </div>
    </section>
  `;
}

function dataEngineView() {
  return `
    <section class="panel">
      <h3>Data Engine · Live Spreadsheet</h3>
      <table class="table">
        <thead><tr><th>KEY</th><th>SOURCE</th><th>VALUE</th></tr></thead>
        <tbody>
          <tr>
            <td>liveScore</td>
            <td>Google Sheet: Matchday</td>
            <td><input id="scoreInput" class="score-input" value="${state.liveScore}" /></td>
          </tr>
          <tr><td>clock</td><td>Score API</td><td>72:44</td></tr>
          <tr><td>period</td><td>Logic Node</td><td>2nd Half</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function controlRoomView() {
  const shots = ['Home Goal','Away Goal','Yellow Card','Red Card','Sub Home','Sub Away','Full Screen Stats','Lower Third','Corner Kick','VAR Check','Final Whistle','Replay Transition'];
  return `
    <section class="panel control-layout">
      <div>
        <h3>Shotbox</h3>
        <div class="shotbox">
          ${shots.map((s) => `<button class="shot">${s}</button>`).join('')}
        </div>
      </div>
      <div class="monitors">
        <div class="monitor preview"><h4>PREVIEW</h4><div class="monotext">${state.liveScore}</div></div>
        <div class="monitor program"><h4>PROGRAM</h4><div class="monotext">${state.liveScore}</div></div>
      </div>
    </section>
  `;
}

function outputView() {
  return `
    <section class="panel telemetry">
      <div class="fps-card">
        <h3>Performance Telemetry</h3>
        <div class="fps">${state.isStreaming ? '60 FPS' : '--'}</div>
        <div class="graph" style="opacity:${state.isStreaming ? '1' : '.25'}"></div>
      </div>
      <div>
        <h3>System Event Log</h3>
        <div class="log">
          ${state.isStreaming
            ? '[12:00:01] INFO: Renderless Engine Initialized\n[12:00:04] SUCCESS: NDI sink linked\n[12:00:07] INFO: Preview chain healthy\n[12:00:10] INFO: Frame rate stable at 60 FPS\n[12:00:13] SUCCESS: Program output live\n[12:00:14] INFO: Audio embed synchronized\n[12:00:16] INFO: GPU utilization nominal\n[12:00:19] SUCCESS: Stream active to destination A'
            : '[idle] Streaming disabled. Press "Push to Stream" to start output telemetry.'}
        </div>
      </div>
    </section>
  `;
}

function renderView() {
  switch (state.activeTab) {
    case 'Dashboard': return dashboardView();
    case 'Design': return designView();
    case 'Data Engine': return dataEngineView();
    case 'Control Room': return controlRoomView();
    case 'Output': return outputView();
    default: return dashboardView();
  }
}

function wireInteractions() {
  const input = document.getElementById('scoreInput');
  if (input) {
    input.addEventListener('input', (e) => setState({ liveScore: e.target.value }));
  }
}

function render() {
  renderTabs();
  viewContainer.innerHTML = renderView();
  streamButton.textContent = state.isStreaming ? 'Streaming Live' : 'Push to Stream';
  streamButton.classList.toggle('streaming', state.isStreaming);
  wireInteractions();
}

streamButton.addEventListener('click', () => setState({ isStreaming: !state.isStreaming, activeTab: 'Output' }));

render();
