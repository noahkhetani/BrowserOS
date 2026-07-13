# browseros lite

live at: https://browseros-napl.onrender.com/

a little desktop environment that runs in the browser - html, css and plain js,
no frameworks and no backend, all client side. it's got a window manager, a
terminal, a few desktop apps, a shared fake filesystem, and it saves to
localstorage.

## what's in it

**desktop** - animated boot/shutdown, a few wallpapers and themes, desktop icons
(select + double-click), right-click context menu, keyboard shortcuts.

**window manager** - drag + resize windows, minimize/maximize/restore/close
animations, focus + z-index handling, single-instance apps, taskbar for open
windows.

**taskbar + start menu** - running app indicators, live clock, searchable start
menu, app launcher, window controls from the taskbar.

**notes** - saved to localstorage, auto-save, sidebar previews, word/char counts.

**terminal** - command history, tab completion, relative + absolute paths,
simulated fs commands, system info, and u can launch apps from it.

**files** - the shared virtual filesystem, folder navigation, create/rename/
delete, context menus.

**settings** - theme switching, accent colour, wallpapers, storage stats, system
info.

## the filesystem

it's fully faked and stored in localstorage. whatever u do in the terminal shows
up in the files app and vice versa. u can make dirs, make files, rename, delete
(including recursive), and navigate paths.

## layout

```
/browser-os-lite
  index.html
  style.css
  app.js
  /apps
    notes.js
    terminal.js
    files.js
    settings.js
  /assets
```

## maybe later

more apps, better filesystem, a package/app system, a browser app, some kind of
collab, plugins, perf work.

## license

mit.
