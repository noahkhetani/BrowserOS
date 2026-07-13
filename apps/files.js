// browseros lite — files app  (apps/files.js)

BrowserOS.AppModules.files = (() => {

  /* ── State ────────────────────────────────────────────────── */
  let _winId    = null;
  let _cwd      = '/';
  let _selected = null;   // full path of selected item

  const ROOTS = ['/', '/Desktop', '/Documents', '/Notes', '/Downloads'];

  /* ── DOM helpers ──────────────────────────────────────────── */
  function $id (id)  { return document.getElementById(id); }
  function q  (sel) { return document.querySelector(`#${_winId}_content ${sel}`); }
  function qa (sel) { return document.querySelectorAll(`#${_winId}_content ${sel}`); }

  /* ── Render ───────────────────────────────────────────────── */
  function render (container) {
    container.innerHTML = `
      <div class="files-layout">

        <!-- Toolbar -->
        <div class="files-toolbar">
          <button class="icon-btn" id="${_winId}_back" title="Go up">
            &#8592;
          </button>
          <div class="files-path-bar" id="${_winId}_path">${_cwd}</div>
          <button class="icon-btn" id="${_winId}_new_folder" title="New Folder">📁</button>
          <button class="icon-btn" id="${_winId}_new_file"   title="New File">📄</button>
        </div>

        <!-- Body -->
        <div class="files-body">

          <!-- Sidebar tree -->
          <div class="files-tree">
            <div class="files-tree-hdr">Places</div>
            ${ROOTS.map(p => `
              <div class="tree-item ${_cwd === p ? 'active' : ''}" data-path="${p}">
                📁 ${p === '/' ? 'Root' : p.split('/').pop()}
              </div>
            `).join('')}
          </div>

          <!-- Main area -->
          <div class="files-main">
            <div class="files-main-hdr" id="${_winId}_main_hdr">${_folderName(_cwd)}</div>
            <div class="files-grid" id="${_winId}_grid">
              ${_renderGrid()}
            </div>
            <div class="files-status" id="${_winId}_status">${_statusText()}</div>
          </div>

        </div>
      </div>
    `;

    _bindEvents(container);
  }

  /* ── Render grid items ────────────────────────────────────── */
  function _renderGrid () {
    const items = BrowserOS.FS.ls(_cwd);
    if (!items) return `<div class="files-empty">Cannot read directory</div>`;
    if (!items.length) return `<div class="files-empty">This folder is empty</div>`;

    return items.map(name => {
      const fp   = _join(_cwd, name);
      const type = BrowserOS.FS.type(fp);
      const icon = type === 'dir' ? '📁' : _fileIcon(name);
      return `
        <div
          class="file-item ${_selected === fp ? 'selected' : ''}"
          data-path="${fp}"
          data-name="${_esc(name)}"
          data-type="${type}"
        >
          <div class="file-item-icon">${icon}</div>
          <div class="file-item-name">${_esc(name)}</div>
        </div>
      `;
    }).join('');
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _join (dir, name) {
    return dir === '/' ? '/' + name : dir + '/' + name;
  }

  function _folderName (path) {
    if (path === '/') return 'Root';
    return path.split('/').filter(Boolean).pop() || 'Root';
  }

  function _statusText () {
    const items = BrowserOS.FS.ls(_cwd) || [];
    const dirs  = items.filter(n => BrowserOS.FS.type(_join(_cwd, n)) === 'dir').length;
    const files = items.length - dirs;
    return `${dirs} folder${dirs !== 1 ? 's' : ''}, ${files} file${files !== 1 ? 's' : ''}`;
  }

  function _fileIcon (name) {
    const ext = name.split('.').pop().toLowerCase();
    const map  = { txt: '📄', md: '📝', js: '📜', html: '🌐', css: '🎨', json: '📋', png: '🖼️', jpg: '🖼️', gif: '🖼️' };
    return map[ext] || '📄';
  }

  function _esc (s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Bind events ──────────────────────────────────────────── */
  function _bindEvents (container) {

    /* Back / up */
    $id(`${_winId}_back`).addEventListener('click', () => _navigateUp());

    /* Sidebar tree */
    container.querySelectorAll('.tree-item').forEach(item => {
      item.addEventListener('click', () => _navigate(item.dataset.path));
    });

    /* New folder */
    $id(`${_winId}_new_folder`).addEventListener('click', () => {
      const name = prompt('New folder name:');
      if (!name || !name.trim()) return;
      const path = _join(_cwd, name.trim());
      if (BrowserOS.FS.mkdir(path)) {
        _refreshGrid();
        BrowserOS.notify(`📁 Folder "${name.trim()}" created`);
      } else {
        BrowserOS.notify('Could not create folder (already exists?)');
      }
    });

    /* New file */
    $id(`${_winId}_new_file`).addEventListener('click', () => {
      const name = prompt('New file name:');
      if (!name || !name.trim()) return;
      const path = _join(_cwd, name.trim());
      if (BrowserOS.FS.write(path, '')) {
        _refreshGrid();
        BrowserOS.notify(`📄 File "${name.trim()}" created`);
      } else {
        BrowserOS.notify('Could not create file');
      }
    });

    /* Grid items */
    _bindGridEvents(container);
  }

  /* ── Grid event binding (called after each refresh) ──────── */
  function _bindGridEvents (container) {
    const grid = $id(`${_winId}_grid`);
    if (!grid) return;

    grid.querySelectorAll('.file-item').forEach(item => {

      /* Single click → select */
      item.addEventListener('click', e => {
        e.stopPropagation();
        _selected = item.dataset.path;
        grid.querySelectorAll('.file-item').forEach(i =>
          i.classList.toggle('selected', i.dataset.path === _selected)
        );
        _updateStatus();
      });

      /* Double click → open / navigate */
      item.addEventListener('dblclick', e => {
        e.stopPropagation();
        if (item.dataset.type === 'dir') {
          _navigate(item.dataset.path);
        } else {
          _openFile(item.dataset.path);
        }
      });

      /* Right click → context menu */
      item.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        _selected = item.dataset.path;
        grid.querySelectorAll('.file-item').forEach(i =>
          i.classList.toggle('selected', i.dataset.path === _selected)
        );
        BrowserOS.showContextMenu(e.clientX, e.clientY, [
          { label: `${item.dataset.type === 'dir' ? '📁' : '📄'}  ${item.dataset.name}`, disabled: true },
          { sep: true },
          ...(item.dataset.type === 'file' ? [{ label: '📂  Open', action: () => _openFile(item.dataset.path) }] : []),
          { label: '✏️  Rename', action: () => _rename(item.dataset.path, item.dataset.name) },
          { sep: true },
          { label: '🗑️  Delete', action: () => _delete(item.dataset.path, item.dataset.name), danger: true },
        ]);
      });
    });

    /* Click on empty grid area → deselect */
    grid.addEventListener('click', () => {
      _selected = null;
      grid.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
      _updateStatus();
    });
  }

  /* ── Navigation ───────────────────────────────────────────── */
  function _navigate (path) {
    _cwd = path;
    _selected = null;
    _refreshAll();
  }

  function _navigateUp () {
    if (_cwd === '/') return;
    const parts = _cwd.split('/').filter(Boolean);
    parts.pop();
    _navigate(parts.length ? '/' + parts.join('/') : '/');
  }

  /* ── Open file in Notes ───────────────────────────────────── */
  function _openFile (path) {
    BrowserOS.openApp('notes');
    BrowserOS.notify(`Tip: Use Terminal → cat ${path} to read files`);
  }

  /* ── Rename ──────────────────────────────────────────────── */
  function _rename (oldPath, oldName) {
    const newName = prompt('Rename to:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const parent  = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
    const newPath = _join(parent, newName.trim());
    if (BrowserOS.FS.rename(oldPath, newPath)) {
      _selected = newPath;
      _refreshGrid();
      BrowserOS.notify(`Renamed to "${newName.trim()}"`);
    } else {
      BrowserOS.notify('Rename failed (name already taken?)');
    }
  }

  /* ── Delete ──────────────────────────────────────────────── */
  function _delete (path, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    BrowserOS.FS.rm(path);
    if (_selected === path) _selected = null;
    _refreshGrid();
    BrowserOS.notify(`🗑️ Deleted "${name}"`);
  }

  /* ── Refresh helpers ─────────────────────────────────────── */
  function _refreshAll () {
    // Path bar
    const pathEl = $id(`${_winId}_path`);
    if (pathEl) pathEl.textContent = _cwd;

    // Header
    const hdrEl = $id(`${_winId}_main_hdr`);
    if (hdrEl) hdrEl.textContent = _folderName(_cwd);

    // Sidebar
    const tree = document.querySelector(`#${_winId}_content .files-tree`);
    if (tree) {
      tree.querySelectorAll('.tree-item').forEach(item => {
        item.classList.toggle('active', item.dataset.path === _cwd);
      });
    }

    _refreshGrid();
  }

  function _refreshGrid () {
    const grid = $id(`${_winId}_grid`);
    if (grid) {
      grid.innerHTML = _renderGrid();
      _bindGridEvents(document.getElementById(`${_winId}_content`));
    }
    _updateStatus();
  }

  function _updateStatus () {
    const el = $id(`${_winId}_status`);
    if (!el) return;
    if (_selected) {
      const name = _selected.split('/').pop();
      const type = BrowserOS.FS.type(_selected);
      el.textContent = `Selected: ${name} (${type})`;
    } else {
      el.textContent = _statusText();
    }
  }

  /* ── Public API ───────────────────────────────────────────── */
  return {
    init (winId, container) {
      _winId    = winId;
      _cwd      = '/';
      _selected = null;
      render(container);
    },
  };
})();
