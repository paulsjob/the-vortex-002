const tabs = ['Dashboard', 'Design', 'Data Engine', 'Control Room', 'Output'];

const supportedDimensions = ['1920x1080', '1080x1920', '1080x1080', '1080x1350'];

const mlbSimulationFeed = [
  { inning: 'Top 1', battingTeam: 'NYY', runsScored: 2, scoreAfter: 'BOS 0 - NYY 2', summary: 'Leadoff double sparks a quick two-run rally.' },
  { inning: 'Bottom 1', battingTeam: 'BOS', runsScored: 3, scoreAfter: 'BOS 3 - NYY 2', summary: 'Devers clears the bases with a three-run blast.' },
  { inning: 'Top 2', battingTeam: 'NYY', runsScored: 1, scoreAfter: 'BOS 3 - NYY 3', summary: 'Soto ropes an RBI single to tie it.' },
  { inning: 'Bottom 2', battingTeam: 'BOS', runsScored: 2, scoreAfter: 'BOS 5 - NYY 3', summary: 'Back-to-back doubles put Boston back in front.' },
  { inning: 'Top 3', battingTeam: 'NYY', runsScored: 3, scoreAfter: 'BOS 5 - NYY 6', summary: 'Judge launches a no-doubt three-run homer.' },
  { inning: 'Bottom 3', battingTeam: 'BOS', runsScored: 4, scoreAfter: 'BOS 9 - NYY 6', summary: 'Boston answers with a four-spot and loud Fenway crowd.' },
  { inning: 'Top 4', battingTeam: 'NYY', runsScored: 1, scoreAfter: 'BOS 9 - NYY 7', summary: 'Ground-rule double plates one for New York.' },
  { inning: 'Bottom 4', battingTeam: 'BOS', runsScored: 0, scoreAfter: 'BOS 9 - NYY 7', summary: 'Quick 1-2-3 inning from the Yankees bullpen.' },
  { inning: 'Top 5', battingTeam: 'NYY', runsScored: 2, scoreAfter: 'BOS 9 - NYY 9', summary: 'Rizzo lines a two-run single to tie game again.' },
  { inning: 'Bottom 5', battingTeam: 'BOS', runsScored: 1, scoreAfter: 'BOS 10 - NYY 9', summary: 'Sac fly gives Boston the edge.' },
  { inning: 'Top 6', battingTeam: 'NYY', runsScored: 0, scoreAfter: 'BOS 10 - NYY 9', summary: 'Boston reliever strands two runners.' },
  { inning: 'Bottom 6', battingTeam: 'BOS', runsScored: 2, scoreAfter: 'BOS 12 - NYY 9', summary: 'Two-run single extends Sox lead to three.' },
  { inning: 'Top 7', battingTeam: 'NYY', runsScored: 2, scoreAfter: 'BOS 12 - NYY 11', summary: 'Torres homers to left and closes the gap.' },
  { inning: 'Bottom 7', battingTeam: 'BOS', runsScored: 1, scoreAfter: 'BOS 13 - NYY 11', summary: 'Duran scores on an infield chopper.' },
  { inning: 'Top 8', battingTeam: 'NYY', runsScored: 1, scoreAfter: 'BOS 13 - NYY 12', summary: 'Volpe RBI single makes it a one-run game.' },
  { inning: 'Bottom 8', battingTeam: 'BOS', runsScored: 2, scoreAfter: 'BOS 15 - NYY 12', summary: 'Two insurance runs on a gapper and a sac fly.' },
  { inning: 'Top 9', battingTeam: 'NYY', runsScored: 0, scoreAfter: 'BOS 15 - NYY 12', summary: 'Boston closer fans two to end a wild classic.' },
  { inning: 'Bottom 9', battingTeam: 'BOS', runsScored: 0, scoreAfter: 'BOS 15 - NYY 12', summary: 'Ballgame final: Red Sox 15, Yankees 12.' },
];

const state = {
  activeTab: 'Dashboard',
  liveScore: 'BOS 0 - NYY 0',
  isStreaming: false,
  brandedAssetsOpen: true,
  brandedAssetsFolderFilter: 'All folders',
  brandedAssetsDimensionFilter: 'All dimensions',
  brandedAssetsSort: 'newest',
  brandedAssetsView: 'list',
  brandedAssets: [
    {
      id: 1,
      name: 'red-sox-scorebug-1920x1080.png',
      folder: 'Scorebugs',
      dimension: '1920x1080',
      createdAt: new Date('2026-01-10T09:10:00').toISOString(),
      src: 'https://dummyimage.com/320x180/0f172a/93c5fd.png&text=Scorebug+16:9',
    },
    {
      id: 2,
      name: 'yankees-story-1080x1920.png',
      folder: 'Social Stories',
      dimension: '1080x1920',
      createdAt: new Date('2026-01-14T12:45:00').toISOString(),
      src: 'https://dummyimage.com/200x360/111827/86efac.png&text=Story+9:16',
    },
    {
      id: 3,
      name: 'postgame-square-1080x1080.png',
      folder: 'Social Square',
      dimension: '1080x1080',
      createdAt: new Date('2026-01-16T18:25:00').toISOString(),
      src: 'https://dummyimage.com/300x300/1e293b/fca5a5.png&text=Square+1:1',
    },
    {
      id: 4,
      name: 'lineup-feed-1080x1350.png',
      folder: 'Social Feed',
      dimension: '1080x1350',
      createdAt: new Date('2026-01-18T08:00:00').toISOString(),
      src: 'https://dummyimage.com/280x350/172554/bae6fd.png&text=Feed+4:5',
    },
  ],
  brandedFolders: ['General', 'Scorebugs', 'Social Stories', 'Social Square', 'Social Feed'],
  designSelectedAssetId: 1,
  designTextLayers: [
    { id: 1, name: 'Headline', text: 'Final Score Update', x: 16, y: 16, size: 42, color: '#ffffff', bindKey: 'none' },
    { id: 2, name: 'Subhead', text: 'Fenway Thriller', x: 16, y: 72, size: 24, color: '#bfdbfe', bindKey: 'lastEvent' },
  ],
  simulationRunning: false,
  simulationSpeedMs: 1300,
  simulationIndex: -1,
  gameState: {
    matchup: 'Red Sox vs Yankees',
    inning: 'Pregame',
    outs: 0,
    baseState: 'Bases Empty',
    score: { BOS: 0, NYY: 0 },
    hits: { BOS: 0, NYY: 0 },
    errors: { BOS: 0, NYY: 0 },
    lastEvent: 'Waiting to start MLB simulation.',
  },
};

let simulationTimer = null;

const icons = {
  logos: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  fonts: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20 10 4l6 16"/><path d="M6 14h8"/></svg>',
  palette: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="10" r="1"/><path d="M12 16h.01"/></svg>',
  animation: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20"/><path d="m5 5 14 14M19 5 5 19"/></svg>',
  branded: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h7"/></svg>',
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

function getAssetById(id) {
  return state.brandedAssets.find((asset) => asset.id === Number(id));
}

function getFilteredAndSortedAssets() {
  const filtered = state.brandedAssets.filter((asset) => {
    const folderMatch = state.brandedAssetsFolderFilter === 'All folders' || asset.folder === state.brandedAssetsFolderFilter;
    const dimensionMatch = state.brandedAssetsDimensionFilter === 'All dimensions' || asset.dimension === state.brandedAssetsDimensionFilter;
    return folderMatch && dimensionMatch;
  });

  return filtered.sort((a, b) => {
    if (state.brandedAssetsSort === 'name-asc') return a.name.localeCompare(b.name);
    if (state.brandedAssetsSort === 'name-desc') return b.name.localeCompare(a.name);
    if (state.brandedAssetsSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (state.brandedAssetsSort === 'dimension') return a.dimension.localeCompare(b.dimension);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function brandedAssetsRows(assets) {
  return assets
    .map(
      (asset) => `
        <button class="brand-list-row" data-asset-id="${asset.id}">
          <span class="cell name">${asset.name}</span>
          <span class="cell folder">${asset.folder}</span>
          <span class="cell dim">${asset.dimension}</span>
          <span class="cell date">${new Date(asset.createdAt).toLocaleDateString()}</span>
        </button>
      `,
    )
    .join('');
}

function brandedAssetsGrid(assets) {
  return assets
    .map(
      (asset) => `
      <article class="brand-asset-card" data-asset-id="${asset.id}">
        <img src="${asset.src}" alt="${asset.name}" />
        <div>
          <strong>${asset.name}</strong>
          <p class="muted">${asset.folder} · ${asset.dimension}</p>
        </div>
      </article>
    `,
    )
    .join('');
}

function brandedAssetsManager() {
  const assets = getFilteredAndSortedAssets();

  return `
    <div class="brand-manager ${state.brandedAssetsOpen ? 'open' : ''}">
      <div class="brand-manager-header">
        <h4>Branded Assets Locker</h4>
        <p class="muted">PNG upload, dimension-aware organization, fast list view, and one-click insertion into Design.</p>
      </div>
      <div class="brand-controls">
        <label class="control-group">Upload PNG
          <input id="brandAssetUpload" type="file" accept="image/png" multiple />
        </label>
        <label class="control-group">Folder
          <select id="brandFolderFilter">
            <option value="All folders" ${state.brandedAssetsFolderFilter === 'All folders' ? 'selected' : ''}>All folders</option>
            ${state.brandedFolders.map((folder) => `<option value="${folder}" ${state.brandedAssetsFolderFilter === folder ? 'selected' : ''}>${folder}</option>`).join('')}
          </select>
        </label>
        <label class="control-group">Dimension
          <select id="brandDimensionFilter">
            <option value="All dimensions" ${state.brandedAssetsDimensionFilter === 'All dimensions' ? 'selected' : ''}>All dimensions</option>
            ${supportedDimensions.map((dimension) => `<option value="${dimension}" ${state.brandedAssetsDimensionFilter === dimension ? 'selected' : ''}>${dimension}</option>`).join('')}
          </select>
        </label>
        <label class="control-group">Sort
          <select id="brandAssetSort">
            <option value="newest" ${state.brandedAssetsSort === 'newest' ? 'selected' : ''}>Newest first</option>
            <option value="oldest" ${state.brandedAssetsSort === 'oldest' ? 'selected' : ''}>Oldest first</option>
            <option value="name-asc" ${state.brandedAssetsSort === 'name-asc' ? 'selected' : ''}>Name A-Z</option>
            <option value="name-desc" ${state.brandedAssetsSort === 'name-desc' ? 'selected' : ''}>Name Z-A</option>
            <option value="dimension" ${state.brandedAssetsSort === 'dimension' ? 'selected' : ''}>Dimension</option>
          </select>
        </label>
        <form id="brandFolderForm" class="folder-form">
          <input id="brandFolderInput" placeholder="New folder name" maxlength="24" />
          <button type="submit">Create Folder</button>
        </form>
        <label class="control-group">Upload Dimension
          <select id="brandUploadDimension">
            ${supportedDimensions.map((dimension) => `<option value="${dimension}">${dimension}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="view-mode-row">
        <button id="brandListView" class="pill-btn ${state.brandedAssetsView === 'list' ? 'active' : ''}">List View</button>
        <button id="brandGridView" class="pill-btn ${state.brandedAssetsView === 'grid' ? 'active' : ''}">Grid View</button>
      </div>
      <div class="brand-assets-wrap ${state.brandedAssetsView}">
        ${assets.length
          ? state.brandedAssetsView === 'list'
            ? `<div class="brand-list-header"><span>Name</span><span>Folder</span><span>Dimension</span><span>Date Added</span></div>${brandedAssetsRows(assets)}`
            : brandedAssetsGrid(assets)
          : '<p class="muted">No assets found for this filter.</p>'}
      </div>
    </div>
  `;
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
      <div class="asset-header">
        <h3>Global Asset Library</h3>
        <button id="toggleBrandedAssets" class="utility-btn">Branded Assets</button>
      </div>
      <div class="asset-icons">
        <button id="toggleBrandedAssets" class="asset asset-btn ${state.brandedAssetsOpen ? 'active' : ''}">${icons.branded}<span>Branded Assets</span></button>
        <div class="asset">${icons.logos}<span>Logos</span></div>
        <div class="asset">${icons.fonts}<span>Fonts</span></div>
        <div class="asset">${icons.palette}<span>Palette</span></div>
        <div class="asset">${icons.animation}<span>Anim</span></div>
        <div class="asset">${icons.logos}<span>Bug</span></div>
        <div class="asset">${icons.fonts}<span>Templates</span></div>
      </div>
      ${brandedAssetsManager()}
    </section>
  `;
}

function getBoundText(layer) {
  if (layer.bindKey === 'none') return layer.text;
  if (layer.bindKey === 'score') return `Score: BOS ${state.gameState.score.BOS} - NYY ${state.gameState.score.NYY}`;
  if (layer.bindKey === 'inning') return `Inning: ${state.gameState.inning}`;
  if (layer.bindKey === 'lastEvent') return state.gameState.lastEvent;
  return layer.text;
}

function designView() {
  const selectedAsset = getAssetById(state.designSelectedAssetId) || state.brandedAssets[0];

  return `
    <section class="panel design-layout">
      <div>
        <h3>Design Canvas · Linked Branded Asset</h3>
        <div class="canvas design-canvas">
          ${selectedAsset ? `<img src="${selectedAsset.src}" alt="${selectedAsset.name}" class="canvas-bg" />` : ''}
          ${state.designTextLayers
            .map(
              (layer) => `<span class="text-layer" style="left:${layer.x}px;top:${layer.y}px;font-size:${layer.size}px;color:${layer.color};">${getBoundText(layer)}</span>`,
            )
            .join('')}
        </div>
      </div>
      <aside class="design-sidebar">
        <div class="panel mini-panel">
          <h3>Branded Assets Locker</h3>
          <div class="design-asset-list">
            ${state.brandedAssets
              .map(
                (asset) => `<button class="design-asset-item ${state.designSelectedAssetId === asset.id ? 'active' : ''}" data-design-asset-id="${asset.id}">${asset.name}<span>${asset.dimension}</span></button>`,
              )
              .join('')}
          </div>
        </div>
        <div class="panel mini-panel">
          <h3>Text Layers & Data Bind</h3>
          <div class="layer-controls">
            ${state.designTextLayers
              .map(
                (layer) => `
                  <div class="layer-card">
                    <strong>${layer.name}</strong>
                    <input data-layer-id="${layer.id}" data-prop="text" value="${layer.text}" />
                    <div class="layer-row">
                      <input type="number" data-layer-id="${layer.id}" data-prop="x" value="${layer.x}" />
                      <input type="number" data-layer-id="${layer.id}" data-prop="y" value="${layer.y}" />
                      <input type="number" data-layer-id="${layer.id}" data-prop="size" value="${layer.size}" />
                      <input type="color" data-layer-id="${layer.id}" data-prop="color" value="${layer.color}" />
                    </div>
                    <select data-layer-id="${layer.id}" data-prop="bindKey">
                      <option value="none" ${layer.bindKey === 'none' ? 'selected' : ''}>Manual</option>
                      <option value="score" ${layer.bindKey === 'score' ? 'selected' : ''}>Bind Score</option>
                      <option value="inning" ${layer.bindKey === 'inning' ? 'selected' : ''}>Bind Inning</option>
                      <option value="lastEvent" ${layer.bindKey === 'lastEvent' ? 'selected' : ''}>Bind Last Event</option>
                    </select>
                  </div>
                `,
              )
              .join('')}
          </div>
        </div>
      </aside>
    </section>
  `;
}

function dataEngineView() {
  return `
    <section class="panel">
      <h3>Data Simulation Engine · MLB Live Feed</h3>
      <div class="sim-toolbar">
        <button id="toggleSimulation" class="utility-btn ${state.simulationRunning ? 'sim-on' : ''}">${state.simulationRunning ? 'Stop Simulation' : 'Start Simulation'}</button>
        <label class="control-group">Speed
          <select id="simulationSpeed">
            <option value="1800" ${state.simulationSpeedMs === 1800 ? 'selected' : ''}>Slow</option>
            <option value="1300" ${state.simulationSpeedMs === 1300 ? 'selected' : ''}>Normal</option>
            <option value="700" ${state.simulationSpeedMs === 700 ? 'selected' : ''}>Fast</option>
          </select>
        </label>
        <button id="resetSimulation" class="pill-btn">Reset Game</button>
      </div>
      <table class="table">
        <thead><tr><th>KEY</th><th>SOURCE</th><th>VALUE</th></tr></thead>
        <tbody>
          <tr><td>matchup</td><td>MLB Simulator</td><td>${state.gameState.matchup}</td></tr>
          <tr><td>inning</td><td>MLB Simulator</td><td>${state.gameState.inning}</td></tr>
          <tr><td>score</td><td>MLB Simulator</td><td>BOS ${state.gameState.score.BOS} - NYY ${state.gameState.score.NYY}</td></tr>
          <tr><td>hits</td><td>MLB Simulator</td><td>BOS ${state.gameState.hits.BOS} / NYY ${state.gameState.hits.NYY}</td></tr>
          <tr><td>lastEvent</td><td>MLB Simulator</td><td>${state.gameState.lastEvent}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="panel">
      <h3>Full 9-Inning Game Feed (15-12 Red Sox)</h3>
      <div class="sim-feed">
        ${mlbSimulationFeed
          .map(
            (play, index) => `<div class="feed-row ${index === state.simulationIndex ? 'active' : ''}"><strong>${play.inning}</strong><span>${play.summary}</span><em>${play.scoreAfter}</em></div>`,
          )
          .join('')}
      </div>
    </section>
  `;
}

function controlRoomView() {
  const shots = ['Home Goal', 'Away Goal', 'Yellow Card', 'Red Card', 'Sub Home', 'Sub Away', 'Full Screen Stats', 'Lower Third', 'Corner Kick', 'VAR Check', 'Final Whistle', 'Replay Transition'];
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
    case 'Dashboard':
      return dashboardView();
    case 'Design':
      return designView();
    case 'Data Engine':
      return dataEngineView();
    case 'Control Room':
      return controlRoomView();
    case 'Output':
      return outputView();
    default:
      return dashboardView();
  }
}

function deriveHits(feedIndex) {
  const bosHits = 7 + Math.floor(feedIndex * 0.7);
  const nyyHits = 6 + Math.floor(feedIndex * 0.65);
  return { BOS: bosHits, NYY: nyyHits };
}

function runSimulationStep() {
  const nextIndex = state.simulationIndex + 1;
  if (nextIndex >= mlbSimulationFeed.length) {
    stopSimulation();
    return;
  }

  const play = mlbSimulationFeed[nextIndex];
  const [, bosScoreRaw, nyyScoreRaw] = play.scoreAfter.match(/BOS\s(\d+)\s-\sNYY\s(\d+)/) || [];
  const bosScore = Number(bosScoreRaw || 0);
  const nyyScore = Number(nyyScoreRaw || 0);

  setState({
    simulationIndex: nextIndex,
    liveScore: `BOS ${bosScore} - NYY ${nyyScore}`,
    gameState: {
      ...state.gameState,
      inning: play.inning,
      score: { BOS: bosScore, NYY: nyyScore },
      hits: deriveHits(nextIndex),
      lastEvent: play.summary,
      outs: nextIndex % 3,
      baseState: play.runsScored ? 'Runners advanced' : 'Bases Empty',
    },
  });
}

function startSimulation() {
  if (simulationTimer) return;

  setState({ simulationRunning: true });
  simulationTimer = setInterval(runSimulationStep, state.simulationSpeedMs);
}

function stopSimulation() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }

  if (state.simulationRunning) {
    setState({ simulationRunning: false });
  }
}

function resetSimulation() {
  stopSimulation();
  setState({
    simulationIndex: -1,
    liveScore: 'BOS 0 - NYY 0',
    gameState: {
      ...state.gameState,
      inning: 'Pregame',
      score: { BOS: 0, NYY: 0 },
      hits: { BOS: 0, NYY: 0 },
      lastEvent: 'Simulation reset. Ready to start.',
      outs: 0,
      baseState: 'Bases Empty',
    },
  });
}

function updateLayer(layerId, prop, value) {
  const castValue = prop === 'x' || prop === 'y' || prop === 'size' ? Number(value) : value;
  const layers = state.designTextLayers.map((layer) => (layer.id === Number(layerId) ? { ...layer, [prop]: castValue } : layer));
  setState({ designTextLayers: layers });
}

function guessDimensionFromFileName(name) {
  const lowerName = name.toLowerCase();
  const matched = supportedDimensions.find((dimension) => lowerName.includes(dimension));
  return matched || '1920x1080';
}

function wireBrandedAssetInteractions() {
  const toggleButton = document.getElementById('toggleBrandedAssets');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => setState({ brandedAssetsOpen: !state.brandedAssetsOpen }));
  }

  const listViewButton = document.getElementById('brandListView');
  if (listViewButton) {
    listViewButton.addEventListener('click', () => setState({ brandedAssetsView: 'list' }));
  }

  const gridViewButton = document.getElementById('brandGridView');
  if (gridViewButton) {
    gridViewButton.addEventListener('click', () => setState({ brandedAssetsView: 'grid' }));
  }

  const uploadInput = document.getElementById('brandAssetUpload');
  if (uploadInput) {
    uploadInput.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []).filter((file) => file.type === 'image/png');
      if (!files.length) return;

      const targetFolder = state.brandedAssetsFolderFilter === 'All folders' ? 'General' : state.brandedAssetsFolderFilter;
      const uploadDimension = document.getElementById('brandUploadDimension')?.value;

      const newAssets = files.map((file, index) => ({
        id: Date.now() + index,
        name: file.name,
        folder: targetFolder,
        dimension: uploadDimension || guessDimensionFromFileName(file.name),
        createdAt: new Date().toISOString(),
        src: URL.createObjectURL(file),
      }));

      setState({ brandedAssets: [...newAssets, ...state.brandedAssets] });
    });
  }

  const folderFilter = document.getElementById('brandFolderFilter');
  if (folderFilter) {
    folderFilter.addEventListener('change', (event) => {
      setState({ brandedAssetsFolderFilter: event.target.value });
    });
  }

  const dimensionFilter = document.getElementById('brandDimensionFilter');
  if (dimensionFilter) {
    dimensionFilter.addEventListener('change', (event) => {
      setState({ brandedAssetsDimensionFilter: event.target.value });
    });
  }

  const sortSelect = document.getElementById('brandAssetSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
      setState({ brandedAssetsSort: event.target.value });
    });
  }

  const folderForm = document.getElementById('brandFolderForm');
  if (folderForm) {
    folderForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const folderInput = document.getElementById('brandFolderInput');
      const folderName = folderInput.value.trim();
      if (!folderName || state.brandedFolders.includes(folderName)) return;

      setState({
        brandedFolders: [...state.brandedFolders, folderName],
        brandedAssetsFolderFilter: folderName,
      });
    });
  }

  document.querySelectorAll('[data-asset-id]').forEach((row) => {
    row.addEventListener('click', () => {
      setState({ designSelectedAssetId: Number(row.dataset.assetId), activeTab: 'Design' });
    });
  });
}

function wireDesignInteractions() {
  document.querySelectorAll('[data-design-asset-id]').forEach((button) => {
    button.addEventListener('click', () => setState({ designSelectedAssetId: Number(button.dataset.designAssetId) }));
  });

  document.querySelectorAll('[data-layer-id]').forEach((control) => {
    control.addEventListener('input', () => updateLayer(control.dataset.layerId, control.dataset.prop, control.value));
    control.addEventListener('change', () => updateLayer(control.dataset.layerId, control.dataset.prop, control.value));
  });
}

function wireDataEngineInteractions() {
  const toggleSimulationButton = document.getElementById('toggleSimulation');
  if (toggleSimulationButton) {
    toggleSimulationButton.addEventListener('click', () => {
      if (state.simulationRunning) {
        stopSimulation();
      } else {
        startSimulation();
      }
    });
  }

  const speedSelect = document.getElementById('simulationSpeed');
  if (speedSelect) {
    speedSelect.addEventListener('change', (event) => {
      const nextSpeed = Number(event.target.value);
      const wasRunning = state.simulationRunning;
      stopSimulation();
      setState({ simulationSpeedMs: nextSpeed });
      if (wasRunning) {
        startSimulation();
      }
    });
  }

  const resetButton = document.getElementById('resetSimulation');
  if (resetButton) {
    resetButton.addEventListener('click', resetSimulation);
  }
}

function wireInteractions() {
  wireBrandedAssetInteractions();
  wireDesignInteractions();
  wireDataEngineInteractions();
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
