// browseros lite — notes app  (apps/notes.js)

BrowserOS.AppModules.notes = (() => {

  /* ── Private module state ────────────────────────────────── */
  let _winId      = null;
  let _notes      = [];
  let _activeId   = null;
  let _saveTimer  = null;

  /* ── Storage helpers ─────────────────────────────────────── */
  function load () {
    try {
      const raw = localStorage.getItem('bos_notes');
      if (raw) _notes = JSON.parse(raw);
    } catch (_) {}
    if (!_notes.length) {
      _notes = [{
        id:      _uid(),
        title:   'Welcome ✨',
        content: 'Welcome to Notes!\n\nThis app auto-saves as you type.\nYou can create multiple notes using the + button in the sidebar.\n\nEnjoy!',
        updated: Date.now(),
      }];
    }
    if (!_activeId || !_notes.find(n => n.id === _activeId)) {
      _activeId = _notes[0].id;
    }
  }

  function save () {
    localStorage.setItem('bos_notes', JSON.stringify(_notes));
  }

  function _uid () { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  /* ── DOM helpers ──────────────────────────────────────────── */
  function $  (sel) { return document.querySelector(`#${_winId} ${sel}`); }
  function $$ (sel) { return document.querySelectorAll(`#${_winId} ${sel}`); }
  function $id (id) { return document.getElementById(id); }

  /* ── Render ───────────────────────────────────────────────── */
  function render (container) {
    container.innerHTML = `
      <div class="notes-layout">

        <!-- Sidebar -->
        <div class="notes-sidebar">
          <div class="notes-sidebar-hdr">
            <h3>Notes <span style="color:var(--text-dimmer);font-weight:400">${_notes.length}</span></h3>
            <button class="icon-btn" id="${_winId}_new" title="New Note" style="font-size:18px;font-weight:300">+</button>
          </div>
          <div class="notes-list" id="${_winId}_list"></div>
        </div>

        <!-- Editor -->
        <div class="notes-editor">
          <div class="notes-toolbar">
            <input
              class="notes-title-input"
              id="${_winId}_title"
              type="text"
              placeholder="Note title…"
              autocomplete="off"
              spellcheck="false"
            />
            <span class="notes-status" id="${_winId}_status">✓ Saved</span>
            <button class="icon-btn" id="${_winId}_del" title="Delete note">🗑️</button>
          </div>
          <textarea
            class="notes-textarea"
            id="${_winId}_body"
            placeholder="Start writing…"
            spellcheck="true"
          ></textarea>
          <div class="notes-wc" id="${_winId}_wc">0 words</div>
        </div>

      </div>
    `;

    bindEvents();
    renderList();
    loadActive();
  }

  /* ── Sidebar list ─────────────────────────────────────────── */
  function renderList () {
    const list = $id(`${_winId}_list`);
    if (!list) return;

    // Sort by most-recently updated
    const sorted = [..._notes].sort((a, b) => b.updated - a.updated);

    list.innerHTML = sorted.map(n => `
      <div
        class="note-item ${n.id === _activeId ? 'active' : ''}"
        data-id="${n.id}"
      >
        <div class="note-item-title">${_esc(n.title || 'Untitled')}</div>
        <div class="note-item-preview">${_esc((n.content || '').substring(0, 50)) || 'Empty note'}</div>
      </div>
    `).join('');

    list.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', () => {
        _activeId = item.dataset.id;
        renderList();
        loadActive();
      });
    });

    // Update count in header
    const hdr = document.querySelector(`#${_winId} .notes-sidebar-hdr h3`);
    if (hdr) hdr.innerHTML = `Notes <span style="color:var(--text-dimmer);font-weight:400">${_notes.length}</span>`;
  }

  /* ── Load current note into editor ───────────────────────── */
  function loadActive () {
    const note = _notes.find(n => n.id === _activeId);
    if (!note) return;
    const titleEl = $id(`${_winId}_title`);
    const bodyEl  = $id(`${_winId}_body`);
    if (titleEl) titleEl.value = note.title  || '';
    if (bodyEl)  bodyEl.value  = note.content || '';
    updateWordCount();
  }

  /* ── Word count ───────────────────────────────────────────── */
  function updateWordCount () {
    const bodyEl = $id(`${_winId}_body`);
    const wcEl   = $id(`${_winId}_wc`);
    if (!bodyEl || !wcEl) return;
    const words = bodyEl.value.trim().split(/\s+/).filter(Boolean).length;
    const chars = bodyEl.value.length;
    wcEl.textContent = `${words} word${words !== 1 ? 's' : ''} · ${chars} char${chars !== 1 ? 's' : ''}`;
  }

  /* ── Schedule auto-save ───────────────────────────────────── */
  function scheduleSave () {
    const statusEl = $id(`${_winId}_status`);
    if (statusEl) statusEl.textContent = '● Saving…';
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      save();
      if (statusEl) statusEl.textContent = '✓ Saved';
    }, 700);
  }

  /* ── Bind events ──────────────────────────────────────────── */
  function bindEvents () {
    // New note
    $id(`${_winId}_new`).addEventListener('click', () => {
      const n = { id: _uid(), title: 'New Note', content: '', updated: Date.now() };
      _notes.unshift(n);
      _activeId = n.id;
      save();
      renderList();
      loadActive();
      const titleEl = $id(`${_winId}_title`);
      if (titleEl) { titleEl.focus(); titleEl.select(); }
    });

    // Delete note
    $id(`${_winId}_del`).addEventListener('click', () => {
      if (_notes.length <= 1) {
        BrowserOS.notify('Cannot delete the only note.');
        return;
      }
      _notes = _notes.filter(n => n.id !== _activeId);
      _activeId = _notes[0].id;
      save();
      renderList();
      loadActive();
    });

    // Title change
    $id(`${_winId}_title`).addEventListener('input', e => {
      const note = _notes.find(n => n.id === _activeId);
      if (!note) return;
      note.title   = e.target.value;
      note.updated = Date.now();
      renderList();
      scheduleSave();
    });

    // Body change
    $id(`${_winId}_body`).addEventListener('input', e => {
      const note = _notes.find(n => n.id === _activeId);
      if (!note) return;
      note.content = e.target.value;
      note.updated = Date.now();
      updateWordCount();
      renderList();
      scheduleSave();
    });

    // Tab key in textarea → insert two spaces
    $id(`${_winId}_body`).addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const el  = e.target;
        const s   = el.selectionStart;
        const end = el.selectionEnd;
        el.value  = el.value.substring(0, s) + '  ' + el.value.substring(end);
        el.selectionStart = el.selectionEnd = s + 2;
      }
    });
  }

  /* ── Escape HTML ──────────────────────────────────────────── */
  function _esc (s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ── Public API ───────────────────────────────────────────── */
  return {
    init (winId, container) {
      _winId = winId;
      load();
      render(container);
    },

    destroy () {
      clearTimeout(_saveTimer);
      save();
    },
  };
})();
