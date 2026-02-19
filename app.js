const tabs = ['Dashboard', 'Design', 'Data Engine', 'Control Room', 'Output'];

const state = {
  activeTab: 'Dashboard',
  liveScore: 'Home 2 - Away 1',
  isStreaming: false,
  brandedAssetsOpen: false,
  brandedAssetsFolderFilter: 'All folders',
  brandedAssetsSort: 'newest',
  brandedAssets: [
    {
      id: 1,
      name: 'sponsor-lockup.png',
      folder: 'Sponsors',
      createdAt: new Date('2025-01-09T09:10:00').toISOString(),
      src: 'https://dummyimage.com/300x180/0f172a/93c5fd.png&text=Sponsor+Lockup',
    },
    {
      id: 2,
      name: 'league-badge.png',
      folder: 'League',
      createdAt: new Date('2025-02-12T12:45:00').toISOString(),
      src: 'https://dummyimage.com/300x180/111827/86efac.png&text=League+Badge',
    },
  ],
  brandedFolders: ['General', 'Sponsors', 'League'],
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

function getFilteredAndSortedAssets() {
  const filtered = state.brandedAssets.filter((asset) => {
    if (state.brandedAssetsFolderFilter === 'All folders') {
      return true;
    }

    return asset.folder === state.brandedAssetsFolderFilter;
  });

  return filtered.sort((a, b) => {
    if (state.brandedAssetsSort === 'name-asc') {
      return a.name.localeCompare(b.name);
    }

    if (state.brandedAssetsSort === 'name-desc') {
      return b.name.localeCompare(a.name);
    }

    if (state.brandedAssetsSort === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function brandedAssetsManager() {
  const assets = getFilteredAndSortedAssets();

  return `
    <div class="brand-manager ${state.brandedAssetsOpen ? 'open' : ''}">
      <div class="brand-manager-header">
        <h4>Branded Assets</h4>
        <p class="muted">Upload PNG files, organize folders, and sort assets by name/date.</p>
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
        <label class="control-group">Sort
          <select id="brandAssetSort">
            <option value="newest" ${state.brandedAssetsSort === 'newest' ? 'selected' : ''}>Newest first</option>
            <option value="oldest" ${state.brandedAssetsSort === 'oldest' ? 'selected' : ''}>Oldest first</option>
            <option value="name-asc" ${state.brandedAssetsSort === 'name-asc' ? 'selected' : ''}>Name A-Z</option>
            <option value="name-desc" ${state.brandedAssetsSort === 'name-desc' ? 'selected' : ''}>Name Z-A</option>
          </select>
        </label>
        <form id="brandFolderForm" class="folder-form">
          <input id="brandFolderInput" placeholder="New folder name" maxlength="24" />
          <button type="submit">Create Folder</button>
        </form>
      </div>
      <div class="brand-assets-grid">
        ${assets.length
          ? assets
              .map(
                (asset) => `
                  <article class="brand-asset-card">
                    <img src="${asset.src}" alt="${asset.name}" />
                    <div>
                      <strong>${asset.name}</strong>
                      <p class="muted">${asset.folder} · ${new Date(asset.createdAt).toLocaleDateString()}</p>
                    </div>
                  </article>
                `,
              )
              .join('')
          : '<p class="muted">No assets found for this folder yet.</p>'}
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

function wireBrandedAssetInteractions() {
  const toggleButton = document.getElementById('toggleBrandedAssets');
  if (toggleButton) {
    toggleButton.addEventListener('click', () => setState({ brandedAssetsOpen: !state.brandedAssetsOpen }));
  }

  const uploadInput = document.getElementById('brandAssetUpload');
  if (uploadInput) {
    uploadInput.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []).filter((file) => file.type === 'image/png');
      if (!files.length) {
        return;
      }

      const targetFolder =
        state.brandedAssetsFolderFilter === 'All folders' ? 'General' : state.brandedAssetsFolderFilter;

      const newAssets = files.map((file, index) => ({
        id: Date.now() + index,
        name: file.name,
        folder: targetFolder,
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

      if (!folderName || state.brandedFolders.includes(folderName)) {
        return;
      }

      setState({
        brandedFolders: [...state.brandedFolders, folderName],
        brandedAssetsFolderFilter: folderName,
      });
    });
  }
}

function wireInteractions() {
  const input = document.getElementById('scoreInput');
  if (input) {
    input.addEventListener('input', (e) => setState({ liveScore: e.target.value }));
  }

  wireBrandedAssetInteractions();
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
