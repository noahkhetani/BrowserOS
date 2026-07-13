// browseros lite — terminal app  (apps/terminal.js)

BrowserOS.AppModules.terminal = (() => {

  /* ── State ────────────────────────────────────────────────── */
  let _winId   = null;
  let _cwd     = '/';
  let _history = [];
  let _hIdx    = -1;

  /* ── DOM ──────────────────────────────────────────────────── */
  function $id (id) { return document.getElementById(id); }
  function out () { return $id(`${_winId}_output`); }

  /* ── Render ───────────────────────────────────────────────── */
  function render (container) {
    container.innerHTML = `
      <div class="terminal-layout">
        <div class="terminal-output" id="${_winId}_output"></div>
        <div class="terminal-input-row">
          <span class="term-prompt-label" id="${_winId}_prompt">${_prompt()}</span>
          <input
            class="terminal-input"
            id="${_winId}_input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="type a command…"
          />
        </div>
      </div>
    `;

    _print('system', '  BrowserOS Lite Terminal  v1.0');
    _print('system', '  Type "help" for available commands.');
    _print('blank', '');

    const input = $id(`${_winId}_input`);
    input.focus();

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const cmd = input.value;
        input.value = '';
        if (cmd.trim()) { _history.unshift(cmd.trim()); _hIdx = -1; }
        _run(cmd.trim());
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (_hIdx < _history.length - 1) input.value = _history[++_hIdx];
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (_hIdx > 0) input.value = _history[--_hIdx];
        else { _hIdx = -1; input.value = ''; }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        _tabComplete(input);
      }
    });

    // Click anywhere in terminal → focus input
    container.addEventListener('click', () => input.focus());
  }

  /* ── Prompt ───────────────────────────────────────────────── */
  function _prompt () { return `user@browseros:${_cwd}$`; }

  function _updatePrompt () {
    const el = $id(`${_winId}_prompt`);
    if (el) el.textContent = _prompt();
  }

  /* ── Print ────────────────────────────────────────────────── */
  function _print (type, text) {
    const o = out();
    if (!o) return;
    const line = document.createElement('div');
    line.className = `term-line ${type}`;
    line.textContent = text;
    o.appendChild(line);
    o.scrollTop = o.scrollHeight;
  }

  function _printPrompt (cmd) {
    _print('prompt', `${_prompt()} ${cmd}`);
  }

  /* ── Tab completion ───────────────────────────────────────── */
  function _tabComplete (input) {
    const val   = input.value;
    const parts = val.split(/\s+/);
    if (parts.length < 2) return;
    const partial = parts[parts.length - 1];
    const dir     = partial.includes('/')
      ? BrowserOS.FS._norm(_resolvePath(partial.substring(0, partial.lastIndexOf('/') + 1)))
      : _cwd;
    const prefix = partial.includes('/')
      ? partial.substring(partial.lastIndexOf('/') + 1)
      : partial;
    const items   = BrowserOS.FS.ls(dir) || [];
    const matches = items.filter(i => i.toLowerCase().startsWith(prefix.toLowerCase()));
    if (matches.length === 1) {
      const rest = matches[0].substring(prefix.length);
      const suffix = BrowserOS.FS.type(
        dir === '/' ? '/' + matches[0] : dir + '/' + matches[0]
      ) === 'dir' ? '/' : '';
      input.value = val + rest + suffix;
    } else if (matches.length > 1) {
      _print('output', matches.join('   '));
    }
  }

  /* ── Path resolution ─────────────────────────────────────── */
  function _resolvePath (p) {
    if (!p || p === '~') return '/';
    if (p.startsWith('/')) return BrowserOS.FS._norm(p);
    if (p === '..') {
      const parts = _cwd.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/') || '/';
    }
    if (p === '.') return _cwd;
    // Handle relative path with ..
    if (p.includes('/')) {
      const segs = (_cwd === '/' ? '' : _cwd).split('/').concat(p.split('/'));
      const resolved = [];
      segs.forEach(s => {
        if (s === '..') resolved.pop();
        else if (s && s !== '.') resolved.push(s);
      });
      return '/' + resolved.join('/') || '/';
    }
    return (_cwd === '/' ? '/' : _cwd + '/') + p;
  }

  /* ── Command runner ──────────────────────────────────────── */
  function _run (cmd) {
    _printPrompt(cmd);
    if (!cmd) return;

    const [command, ...args] = cmd.trim().split(/\s+/);

    switch (command.toLowerCase()) {
      case 'help':     _cmdHelp();                    break;
      case 'clear':    _cmdClear();                   break;
      case 'echo':     _print('output', args.join(' ')); break;
      case 'date':     _print('output', new Date().toString()); break;
      case 'pwd':      _print('output', _cwd);        break;
      case 'ls':       _cmdLs(args[0]);               break;
      case 'cd':       _cmdCd(args[0]);               break;
      case 'cat':      _cmdCat(args[0]);              break;
      case 'mkdir':    _cmdMkdir(args[0]);             break;
      case 'touch':    _cmdTouch(args[0]);             break;
      case 'rm':       _cmdRm(args);                  break;
      case 'mv':       _cmdMv(args[0], args[1]);      break;
      case 'whoami':   _print('output', 'user');      break;
      case 'hostname': _print('output', 'browseros'); break;
      case 'uname':    _print('output', 'BrowserOS Lite 1.0 (browser)'); break;
      case 'uptime':   _print('output', `up ${Math.floor(performance.now()/60000)} minutes`); break;
      case 'history':  _cmdHistory();                  break;
      case 'open':     _cmdOpen(args[0]);              break;
      case 'neofetch': _cmdNeofetch();                 break;
      case 'version':
      case 'ver':      _print('info', 'BrowserOS Lite v1.0.0'); break;
      default:
        _print('error', `command not found: ${command}`);
        _print('error', `  → type "help" for a list of available commands`);
    }
  }

  /* ── Commands ─────────────────────────────────────────────── */
  function _cmdHelp () {
    const lines = [
      '',
      '  BrowserOS Lite Terminal — Available Commands',
      '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '  FILESYSTEM',
      '    ls  [path]         List directory contents',
      '    pwd                Print working directory',
      '    cd  <path>         Change directory  (cd .. to go up)',
      '    cat <file>         Print file contents',
      '    mkdir <name>       Create directory',
      '    touch <name>       Create empty file',
      '    rm  <path>         Remove file or directory',
      '    mv  <src> <dst>    Rename / move file or directory',
      '',
      '  SYSTEM',
      '    help               Show this help text',
      '    clear              Clear the terminal',
      '    echo <text>        Print text',
      '    date               Show current date and time',
      '    whoami             Print current user',
      '    uname              Print system information',
      '    uptime             Show system uptime',
      '    history            Show command history',
      '    neofetch           Fancy system info display',
      '    version            Show OS version',
      '',
      '  APPS',
      '    open <app>         Open app: notes, terminal, files, settings',
      '',
    ];
    lines.forEach(l => _print('info', l));
  }

  function _cmdClear () {
    const o = out();
    if (o) o.innerHTML = '';
  }

  function _cmdLs (pathArg) {
    const path  = pathArg ? _resolvePath(pathArg) : _cwd;
    const items = BrowserOS.FS.ls(path);
    if (items === null) { _print('error', `ls: ${path}: No such directory`); return; }
    if (items.length === 0) { _print('output', '(empty)'); return; }
    items.forEach(name => {
      const fp   = path === '/' ? '/' + name : path + '/' + name;
      const type = BrowserOS.FS.type(fp);
      const icon = type === 'dir' ? '📁' : '📄';
      _print('output', `  ${icon}  ${name}${type === 'dir' ? '/' : ''}`);
    });
  }

  function _cmdCd (pathArg) {
    const newPath = _resolvePath(pathArg || '/');
    if (!BrowserOS.FS.exists(newPath)) {
      _print('error', `cd: ${pathArg}: No such file or directory`);
      return;
    }
    if (BrowserOS.FS.type(newPath) !== 'dir') {
      _print('error', `cd: ${pathArg}: Not a directory`);
      return;
    }
    _cwd = newPath;
    _updatePrompt();
  }

  function _cmdCat (pathArg) {
    if (!pathArg) { _print('error', 'cat: missing file operand'); return; }
    const path    = _resolvePath(pathArg);
    const content = BrowserOS.FS.cat(path);
    if (content === null) { _print('error', `cat: ${pathArg}: No such file or directory`); return; }
    content.split('\n').forEach(line => _print('output', line));
  }

  function _cmdMkdir (name) {
    if (!name) { _print('error', 'mkdir: missing operand'); return; }
    const path = _resolvePath(name);
    if (BrowserOS.FS.mkdir(path)) _print('success', `mkdir: created directory '${path}'`);
    else _print('error', `mkdir: cannot create directory '${name}'`);
  }

  function _cmdTouch (name) {
    if (!name) { _print('error', 'touch: missing file operand'); return; }
    const path = _resolvePath(name);
    if (BrowserOS.FS.write(path, '')) _print('success', `'${path}'`);
    else _print('error', `touch: cannot create file '${name}'`);
  }

  function _cmdRm (args) {
    if (!args.length) { _print('error', 'rm: missing operand'); return; }
    args.forEach(a => {
      const path = _resolvePath(a);
      if (!BrowserOS.FS.exists(path)) { _print('error', `rm: '${a}': No such file or directory`); return; }
      BrowserOS.FS.rm(path);
      _print('success', `removed '${path}'`);
    });
  }

  function _cmdMv (src, dst) {
    if (!src || !dst) { _print('error', 'mv: missing operand'); return; }
    const sp = _resolvePath(src);
    const dp = _resolvePath(dst);
    if (BrowserOS.FS.rename(sp, dp)) _print('success', `'${sp}' → '${dp}'`);
    else _print('error', `mv: cannot move '${src}' to '${dst}'`);
  }

  function _cmdHistory () {
    _history.forEach((h, i) => _print('output', `  ${String(_history.length - i).padStart(3)}  ${h}`));
  }

  function _cmdOpen (appName) {
    const valid = ['notes', 'terminal', 'files', 'settings'];
    if (!appName) { _print('error', 'open: specify an app: ' + valid.join(', ')); return; }
    if (!valid.includes(appName)) { _print('error', `open: unknown app '${appName}'`); return; }
    BrowserOS.openApp(appName);
    _print('success', `opened ${appName}`);
  }

  function _cmdNeofetch () {
    const theme    = BrowserOS.state.theme;
    const wallpaper= BrowserOS.state.wallpaper;
    const upmin    = Math.floor(performance.now() / 60000);
    const ua       = navigator.userAgent;
    const browser  = ua.includes('Chrome') ? 'Chrome' :
                     ua.includes('Firefox') ? 'Firefox' :
                     ua.includes('Safari') ? 'Safari' : 'Browser';
    const lines = [
      '',
      '    ██████╗ ██████╗  ██████╗',
      '    ██╔══██╗██╔══██╗██╔═══██╗',
      '    ██████╔╝██████╔╝██║   ██║',
      '    ██╔══██╗██╔══██╗██║   ██║',
      '    ██████╔╝██║  ██║╚██████╔╝',
      '    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝',
      '',
      `    OS:         BrowserOS Lite 1.0.0`,
      `    Shell:      BrowserOS Shell`,
      `    Browser:    ${browser}`,
      `    Theme:      ${theme}`,
      `    Wallpaper:  ${wallpaper}`,
      `    Accent:     ${BrowserOS.state.accent}`,
      `    Storage:    localStorage`,
      `    Uptime:     ${upmin} min`,
      `    Resolution: ${window.innerWidth}×${window.innerHeight}`,
      '',
    ];
    lines.forEach(l => _print('info', l));
  }

  /* ── Public API ───────────────────────────────────────────── */
  return {
    init (winId, container) {
      _winId   = winId;
      _cwd     = '/';
      _history = [];
      _hIdx    = -1;
      render(container);
    },
  };
})();
