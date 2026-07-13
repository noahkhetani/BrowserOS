// browseros lite — core system  (app.js)

'use strict';

/* ----------------------------------------------------------------
   Global BrowserOS object
   ---------------------------------------------------------------- */
const BrowserOS = {

  /* ── App definitions ─────────────────────────────────────── */
  appDefs: {
    notes:    { title: 'Notes',    icon: '📝', w: 720, h: 520 },
    terminal: { title: 'Terminal', icon: '💻', w: 660, h: 440 },
    settings: { title: 'Settings', icon: '⚙️', w: 600, h: 460 },
    files:    { title: 'Files',    icon: '📁', w: 700, h: 480 },
  },

  /* ── Runtime state ───────────────────────────────────────── */
  windows:       {},     // winId → window object
  AppModules:    {},     // appId → module
  _zCounter:     100,
  _activeWinId:  null,
  _drag:         null,   // { winId, offsetX, offsetY }
  _resize:       null,   // { winId, startX, startY, startW, startH }

  /* ── Persisted state ──────────────────────────────────────── */
  state: {
    theme:    'dark',
    wallpaper:'aurora',
    accent:   '#6c63ff',
  },
};

// boot
document.addEventListener('DOMContentLoaded', () => {
  BrowserOS._loadState();
  BrowserOS._applyTheme();
  BrowserOS._initClock();
  BrowserOS._setupGlobalListeners();
  BrowserOS.FS.init();
  BrowserOS._setupDesktopIcons();
  BrowserOS._setupStartMenu();
  BrowserOS._setupTaskbar();

  /* Boot animation → hide boot screen after ~2 s */
  setTimeout(() => {
    const bs = document.getElementById('boot-screen');
    if (bs) bs.classList.add('done');
  }, 2000);
});

// state persistence
BrowserOS._loadState = function () {
  try {
    const s = JSON.parse(localStorage.getItem('bos_state') || '{}');
    Object.assign(this.state, s);
  } catch (_) {}
};

BrowserOS._saveState = function () {
  localStorage.setItem('bos_state', JSON.stringify(this.state));
};

// theme & appearance
BrowserOS._applyTheme = function () {
  const html = document.documentElement;
  document.body.setAttribute('data-theme',     this.state.theme);
  document.body.setAttribute('data-wallpaper', this.state.wallpaper);

  const hex = this.state.accent;
  const r   = parseInt(hex.slice(1, 3), 16);
  const g   = parseInt(hex.slice(3, 5), 16);
  const b   = parseInt(hex.slice(5, 7), 16);
  const lr  = Math.min(255, r + 28);
  const lg  = Math.min(255, g + 28);
  const lb  = Math.min(255, b + 28);
  const light = `#${lr.toString(16).padStart(2,'0')}${lg.toString(16).padStart(2,'0')}${lb.toString(16).padStart(2,'0')}`;

  html.style.setProperty('--accent',      hex);
  html.style.setProperty('--accent-light',light);
  html.style.setProperty('--accent-rgb',  `${r}, ${g}, ${b}`);
  html.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.35)`);
};

BrowserOS.setTheme    = function (t) { this.state.theme    = t; this._applyTheme(); this._saveState(); };
BrowserOS.setWallpaper= function (w) { this.state.wallpaper= w; this._applyTheme(); this._saveState(); };
BrowserOS.setAccent   = function (c) { this.state.accent   = c; this._applyTheme(); this._saveState(); };

// clock
BrowserOS._initClock = function () {
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const tick = () => {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock-time').textContent = `${h}:${m}`;
    document.getElementById('clock-date').textContent =
      `${DAYS[now.getDay()]} ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  };
  tick();
  setInterval(tick, 1000);
};

// desktop icons — double-click to open
BrowserOS._setupDesktopIcons = function () {
  let lastClick = { app: null, time: 0 };

  document.querySelectorAll('.desktop-icon').forEach(icon => {
    const app = icon.dataset.app;

    // Handle both double-click events and fast single clicks (mobile-friendly)
    icon.addEventListener('dblclick', () => {
      this.openApp(app);
      icon.classList.remove('selected');
    });

    icon.addEventListener('click', () => {
      // Deselect all
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      const now = Date.now();
      if (lastClick.app === app && now - lastClick.time < 400) {
        this.openApp(app);
        icon.classList.remove('selected');
      } else {
        icon.classList.add('selected');
      }
      lastClick = { app, time: now };
    });
  });

  // Click on desktop background → deselect icons
  document.getElementById('desktop').addEventListener('mousedown', e => {
    if (!e.target.closest('.desktop-icon') && !e.target.closest('.window')) {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    }
  });
};

// start menu
BrowserOS._setupStartMenu = function () {
  document.getElementById('start-btn').addEventListener('click', () => this.toggleStartMenu());

  document.getElementById('shutdown-btn').addEventListener('click', () => {
    this.closeStartMenu();
    this._shutdown();
  });

  // Start menu app items
  document.querySelectorAll('.start-item').forEach(item => {
    item.addEventListener('click', () => {
      this.openApp(item.dataset.app);
      this.closeStartMenu();
    });
  });

  // Search filter
  document.getElementById('start-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.start-item').forEach(item => {
      const label = item.querySelector('.start-item-label').textContent.toLowerCase();
      item.classList.toggle('hidden', q !== '' && !label.includes(q));
    });
  });
};

BrowserOS.toggleStartMenu = function () {
  document.getElementById('start-menu').classList.toggle('hidden');
  if (!document.getElementById('start-menu').classList.contains('hidden')) {
    setTimeout(() => document.getElementById('start-search').focus(), 50);
  }
};
BrowserOS.closeStartMenu = function () {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('start-search').value = '';
  document.querySelectorAll('.start-item').forEach(i => i.classList.remove('hidden'));
};

// taskbar
BrowserOS._setupTaskbar = function () { /* app buttons added dynamically */ };

// global event listeners
BrowserOS._setupGlobalListeners = function () {

  /* Drag move */
  document.addEventListener('mousemove', e => {
    if (this._drag) {
      const win = this.windows[this._drag.winId];
      if (!win || win.maximized) return;
      let nx = e.clientX - this._drag.offsetX;
      let ny = e.clientY - this._drag.offsetY;
      // Clamp: always keep some of the titlebar visible
      const tbH = 48;
      nx = Math.max(-win.w + 120, Math.min(nx, window.innerWidth - 40));
      ny = Math.max(0,            Math.min(ny, window.innerHeight - tbH - 10));
      win.x = nx; win.y = ny;
      win.el.style.left = nx + 'px';
      win.el.style.top  = ny + 'px';
    }

    if (this._resize) {
      const win = this.windows[this._resize.winId];
      if (!win) return;
      const dw = e.clientX - this._resize.startX;
      const dh = e.clientY - this._resize.startY;
      const nw = Math.max(300, this._resize.startW + dw);
      const nh = Math.max(200, this._resize.startH + dh);
      win.w = nw; win.h = nh;
      win.el.style.width  = nw + 'px';
      win.el.style.height = nh + 'px';
    }
  });

  /* Drag / resize end */
  document.addEventListener('mouseup', () => {
    this._drag   = null;
    this._resize = null;
    document.querySelectorAll('.window').forEach(w => w.classList.remove('dragging'));
  });

  /* Close start menu & context menu on outside click */
  document.addEventListener('mousedown', e => {
    if (!document.getElementById('start-menu').classList.contains('hidden')) {
      if (!e.target.closest('#start-menu') && !e.target.closest('#start-btn')) {
        this.closeStartMenu();
      }
    }
    const cm = document.getElementById('context-menu');
    if (cm && !cm.contains(e.target)) cm.remove();
  });

  /* Right-click on desktop background */
  document.getElementById('desktop').addEventListener('contextmenu', e => {
    if (e.target.closest('.window') || e.target.closest('.desktop-icon')) return;
    e.preventDefault();
    this.showContextMenu(e.clientX, e.clientY, [
      { label: '🖥️  Desktop', disabled: true },
      { sep: true },
      { label: '📝  New Note',    action: () => this.openApp('notes') },
      { label: '💻  Terminal',    action: () => this.openApp('terminal') },
      { sep: true },
      { label: '⚙️  Settings',   action: () => this.openApp('settings') },
      { label: '🔄  Refresh',    action: () => location.reload() },
    ]);
  });

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    // Ctrl+Esc = toggle start menu
    if (e.ctrlKey && e.key === 'Escape') {
      e.preventDefault();
      this.toggleStartMenu();
    }
    // Escape = close start menu / context menu
    if (e.key === 'Escape') {
      this.closeStartMenu();
      const cm = document.getElementById('context-menu');
      if (cm) cm.remove();
    }
  });
};

// window manager

BrowserOS.openApp = function (appId) {
  // Single-instance: focus/restore if already open
  const existing = Object.values(this.windows).find(w => w.appId === appId);
  if (existing) {
    if (existing.minimized) this.restoreWindow(existing.id);
    else this.focusWindow(existing.id);
    return;
  }

  const def = this.appDefs[appId];
  if (!def) return;

  const winId = `win_${appId}_${Date.now()}`;
  const count = Object.keys(this.windows).length;
  const x = 60 + (count % 8) * 28;
  const y = 40 + (count % 6) * 24;

  /* Build the window element */
  const el = document.createElement('div');
  el.className = 'window';
  el.id = winId;
  el.style.cssText = `width:${def.w}px;height:${def.h}px;left:${x}px;top:${y}px;z-index:${++this._zCounter}`;

  el.innerHTML = `
    <div class="window-titlebar">
      <div class="window-controls">
        <button class="win-btn close"    title="Close"></button>
        <button class="win-btn minimize" title="Minimize"></button>
        <button class="win-btn maximize" title="Maximize"></button>
      </div>
      <span class="win-icon">${def.icon}</span>
      <span class="win-title">${def.title}</span>
    </div>
    <div class="window-content" id="${winId}_content"></div>
    <div class="window-resize"></div>
  `;

  document.getElementById('windows-container').appendChild(el);

  /* Store window data */
  const win = {
    id: winId, appId,
    title: def.title, icon: def.icon,
    el,
    contentEl: document.getElementById(`${winId}_content`),
    x, y, w: def.w, h: def.h,
    zIndex: this._zCounter,
    minimized: false, maximized: false,
    taskbarBtn: null,
  };
  this.windows[winId] = win;

  /* Wire up window controls */
  el.querySelector('.win-btn.close')   .addEventListener('click', e => { e.stopPropagation(); this.closeWindow(winId); });
  el.querySelector('.win-btn.minimize').addEventListener('click', e => { e.stopPropagation(); this.minimizeWindow(winId); });
  el.querySelector('.win-btn.maximize').addEventListener('click', e => { e.stopPropagation(); this.toggleMaximize(winId); });

  /* Drag via title bar */
  el.querySelector('.window-titlebar').addEventListener('mousedown', e => {
    if (e.target.closest('.window-controls')) return;
    if (e.button !== 0) return;
    this.focusWindow(winId);
    if (this.windows[winId].maximized) return;
    el.classList.add('dragging');
    const rect = el.getBoundingClientRect();
    this._drag = { winId, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
  });

  /* Resize handle */
  el.querySelector('.window-resize').addEventListener('mousedown', e => {
    e.stopPropagation();
    if (e.button !== 0) return;
    this._resize = {
      winId,
      startX: e.clientX, startY: e.clientY,
      startW: win.w, startH: win.h,
    };
  });

  /* Focus on click anywhere in window */
  el.addEventListener('mousedown', () => this.focusWindow(winId));

  /* Double-click title bar → toggle maximize */
  el.querySelector('.window-titlebar').addEventListener('dblclick', e => {
    if (e.target.closest('.window-controls')) return;
    this.toggleMaximize(winId);
  });

  /* Taskbar button */
  this._addTaskbarBtn(winId);

  /* Focus it */
  this.focusWindow(winId);

  /* Init app module */
  const mod = this.AppModules[appId];
  if (mod && typeof mod.init === 'function') {
    mod.init(winId, win.contentEl);
  }
};

/* ── Close ─────────────────────────────────────────────────── */
BrowserOS.closeWindow = function (winId) {
  const win = this.windows[winId];
  if (!win) return;

  // Destroy app module if it has a cleanup method
  const mod = this.AppModules[win.appId];
  if (mod && typeof mod.destroy === 'function') mod.destroy(winId);

  win.el.classList.add('closing');
  win.el.addEventListener('animationend', () => {
    win.el.remove();
    if (win.taskbarBtn) win.taskbarBtn.remove();
    delete this.windows[winId];
    if (this._activeWinId === winId) this._activeWinId = null;
  }, { once: true });
};

/* ── Minimize ───────────────────────────────────────────────── */
BrowserOS.minimizeWindow = function (winId) {
  const win = this.windows[winId];
  if (!win || win.minimized) return;
  win.el.classList.add('minimizing');
  win.el.addEventListener('animationend', () => {
    win.el.style.display = 'none';
    win.el.classList.remove('minimizing');
    win.minimized = true;
    win.taskbarBtn && win.taskbarBtn.classList.remove('active');
  }, { once: true });
  if (this._activeWinId === winId) this._activeWinId = null;
};

/* ── Restore ────────────────────────────────────────────────── */
BrowserOS.restoreWindow = function (winId) {
  const win = this.windows[winId];
  if (!win || !win.minimized) return;
  win.el.style.display = 'flex';
  win.el.classList.add('restoring');
  win.el.addEventListener('animationend', () => win.el.classList.remove('restoring'), { once: true });
  win.minimized = false;
  this.focusWindow(winId);
};

/* ── Toggle Maximize ────────────────────────────────────────── */
BrowserOS.toggleMaximize = function (winId) {
  const win = this.windows[winId];
  if (!win) return;
  if (win.maximized) {
    win.el.style.width  = win.w + 'px';
    win.el.style.height = win.h + 'px';
    win.el.style.left   = win.x + 'px';
    win.el.style.top    = win.y + 'px';
    win.el.classList.remove('maximized');
    win.maximized = false;
  } else {
    // save current geometry
    win.x = win.el.offsetLeft;
    win.y = win.el.offsetTop;
    win.w = win.el.offsetWidth;
    win.h = win.el.offsetHeight;
    win.el.classList.add('maximized');
    win.maximized = true;
  }
};

/* ── Focus ──────────────────────────────────────────────────── */
BrowserOS.focusWindow = function (winId) {
  const win = this.windows[winId];
  if (!win) return;
  win.zIndex = ++this._zCounter;
  win.el.style.zIndex = win.zIndex;

  // Remove focused / active state from all
  Object.values(this.windows).forEach(w => {
    w.el.classList.remove('focused');
    w.taskbarBtn && w.taskbarBtn.classList.remove('active');
  });

  win.el.classList.add('focused');
  win.taskbarBtn && win.taskbarBtn.classList.add('active');
  this._activeWinId = winId;
};

/* ── Taskbar button ─────────────────────────────────────────── */
BrowserOS._addTaskbarBtn = function (winId) {
  const win = this.windows[winId];
  if (!win) return;
  const btn = document.createElement('button');
  btn.className = 'taskbar-btn';
  btn.dataset.winId = winId;
  btn.innerHTML = `<span class="btn-icon">${win.icon}</span><span>${win.title}</span>`;

  btn.addEventListener('click', () => {
    if (win.minimized) {
      this.restoreWindow(winId);
    } else if (this._activeWinId === winId) {
      this.minimizeWindow(winId);
    } else {
      this.focusWindow(winId);
    }
  });

  btn.addEventListener('contextmenu', e => {
    e.preventDefault();
    this.showContextMenu(e.clientX, e.clientY, [
      { label: `${win.icon}  ${win.title}`, disabled: true },
      { sep: true },
      { label: '🔲  Restore',   action: () => win.minimized ? this.restoreWindow(winId) : this.focusWindow(winId) },
      { label: '🔽  Minimize',  action: () => this.minimizeWindow(winId) },
      { label: '⊡   Maximize',  action: () => this.toggleMaximize(winId) },
      { sep: true },
      { label: '✕   Close',     action: () => this.closeWindow(winId), danger: true },
    ]);
  });

  document.getElementById('taskbar-apps').appendChild(btn);
  win.taskbarBtn = btn;
};

// context menu
BrowserOS.showContextMenu = function (x, y, items) {
  const old = document.getElementById('context-menu');
  if (old) old.remove();

  const menu = document.createElement('div');
  menu.id = 'context-menu';

  items.forEach(item => {
    if (item.sep) {
      const s = document.createElement('div');
      s.className = 'ctx-sep';
      menu.appendChild(s);
    } else {
      const el = document.createElement('div');
      el.className = 'ctx-item' + (item.danger ? ' danger' : '') + (item.disabled ? ' disabled' : '');
      el.textContent = item.label;
      if (item.action && !item.disabled) {
        el.addEventListener('click', () => { item.action(); menu.remove(); });
      }
      menu.appendChild(el);
    }
  });

  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
  document.body.appendChild(menu);

  // Reposition if off-screen
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x - r.width)  + 'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y - r.height) + 'px';
  });
};

// notifications
BrowserOS.notify = function (msg, duration = 3000) {
  const area = document.getElementById('notification-area');
  const el   = document.createElement('div');
  el.className = 'notif';
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
};

// shutdown
BrowserOS._shutdown = function () {
  this._saveState();
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed;inset:0;background:#000;z-index:999999',
    'display:flex;align-items:center;justify-content:center',
    'flex-direction:column;gap:14px;opacity:0;transition:opacity 0.5s ease',
    'font-family:system-ui;color:#fff',
  ].join(';');
  overlay.innerHTML = `<div style="font-size:52px">⏻</div><div style="font-size:16px;opacity:.7">Shutting down…</div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  setTimeout(() => {
    overlay.innerHTML = `
      <div style="font-size:40px">💻</div>
      <div style="font-size:20px;font-weight:700">BrowserOS Lite</div>
      <div style="font-size:13px;opacity:.5;margin-top:4px">It is now safe to close your browser tab.</div>
    `;
  }, 1400);
};

// fake filesystem
BrowserOS.FS = {
  _db: null,

  init () {
    try { this._db = JSON.parse(localStorage.getItem('bos_fs') || 'null'); } catch (_) {}
    if (!this._db) {
      this._db = {
        '/':             { type: 'dir', children: ['Desktop', 'Documents', 'Notes', 'Downloads'] },
        '/Desktop':      { type: 'dir', children: [] },
        '/Documents':    { type: 'dir', children: ['readme.txt', 'about.txt'] },
        '/Notes':        { type: 'dir', children: [] },
        '/Downloads':    { type: 'dir', children: [] },
        '/Documents/readme.txt': {
          type: 'file',
          content: 'Welcome to BrowserOS Lite!\n\nThis is a simulated filesystem stored in localStorage.\n\nYou can create files and folders using the Files app or the Terminal.',
        },
        '/Documents/about.txt': {
          type: 'file',
          content: 'BrowserOS Lite v1.0\n\nA lightweight browser-based desktop environment.\nBuilt with HTML, CSS, and JavaScript — no frameworks.',
        },
      };
      this._save();
    }
  },

  _save () { localStorage.setItem('bos_fs', JSON.stringify(this._db)); },

  /* Returns array of child names, or null if not a dir */
  ls (path) {
    const node = this._db[this._norm(path)];
    return (node && node.type === 'dir') ? [...node.children] : null;
  },

  /* Returns file content string, or null */
  cat (path) {
    const node = this._db[this._norm(path)];
    return (node && node.type === 'file') ? node.content : null;
  },

  /* Write or overwrite a file */
  write (path, content) {
    path = this._norm(path);
    const parent = this._parent(path);
    const name   = this._basename(path);
    if (!this._db[parent] || this._db[parent].type !== 'dir') return false;
    this._db[path] = { type: 'file', content };
    if (!this._db[parent].children.includes(name)) this._db[parent].children.push(name);
    this._save();
    return true;
  },

  /* Create a directory */
  mkdir (path) {
    path = this._norm(path);
    const parent = this._parent(path);
    const name   = this._basename(path);
    if (!this._db[parent] || this._db[parent].type !== 'dir') return false;
    if (this._db[path]) return false;
    this._db[path] = { type: 'dir', children: [] };
    this._db[parent].children.push(name);
    this._save();
    return true;
  },

  /* Remove a file or directory (recursive) */
  rm (path) {
    path = this._norm(path);
    if (!this._db[path]) return false;
    const parent = this._parent(path);
    const name   = this._basename(path);
    // Remove from parent
    if (this._db[parent]) {
      this._db[parent].children = this._db[parent].children.filter(c => c !== name);
    }
    // Recursively delete children
    const _del = (p) => {
      const node = this._db[p];
      if (!node) return;
      if (node.type === 'dir') node.children.forEach(c => _del(p === '/' ? '/' + c : p + '/' + c));
      delete this._db[p];
    };
    _del(path);
    this._save();
    return true;
  },

  /* Rename / move */
  rename (oldPath, newPath) {
    oldPath = this._norm(oldPath);
    newPath = this._norm(newPath);
    if (!this._db[oldPath] || this._db[newPath]) return false;
    const oldParent  = this._parent(oldPath);
    const newParent  = this._parent(newPath);
    const oldName    = this._basename(oldPath);
    const newName    = this._basename(newPath);
    if (!this._db[newParent] || this._db[newParent].type !== 'dir') return false;
    this._db[newPath] = this._db[oldPath];
    delete this._db[oldPath];
    if (this._db[oldParent]) {
      this._db[oldParent].children = this._db[oldParent].children.filter(c => c !== oldName);
    }
    if (!this._db[newParent].children.includes(newName)) {
      this._db[newParent].children.push(newName);
    }
    this._save();
    return true;
  },

  exists (path) { return !!this._db[this._norm(path)]; },
  type   (path) { const n = this._db[this._norm(path)]; return n ? n.type : null; },

  /* ── Helpers ── */
  _norm (p) { p = p.replace(/\/+$/, '').replace(/\/{2,}/g, '/'); return p || '/'; },
  _parent (p) {
    const idx = p.lastIndexOf('/');
    if (idx <= 0) return '/';
    return p.substring(0, idx);
  },
  _basename (p) { return p.substring(p.lastIndexOf('/') + 1); },
};
