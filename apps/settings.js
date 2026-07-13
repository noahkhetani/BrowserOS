// browseros lite — settings app  (apps/settings.js)

BrowserOS.AppModules.settings = (() => {

  let _winId       = null;
  let _activePanel = 'appearance';

  /* ── Data ────────────────────────────────────────────────── */
  const WALLPAPERS = [
    { id: 'aurora',   name: 'Aurora',   bg: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
    { id: 'sunset',   name: 'Sunset',   bg: 'linear-gradient(135deg,#200122,#6f0000,#f5576c,#4facfe)' },
    { id: 'ocean',    name: 'Ocean',    bg: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' },
    { id: 'forest',   name: 'Forest',   bg: 'linear-gradient(135deg,#052e16,#134e5e,#1a6b5e)' },
    { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(135deg,#000000,#0d0d1a,#1a1a2e)' },
    { id: 'neon',     name: 'Neon',     bg: 'radial-gradient(ellipse at 20% 50%,#2d0046 0%,#000510 60%)' },
    { id: 'rose',     name: 'Rose',     bg: 'linear-gradient(135deg,#1a000f,#3d0030,#1a0028)' },
    { id: 'slate',    name: 'Slate',    bg: 'linear-gradient(160deg,#0f2027,#1c3a4a,#243b55)' },
  ];

  const ACCENTS = [
    { name: 'Purple',  value: '#6c63ff' },
    { name: 'Blue',    value: '#4facfe' },
    { name: 'Cyan',    value: '#00c9ff' },
    { name: 'Emerald', value: '#43e97b' },
    { name: 'Orange',  value: '#ff8c42' },
    { name: 'Pink',    value: '#f72585' },
    { name: 'Red',     value: '#ff4757' },
    { name: 'Gold',    value: '#ffd32a' },
  ];

  const PANELS = [
    { id: 'appearance', icon: '🎨', label: 'Appearance' },
    { id: 'wallpaper',  icon: '🖼️', label: 'Wallpaper'  },
    { id: 'system',     icon: '💾', label: 'System'     },
    { id: 'about',      icon: 'ℹ️', label: 'About'      },
  ];

  /* ── DOM helper ──────────────────────────────────────────── */
  function $id (id) { return document.getElementById(id); }

  /* ── Render ───────────────────────────────────────────────── */
  function render (container) {
    container.innerHTML = `
      <div class="settings-layout">

        <!-- Navigation -->
        <nav class="settings-nav">
          ${PANELS.map(p => `
            <div class="settings-nav-item ${p.id === _activePanel ? 'active' : ''}" data-panel="${p.id}">
              <span class="settings-nav-icon">${p.icon}</span>
              ${p.label}
            </div>
          `).join('')}
        </nav>

        <!-- Content -->
        <div class="settings-body">

          <!-- Appearance panel -->
          <div class="settings-panel ${_activePanel === 'appearance' ? 'active' : ''}" data-panel="appearance">
            <div class="settings-section">
              <div class="settings-section-title">Theme</div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <div class="settings-row-label">Dark Mode</div>
                  <div class="settings-row-sub">Use dark colours across the desktop</div>
                </div>
                <div
                  class="toggle ${BrowserOS.state.theme === 'dark' ? 'on' : ''}"
                  id="${_winId}_theme_toggle"
                  role="switch"
                  aria-checked="${BrowserOS.state.theme === 'dark'}"
                ></div>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title">Accent Colour</div>
              <div class="swatch-row" id="${_winId}_swatches">
                ${ACCENTS.map(a => `
                  <div
                    class="color-swatch ${BrowserOS.state.accent === a.value ? 'active' : ''}"
                    style="background:${a.value}"
                    title="${a.name}"
                    data-color="${a.value}"
                  ></div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Wallpaper panel -->
          <div class="settings-panel ${_activePanel === 'wallpaper' ? 'active' : ''}" data-panel="wallpaper">
            <div class="settings-section">
              <div class="settings-section-title">Choose Wallpaper</div>
              <div class="wallpaper-grid">
                ${WALLPAPERS.map(w => `
                  <div
                    class="wp-thumb ${BrowserOS.state.wallpaper === w.id ? 'active' : ''}"
                    style="background:${w.bg}"
                    data-wallpaper="${w.id}"
                    title="${w.name}"
                  >
                    <span>${w.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- System panel -->
          <div class="settings-panel ${_activePanel === 'system' ? 'active' : ''}" data-panel="system">
            <div class="settings-section">
              <div class="settings-section-title">Storage</div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <div class="settings-row-label">localStorage Used</div>
                  <div class="settings-row-sub" id="${_winId}_storage_sub">Calculating…</div>
                </div>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <div class="settings-row-label">Clear All Data</div>
                  <div class="settings-row-sub">Removes notes, filesystem, and settings. Cannot be undone.</div>
                </div>
                <button class="danger-btn" id="${_winId}_clear_btn">Clear</button>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title">Display</div>
              <div class="settings-row">
                <div class="settings-row-label">Viewport</div>
                <span style="font-size:12px;color:var(--text-dim)">${window.innerWidth} × ${window.innerHeight} px</span>
              </div>
              <div class="settings-row">
                <div class="settings-row-label">Device Pixel Ratio</div>
                <span style="font-size:12px;color:var(--text-dim)">${window.devicePixelRatio}×</span>
              </div>
            </div>
          </div>

          <!-- About panel -->
          <div class="settings-panel ${_activePanel === 'about' ? 'active' : ''}" data-panel="about">
            <div class="about-card">
              <div class="about-card-icon">💻</div>
              <div>
                <div class="about-card-title">BrowserOS Lite</div>
                <div class="about-card-ver">Version 1.0.0</div>
                <div class="about-card-desc">A lightweight browser-based desktop environment</div>
              </div>
            </div>
            <div class="info-row"><span>Engine</span><span>HTML + CSS + JavaScript</span></div>
            <div class="info-row"><span>Storage</span><span>localStorage</span></div>
            <div class="info-row"><span>Frameworks</span><span>None (vanilla)</span></div>
            <div class="info-row"><span>Apps</span><span>Notes · Terminal · Files · Settings</span></div>
            <div class="info-row"><span>License</span><span>MIT</span></div>
          </div>

        </div><!-- .settings-body -->
      </div><!-- .settings-layout -->
    `;

    _bindEvents(container);
    _calcStorage();
  }

  /* ── Bind all events ─────────────────────────────────────── */
  function _bindEvents (container) {

    /* ── Panel navigation ── */
    container.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        _activePanel = item.dataset.panel;
        container.querySelectorAll('.settings-nav-item').forEach(i =>
          i.classList.toggle('active', i.dataset.panel === _activePanel)
        );
        container.querySelectorAll('.settings-panel').forEach(p =>
          p.classList.toggle('active', p.dataset.panel === _activePanel)
        );
      });
    });

    /* ── Theme toggle ── */
    $id(`${_winId}_theme_toggle`).addEventListener('click', function () {
      const isDark = BrowserOS.state.theme === 'dark';
      BrowserOS.setTheme(isDark ? 'light' : 'dark');
      this.classList.toggle('on', !isDark);
      this.setAttribute('aria-checked', String(!isDark));
    });

    /* ── Accent swatches ── */
    container.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        BrowserOS.setAccent(swatch.dataset.color);
        container.querySelectorAll('.color-swatch').forEach(s =>
          s.classList.toggle('active', s.dataset.color === swatch.dataset.color)
        );
      });
    });

    /* ── Wallpaper thumbs ── */
    container.querySelectorAll('.wp-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        BrowserOS.setWallpaper(thumb.dataset.wallpaper);
        container.querySelectorAll('.wp-thumb').forEach(t =>
          t.classList.toggle('active', t.dataset.wallpaper === thumb.dataset.wallpaper)
        );
      });
    });

    /* ── Clear data ── */
    $id(`${_winId}_clear_btn`).addEventListener('click', () => {
      if (confirm('This will erase all notes, files, and settings. Continue?')) {
        localStorage.clear();
        BrowserOS.notify('All data cleared. Reloading…');
        setTimeout(() => location.reload(), 1200);
      }
    });
  }

  /* ── Calculate storage usage ──────────────────────────────── */
  function _calcStorage () {
    const el = $id(`${_winId}_storage_sub`);
    if (!el) return;
    try {
      const bytes = new Blob(Object.values(localStorage)).size;
      const kb    = (bytes / 1024).toFixed(1);
      el.textContent = `${kb} KB used`;
    } catch (_) {
      el.textContent = 'Unable to calculate';
    }
  }

  /* ── Public API ───────────────────────────────────────────── */
  return {
    init (winId, container) {
      _winId = winId;
      render(container);
    },
  };
})();
