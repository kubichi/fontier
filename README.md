# Fontier 🔤

> **Modern, high-performance desktop typography and font manager.**  
> A lightweight, open-source desktop font organizer and viewer built for designers, typographers, and developers.

![Fontier Banner](public/fontier_icon.png)

---

## Features

- **  Lightning-Fast Performance (8,000+ Fonts)**
  - Virtual windowed rendering renders only visible fonts in the viewport.
  - On-demand lazy font decoding keeps memory usage low (~180MB RAM) even with massive font collections.
- ** Hierarchical Subfolder Tree**
  - Mirror exact directory structures on import (e.g. `fonts/editorial/serif/...`).
  - Expand and collapse folders with persistent state.
- **Resizable Navigation Panel ("Scaler")**
  - Smoothly drag to scale the sidebar width from **180px up to 800px** to give long folder names ample room.
  - Double-click the grab handle anytime to instantly reset to the standard 260px width.
- **Multi-Select & Bulk Folder Management**
  - **Selection Mode**: Click `Select` in the Folders section header to bulk check folders.
  - **Recursive Selection**: Clicking a parent folder's checkbox toggles the parent and all nested subfolders.
  - **Quick Shortcuts**: Hold `Shift` or `Ctrl` while clicking any folder row to enter selection mode on the fly.
  - **Safe Remove**: "Remove from Fontier" hides folders from the library while keeping local hard drive files 100% untouched.
  - **OS Trash / Recycle Bin**: "Delete from Device" safely moves folders directly to your operating system's Recycle Bin with full confirmation.
- **Real-Time Canvas Customization**
  - Live preview text customization with built-in pangram presets.
  - Adjustable font size, alignment (left, center, right), and row density (comfortable / compact).
  - Dual canvas color picker with curated high-contrast palettes (Classic, Dark, Monokai, Nordic Slate, OLED Black, etc.).
- **Deep Typeface Inspector & Glyph Viewer**
  - Interactive glyph tables, Unicode code points, and character sets.
  - OpenType metadata: designer info, postscript names, units per em, licensing, and file path.
- **Native Windows System Font Detection**
  - Automatically indexes all installed Windows system fonts grouped by typeface family.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

```bash
# Clone repository
git clone https://github.com/kubichi/fontier.git
cd fontier

# Install dependencies
npm install
```

### Running Locally in Development

```bash
# Start Vite development server & Electron application
npm run electron:dev
```

### Building for Production

```bash
# Build frontend web assets
npm run build

# Package standalone desktop executable and installer
npm run electron:build
```

The output binaries will be created in the `release/` directory:
- `release/win-unpacked/Fontier.exe` (Standalone portable executable)
- `release/Fontier Setup 1.0.0.exe` (Windows NSIS installer)

---

## 🛠️ Technology Stack

- **Runtime**: [Electron](https://www.electronjs.org/)
- **UI Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Font Parsing**: [opentype.js](https://opentype.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)



---

## 📄 License

Licensed under the MIT License. Feel free to use, modify, and distribute.
