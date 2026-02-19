const tabs = ['Dashboard', 'Design', 'Data Engine', 'Control Room', 'Output'];

const bootstrap = window.RENDERLESS_BOOTSTRAP || {};
const supportedDimensions = bootstrap.supportedDimensions || ['1920x1080', '1080x1920', '1080x1080', '1080x1350'];
const mlbSimulationFeed = bootstrap.mlbSimulationFeed || [];

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

const state = {
  activeTab: 'Dashboard',
  liveScore: 'BOS 0 - NYY 0',
  isStreaming: false,
  brandedAssetsOpen: true,
  brandedAssetsFolderFilter: 'All folders',
  brandedAssetsDimensionFilter: 'All dimensions',
  brandedAssetsSort: 'newest',
  brandedAssetsView: 'list',
  brandedAssets: cloneValue(bootstrap.brandedAssets || []),
  brandedFolders: ['General', 'Scorebugs', 'Social Stories', 'Social Square', 'Social Feed'],
  designSelectedAssetId: 1,
  designTextLayers: [
    { id: 1, name: 'Headline', text: 'Final Score Update', x: 32, y: 30, size: 58, color: '#ffffff', bindKey: 'none' },
    { id: 2, name: 'Subhead', text: 'Waiting to start MLB simulation.', x: 32, y: 105, size: 44, color: '#bfdbfe', bindKey: 'lastEvent' },
  ],
  simulationRunning: false,
  simulationSpeedMs: 1300,
  simulationIndex: -1,
  gameState: cloneValue(bootstrap.initialGameState || {}),
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
