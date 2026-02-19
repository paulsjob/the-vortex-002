const tabs = ['Dashboard', 'Design', 'Data Engine', 'Control Room', 'Output'];

const supportedDimensions = ['1920x1080', '1080x1920', '1080x1080', '1080x1350'];

const mlbSimulationFeed = [
  {
    inning: 1,
    inningState: 'Top',
    summary: 'Volpe opens the game with a single to center.',
    score: { BOS: 0, NYY: 0 },
    count: { balls: 1, strikes: 1, outs: 0 },
    runnersOnBase: 'Runner on 1st',
    pitcher: 'Brayan Bello',
    batter: 'Anthony Volpe',
    pitch: { type: '4-Seam Fastball', velocity: 96, location: 'Outer third, belt high' },
    hit: { batSpeed: 74, exitVelocity: 102, launchAngle: 9, projectedDistance: 164 },
  },
  {
    inning: 1,
    inningState: 'Top',
    summary: 'Judge hammers a two-run homer to left.',
    score: { BOS: 0, NYY: 2 },
    count: { balls: 2, strikes: 1, outs: 1 },
    runnersOnBase: 'Bases empty',
    pitcher: 'Brayan Bello',
    batter: 'Aaron Judge',
    pitch: { type: 'Sinker', velocity: 95, location: 'Middle-in' },
    hit: { batSpeed: 81, exitVelocity: 111, launchAngle: 25, projectedDistance: 431 },
  },
  {
    inning: 1,
    inningState: 'Bottom',
    summary: 'Devers unloads a three-run bomb over the monster.',
    score: { BOS: 3, NYY: 2 },
    count: { balls: 3, strikes: 1, outs: 2 },
    runnersOnBase: 'Bases empty',
    pitcher: 'Gerrit Cole',
    batter: 'Rafael Devers',
    pitch: { type: 'Slider', velocity: 87, location: 'Middle-middle' },
    hit: { batSpeed: 80, exitVelocity: 109, launchAngle: 31, projectedDistance: 418 },
  },
  {
    inning: 2,
    inningState: 'Top',
    summary: 'Soto ropes an RBI single and ties it.',
    score: { BOS: 3, NYY: 3 },
    count: { balls: 1, strikes: 2, outs: 1 },
    runnersOnBase: 'Runner on 1st',
    pitcher: 'Brayan Bello',
    batter: 'Juan Soto',
    pitch: { type: 'Changeup', velocity: 88, location: 'Down and away' },
    hit: { batSpeed: 76, exitVelocity: 101, launchAngle: 6, projectedDistance: 192 },
  },
  {
    inning: 2,
    inningState: 'Bottom',
    summary: 'Casas drives in two with a line double.',
    score: { BOS: 5, NYY: 3 },
    count: { balls: 2, strikes: 0, outs: 2 },
    runnersOnBase: 'Runner on 2nd',
    pitcher: 'Gerrit Cole',
    batter: 'Triston Casas',
    pitch: { type: 'Cutter', velocity: 91, location: 'Inner half' },
    hit: { batSpeed: 77, exitVelocity: 104, launchAngle: 12, projectedDistance: 228 },
  },
  {
    inning: 3,
    inningState: 'Top',
    summary: 'Judge launches another three-run shot.',
    score: { BOS: 5, NYY: 6 },
    count: { balls: 1, strikes: 0, outs: 2 },
    runnersOnBase: 'Bases empty',
    pitcher: 'Brayan Bello',
    batter: 'Aaron Judge',
    pitch: { type: '4-Seam Fastball', velocity: 97, location: 'Up and in' },
    hit: { batSpeed: 83, exitVelocity: 113, launchAngle: 29, projectedDistance: 446 },
  },
  {
    inning: 3,
    inningState: 'Bottom',
    summary: 'Boston explodes for four and retakes control.',
    score: { BOS: 9, NYY: 6 },
    count: { balls: 3, strikes: 2, outs: 2 },
    runnersOnBase: 'Runner on 1st',
    pitcher: 'Ian Hamilton',
    batter: 'Jarren Duran',
    pitch: { type: 'Sweeper', velocity: 85, location: 'Backdoor edge' },
    hit: { batSpeed: 75, exitVelocity: 103, launchAngle: 15, projectedDistance: 301 },
  },
  {
    inning: 4,
    inningState: 'Top',
    summary: 'Rizzo lines an RBI double to the gap.',
    score: { BOS: 9, NYY: 7 },
    count: { balls: 0, strikes: 1, outs: 1 },
    runnersOnBase: 'Runner on 2nd',
    pitcher: 'Chris Martin',
    batter: 'Anthony Rizzo',
    pitch: { type: 'Sinker', velocity: 94, location: 'Knee-high, outer edge' },
    hit: { batSpeed: 72, exitVelocity: 99, launchAngle: 18, projectedDistance: 286 },
  },
  {
    inning: 5,
    inningState: 'Top',
    summary: 'Rizzo ties the game with a two-run single.',
    score: { BOS: 9, NYY: 9 },
    count: { balls: 2, strikes: 2, outs: 2 },
    runnersOnBase: 'Runner on 1st',
    pitcher: 'Brennan Bernardino',
    batter: 'Anthony Rizzo',
    pitch: { type: 'Slider', velocity: 86, location: 'Middle-away' },
    hit: { batSpeed: 73, exitVelocity: 98, launchAngle: 5, projectedDistance: 204 },
  },
  {
    inning: 5,
    inningState: 'Bottom',
    summary: 'Abreu lifts a sac fly and Boston leads again.',
    score: { BOS: 10, NYY: 9 },
    count: { balls: 1, strikes: 2, outs: 1 },
    runnersOnBase: 'Runner on 1st',
    pitcher: 'Tommy Kahnle',
    batter: 'Wilyer Abreu',
    pitch: { type: 'Changeup', velocity: 84, location: 'Low-middle' },
    hit: { batSpeed: 71, exitVelocity: 94, launchAngle: 36, projectedDistance: 286 },
  },
  {
    inning: 6,
    inningState: 'Bottom',
    summary: 'Story splits the gap for two more Boston runs.',
    score: { BOS: 12, NYY: 9 },
    count: { balls: 2, strikes: 1, outs: 0 },
    runnersOnBase: 'Runner on 2nd',
    pitcher: 'Clay Holmes',
    batter: 'Trevor Story',
    pitch: { type: 'Sinker', velocity: 96, location: 'Middle-in' },
    hit: { batSpeed: 78, exitVelocity: 107, launchAngle: 14, projectedDistance: 312 },
  },
  {
    inning: 7,
    inningState: 'Top',
    summary: 'Torres goes deep and trims it to one.',
    score: { BOS: 12, NYY: 11 },
    count: { balls: 3, strikes: 2, outs: 1 },
    runnersOnBase: 'Bases empty',
    pitcher: 'Kenley Jansen',
    batter: 'Gleyber Torres',
    pitch: { type: 'Cutter', velocity: 93, location: 'Inner black' },
    hit: { batSpeed: 79, exitVelocity: 108, launchAngle: 27, projectedDistance: 402 },
  },
  {
    inning: 7,
    inningState: 'Bottom',
    summary: 'Boston scratches one across on a contact play.',
    score: { BOS: 13, NYY: 11 },
    count: { balls: 0, strikes: 2, outs: 2 },
    runnersOnBase: 'Runner on 3rd',
    pitcher: 'Nick Burdi',
    batter: 'Ceddanne Rafaela',
    pitch: { type: '4-Seam Fastball', velocity: 98, location: 'Up and away' },
    hit: { batSpeed: 69, exitVelocity: 87, launchAngle: 42, projectedDistance: 245 },
  },
  {
    inning: 8,
    inningState: 'Top',
    summary: 'Volpe punches an RBI single through the left side.',
    score: { BOS: 13, NYY: 12 },
    count: { balls: 1, strikes: 1, outs: 1 },
    runnersOnBase: 'Runners on 1st and 2nd',
    pitcher: 'Chris Martin',
    batter: 'Anthony Volpe',
    pitch: { type: 'Slider', velocity: 85, location: 'Lower inner third' },
    hit: { batSpeed: 74, exitVelocity: 95, launchAngle: 8, projectedDistance: 181 },
  },
  {
    inning: 8,
    inningState: 'Bottom',
    summary: 'Duran adds two insurance runs with a ringing triple.',
    score: { BOS: 15, NYY: 12 },
    count: { balls: 2, strikes: 2, outs: 0 },
    runnersOnBase: 'Runner on 3rd',
    pitcher: 'Luke Weaver',
    batter: 'Jarren Duran',
    pitch: { type: 'Changeup', velocity: 86, location: 'Middle-away' },
    hit: { batSpeed: 80, exitVelocity: 106, launchAngle: 19, projectedDistance: 361 },
  },
  {
    inning: 9,
    inningState: 'Top',
    summary: 'Jansen closes it out with a strikeout looking. Final: Red Sox 15-12.',
    score: { BOS: 15, NYY: 12 },
    count: { balls: 0, strikes: 2, outs: 3 },
    runnersOnBase: 'Bases empty',
    pitcher: 'Kenley Jansen',
    batter: 'Giancarlo Stanton',
    pitch: { type: 'Cutter', velocity: 94, location: 'Outer black, knee-high' },
    hit: { batSpeed: 0, exitVelocity: 0, launchAngle: 0, projectedDistance: 0 },
  },
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
    { id: 1, name: 'red-sox-scorebug-1920x1080.png', folder: 'Scorebugs', dimension: '1920x1080', createdAt: new Date('2026-01-10T09:10:00').toISOString(), src: 'https://dummyimage.com/1920x1080/0f172a/93c5fd.png&text=Scorebug+16:9' },
    { id: 2, name: 'yankees-story-1080x1920.png', folder: 'Social Stories', dimension: '1080x1920', createdAt: new Date('2026-01-14T12:45:00').toISOString(), src: 'https://dummyimage.com/1080x1920/111827/86efac.png&text=Story+9:16' },
    { id: 3, name: 'postgame-square-1080x1080.png', folder: 'Social Square', dimension: '1080x1080', createdAt: new Date('2026-01-16T18:25:00').toISOString(), src: 'https://dummyimage.com/1080x1080/1e293b/fca5a5.png&text=Square+1:1' },
    { id: 4, name: 'lineup-feed-1080x1350.png', folder: 'Social Feed', dimension: '1080x1350', createdAt: new Date('2026-01-18T08:00:00').toISOString(), src: 'https://dummyimage.com/1080x1350/172554/bae6fd.png&text=Feed+4:5' },
  ],
  brandedFolders: ['General', 'Scorebugs', 'Social Stories', 'Social Square', 'Social Feed'],
  designSelectedAssetId: 1,
  designTextLayers: [
    { id: 1, name: 'Headline', text: 'Final Score Update', x: 32, y: 30, size: 58, color: '#ffffff', bindKey: 'none' },
    { id: 2, name: 'Subhead', text: 'Waiting to start MLB simulation.', x: 32, y: 105, size: 44, color: '#bfdbfe', bindKey: 'lastEvent' },
  ],
  simulationRunning: false,
  simulationSpeedMs: 1300,
  simulationIndex: -1,
  gameState: {
    matchup: 'Red Sox vs Yankees',
    inning: 1,
    inningState: 'Top',
    score: { BOS: 0, NYY: 0 },
    balls: 0,
    strikes: 0,
    outs: 0,
    runnersOnBase: 'Bases empty',
    pitcher: 'Brayan Bello',
    batter: 'Anthony Volpe',
    pitchType: '4-Seam Fastball',
    pitchVelocity: 96,
    pitchLocation: 'Outer third',
    batSpeed: 0,
    exitVelocity: 0,
    launchAngle: 0,
    projectedDistance: 0,
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
  tabsEl.innerHTML = tabs.map((tab) => `<button class="tab-btn ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">${tab}</button>`).join('');
  tabsEl.querySelectorAll('.tab-btn').forEach((btn) => btn.addEventListener('click', () => setState({ activeTab: btn.dataset.tab })));
}

function getAssetById(id) {
  return state.brandedAssets.find((asset) => asset.id === Number(id));
}

function getDimensionRatio(dimension) {
  const [w, h] = dimension.split('x').map(Number);
  return w / h;
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
    .map((asset) => `
      <button class="brand-list-row" data-asset-id="${asset.id}">
        <span class="cell name">${asset.name}</span>
        <span class="cell folder">${asset.folder}</span>
        <span class="cell dim">${asset.dimension}</span>
        <span class="cell date">${new Date(asset.createdAt).toLocaleDateString()}</span>
      </button>`)
    .join('');
}

function brandedAssetsGrid(assets) {
  return assets
    .map((asset) => `
      <article class="brand-asset-card" data-asset-id="${asset.id}">
        <img src="${asset.src}" alt="${asset.name}" />
        <div>
          <strong>${asset.name}</strong>
          <p class="muted">${asset.folder} · ${asset.dimension}</p>
        </div>
      </article>`)
    .join('');
}

function brandedAssetsManager() {
  const assets = getFilteredAndSortedAssets();

  return `
    <div class="brand-manager ${state.brandedAssetsOpen ? 'open' : ''}">
      <div class="brand-manager-header">
        <h4>Branded Assets Locker</h4>
        <p class="muted">PNG upload, dimension-aware organization, and fast list navigation.</p>
      </div>
      <div class="brand-controls">
        <label class="control-group">Upload PNG<input id="brandAssetUpload" type="file" accept="image/png" multiple /></label>
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
        <label class="control-group">Upload Dimension
          <select id="brandUploadDimension">${supportedDimensions.map((dimension) => `<option value="${dimension}">${dimension}</option>`).join('')}</select>
        </label>
        <form id="brandFolderForm" class="folder-form"><input id="brandFolderInput" placeholder="New folder name" maxlength="24" /><button type="submit">Create Folder</button></form>
      </div>
      <div class="view-mode-row">
        <button id="brandListView" class="pill-btn ${state.brandedAssetsView === 'list' ? 'active' : ''}">List View</button>
        <button id="brandGridView" class="pill-btn ${state.brandedAssetsView === 'grid' ? 'active' : ''}">Grid View</button>
      </div>
      <div class="brand-assets-wrap ${state.brandedAssetsView}">
        ${assets.length ? (state.brandedAssetsView === 'list' ? `<div class="brand-list-header"><span>Name</span><span>Folder</span><span>Dimension</span><span>Date Added</span></div>${brandedAssetsRows(assets)}` : brandedAssetsGrid(assets)) : '<p class="muted">No assets found for this filter.</p>'}
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
      <h3>Global Asset Library</h3>
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
  if (layer.bindKey === 'inning') return `${state.gameState.inningState} ${state.gameState.inning}`;
  if (layer.bindKey === 'count') return `Count ${state.gameState.balls}-${state.gameState.strikes}, ${state.gameState.outs} out`;
  if (layer.bindKey === 'matchup') return `${state.gameState.pitcher} vs ${state.gameState.batter}`;
  if (layer.bindKey === 'lastEvent') return state.gameState.lastEvent;
  return layer.text;
}

function designView() {
  const selectedAsset = getAssetById(state.designSelectedAssetId) || state.brandedAssets[0];
  const ratio = selectedAsset ? getDimensionRatio(selectedAsset.dimension) : 16 / 9;

  return `
    <section class="panel design-layout">
      <div>
        <h3>Design Canvas · Linked Branded Asset</h3>
        <div class="design-stage-shell">
          <div class="design-stage" style="--asset-ratio:${ratio};">
            ${selectedAsset ? `<img src="${selectedAsset.src}" alt="${selectedAsset.name}" class="canvas-bg" />` : ''}
            ${state.designTextLayers
              .map((layer) => `<span class="text-layer" style="left:${layer.x}px;top:${layer.y}px;font-size:${layer.size}px;color:${layer.color};">${getBoundText(layer)}</span>`)
              .join('')}
          </div>
        </div>
        <p class="muted canvas-meta">Comp Size: ${selectedAsset?.dimension || 'N/A'} · Asset fit is ratio-accurate for portrait/square/landscape.</p>
      </div>
      <aside class="design-sidebar">
        <div class="panel mini-panel">
          <h3>Branded Assets Locker</h3>
          <div class="design-asset-list">
            ${state.brandedAssets
              .map((asset) => `<button class="design-asset-item ${state.designSelectedAssetId === asset.id ? 'active' : ''}" data-design-asset-id="${asset.id}">${asset.name}<span>${asset.dimension}</span></button>`)
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
                      <option value="inning" ${layer.bindKey === 'inning' ? 'selected' : ''}>Bind Inning State</option>
                      <option value="count" ${layer.bindKey === 'count' ? 'selected' : ''}>Bind Count/Outs</option>
                      <option value="matchup" ${layer.bindKey === 'matchup' ? 'selected' : ''}>Bind Pitcher vs Batter</option>
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
          <tr><td>score</td><td>MLB Simulator</td><td>BOS ${state.gameState.score.BOS} - NYY ${state.gameState.score.NYY}</td></tr>
          <tr><td>inning</td><td>MLB Simulator</td><td>${state.gameState.inning}</td></tr>
          <tr><td>inningState</td><td>MLB Simulator</td><td>${state.gameState.inningState}</td></tr>
          <tr><td>balls / strikes / outs</td><td>MLB Simulator</td><td>${state.gameState.balls} / ${state.gameState.strikes} / ${state.gameState.outs}</td></tr>
          <tr><td>runnersOnBase</td><td>MLB Simulator</td><td>${state.gameState.runnersOnBase}</td></tr>
          <tr><td>pitcher</td><td>MLB Simulator</td><td>${state.gameState.pitcher}</td></tr>
          <tr><td>batter</td><td>MLB Simulator</td><td>${state.gameState.batter}</td></tr>
          <tr><td>pitchType-velocity-location</td><td>MLB Simulator</td><td>${state.gameState.pitchType} · ${state.gameState.pitchVelocity} mph · ${state.gameState.pitchLocation}</td></tr>
          <tr><td>batSpeed-exitVelo-launchAngle-distance</td><td>MLB Simulator</td><td>${state.gameState.batSpeed} mph · ${state.gameState.exitVelocity} mph · ${state.gameState.launchAngle}° · ${state.gameState.projectedDistance} ft</td></tr>
          <tr><td>lastEvent</td><td>MLB Simulator</td><td>${state.gameState.lastEvent}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="panel">
      <h3>Pitch-by-Pitch Live Timeline</h3>
      <div class="sim-feed">
        ${mlbSimulationFeed
          .map(
            (play, index) => `<div class="feed-row ${index === state.simulationIndex ? 'active' : ''}"><strong>${play.inningState} ${play.inning}</strong><span>${play.pitch.type} ${play.pitch.velocity} mph · ${play.summary}</span><em>BOS ${play.score.BOS} - NYY ${play.score.NYY}</em></div>`,
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
        <div class="shotbox">${shots.map((s) => `<button class="shot">${s}</button>`).join('')}</div>
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
        <div class="log">${state.isStreaming ? '[12:00:01] INFO: Renderless Engine Initialized\n[12:00:04] SUCCESS: NDI sink linked\n[12:00:07] INFO: Preview chain healthy\n[12:00:10] INFO: Frame rate stable at 60 FPS\n[12:00:13] SUCCESS: Program output live\n[12:00:14] INFO: Audio embed synchronized\n[12:00:16] INFO: GPU utilization nominal\n[12:00:19] SUCCESS: Stream active to destination A' : '[idle] Streaming disabled. Press "Push to Stream" to start output telemetry.'}</div>
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

function runSimulationStep() {
  const nextIndex = state.simulationIndex + 1;
  if (nextIndex >= mlbSimulationFeed.length) {
    stopSimulation();
    return;
  }

  const play = mlbSimulationFeed[nextIndex];
  setState({
    simulationIndex: nextIndex,
    liveScore: `BOS ${play.score.BOS} - NYY ${play.score.NYY}`,
    gameState: {
      ...state.gameState,
      inning: play.inning,
      inningState: play.inningState,
      score: play.score,
      balls: play.count.balls,
      strikes: play.count.strikes,
      outs: play.count.outs,
      runnersOnBase: play.runnersOnBase,
      pitcher: play.pitcher,
      batter: play.batter,
      pitchType: play.pitch.type,
      pitchVelocity: play.pitch.velocity,
      pitchLocation: play.pitch.location,
      batSpeed: play.hit.batSpeed,
      exitVelocity: play.hit.exitVelocity,
      launchAngle: play.hit.launchAngle,
      projectedDistance: play.hit.projectedDistance,
      lastEvent: play.summary,
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
  if (state.simulationRunning) setState({ simulationRunning: false });
}

function resetSimulation() {
  stopSimulation();
  setState({
    simulationIndex: -1,
    liveScore: 'BOS 0 - NYY 0',
    gameState: {
      ...state.gameState,
      inning: 1,
      inningState: 'Top',
      score: { BOS: 0, NYY: 0 },
      balls: 0,
      strikes: 0,
      outs: 0,
      runnersOnBase: 'Bases empty',
      pitcher: 'Brayan Bello',
      batter: 'Anthony Volpe',
      pitchType: '4-Seam Fastball',
      pitchVelocity: 96,
      pitchLocation: 'Outer third',
      batSpeed: 0,
      exitVelocity: 0,
      launchAngle: 0,
      projectedDistance: 0,
      lastEvent: 'Simulation reset. Ready to start.',
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
  if (toggleButton) toggleButton.addEventListener('click', () => setState({ brandedAssetsOpen: !state.brandedAssetsOpen }));

  const listViewButton = document.getElementById('brandListView');
  if (listViewButton) listViewButton.addEventListener('click', () => setState({ brandedAssetsView: 'list' }));

  const gridViewButton = document.getElementById('brandGridView');
  if (gridViewButton) gridViewButton.addEventListener('click', () => setState({ brandedAssetsView: 'grid' }));

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
  if (folderFilter) folderFilter.addEventListener('change', (event) => setState({ brandedAssetsFolderFilter: event.target.value }));

  const dimensionFilter = document.getElementById('brandDimensionFilter');
  if (dimensionFilter) dimensionFilter.addEventListener('change', (event) => setState({ brandedAssetsDimensionFilter: event.target.value }));

  const sortSelect = document.getElementById('brandAssetSort');
  if (sortSelect) sortSelect.addEventListener('change', (event) => setState({ brandedAssetsSort: event.target.value }));

  const folderForm = document.getElementById('brandFolderForm');
  if (folderForm) {
    folderForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const folderInput = document.getElementById('brandFolderInput');
      const folderName = folderInput.value.trim();
      if (!folderName || state.brandedFolders.includes(folderName)) return;
      setState({ brandedFolders: [...state.brandedFolders, folderName], brandedAssetsFolderFilter: folderName });
      folderInput.value = '';
    });
  }

  document.querySelectorAll('[data-asset-id]').forEach((row) => {
    row.addEventListener('click', () => setState({ designSelectedAssetId: Number(row.dataset.assetId), activeTab: 'Design' }));
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
      if (state.simulationRunning) stopSimulation();
      else startSimulation();
    });
  }

  const speedSelect = document.getElementById('simulationSpeed');
  if (speedSelect) {
    speedSelect.addEventListener('change', (event) => {
      const nextSpeed = Number(event.target.value);
      const wasRunning = state.simulationRunning;
      stopSimulation();
      setState({ simulationSpeedMs: nextSpeed });
      if (wasRunning) startSimulation();
    });
  }

  const resetButton = document.getElementById('resetSimulation');
  if (resetButton) resetButton.addEventListener('click', resetSimulation);
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
