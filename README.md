# NetPad Pro

A modern, feature-rich notepad built for network engineers. Rich text editing, Cisco config highlighting, split panes, config diffing, and networking utilities — all in one desktop app.

---

## Features

### Editor
- Rich text with bold, italic, underline, strikethrough, headings, blockquotes, and inline code
- Font family and size selection (per-document or per-selection)
- Text color and multi-color highlighting
- Format Painter — copy and apply formatting across selections
- Resizable tables with header rows and a visual grid picker
- Image support (file insert, clipboard paste, Base64)
- Hyperlinks with Ctrl/Cmd+click to open
- Bullet and ordered lists, horizontal rules, code blocks
- Character count
- Optional line numbers and word wrap
- Markdown paste (auto-converts to rich text) and Markdown export

### Layout
- Tabbed interface with drag-and-drop tab reordering across panes
- Split panes — horizontal and vertical, up to 4 simultaneous panes
- Resizable panels with persistent layout saved to local storage
- Double-click to rename tabs
- Auto-save with debounced writes and before-unload protection

### Cisco Config Tools
- **Syntax Highlighting** — automatic coloring for hostnames, interfaces, ACLs, IP addresses, permit/deny, status indicators, and more
- **Config Diff** — side-by-side comparison with line-level additions and removals; drag tabs directly into diff slots
- **Keyword Highlighting** — custom regex-based rules with color and case-sensitivity controls; import from JSON or SecureCRT `.ini` files
- **Cisco Config Detection** — scored heuristic detection of Cisco-like configurations

### Networking Utilities
- **IP Subnet Calculator** — network, broadcast, CIDR, and host range calculations
- **MAC Address Lookup** — local OUI database with online fallback; supports Cisco, colon, and dash formats
- **Sticky Notes** — draggable to-do notes for quick reminders

### Column Selection
- Alt+drag for rectangular block selection
- Alt+Shift+Arrow to extend column selections via keyboard
- Column-aware copy and paste

### Customization
- Light and dark themes
- Configurable font family and size (10–32px)
- Toggle line numbers, word wrap, spellcheck, and Cisco highlighting
- Weather widget with geolocation and manual city entry

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New tab |
| Ctrl+W | Close tab |
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+K | Insert hyperlink |
| Ctrl+Shift+V | Paste as plain text |
| Ctrl+\\ | Split pane right |
| Ctrl+Shift+\\ | Split pane down |
| Ctrl+, | Settings |
| Ctrl+F | Find |
| Ctrl+H | Find & Replace |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+Z / Ctrl+Y | Undo / Redo |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, Vite 8 |
| Desktop | Electron 35 |
| Editor | Tiptap 2 |
| Layout | react-resizable-panels, @dnd-kit |
| Styling | Tailwind CSS 4 |
| Testing | Vitest |
| Build | electron-builder |

---

## Getting Started

```bash
# Install dependencies
npm install

# Run in browser
npm run dev

# Run as desktop app
npm run electron:dev
```

## Building

```bash
# Web build
npm run build

# Desktop — macOS
npm run electron:build:mac

# Desktop — Windows
npm run electron:build:win
```

---

## License

MIT
