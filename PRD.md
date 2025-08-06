# 📁 Local‑Gallery PRD (Refined)

**Product name:** **Local‑Gallery**
**Target platforms:** Windows 10/11, macOS 12+, Linux (Ubuntu, Fedora, etc.)
**Core stack**

| Layer | Tech | Why |
|-------|------|-----|
| **Backend** | **Tauri** (Rust) | Native binary, low footprint, safe Rust, seamless IPC with the frontend |
| **UI** | **React + Vite** (or Next.js for SSR‑optional mode) + **shadcn/ui** + **TailwindCSS** | Modern component library, fast hot‑module reload, fully customisable UI |
| **Database** | **SQLite** (via `rusqlite` or `sqlx`) | Zero‑config, embeddable, perfect for local metadata indexing |
| **Image processing** | `image`, `oxipng`, `libvips` via Rust bindings | Fast decoding, thumbnail generation, EXIF handling |
| **File‑system watcher** | `notify` crate (Rust) | Real‑time folder changes detection |
| **Bundler** | Tauri + Vite (vite‑plugin‑tauri) | One‑click installers for each OS |

> **Goal:** A *native* desktop photo gallery that can index **any folder tree** on the user’s machine and display **hundreds of thousands** of images instantly while offering a full‑featured modern UI (albums, tags, slideshow, light‑box, basic edits, etc.).

---

## 1️⃣ Vision & Success Metrics

| Vision statement | “Give power‑users a lightning‑fast, offline‑first photo explorer that feels like a native OS app while keeping the flexibility and familiarity of a web UI.” |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Success metrics** | - < 200 ms first‑paint for a folder with ≤ 10 000 images (measured on a mid‑range laptop). <br>- Indexing speed ≥ 5 000 files / s (incl. thumbnail generation). <br>- < 20 MB memory footprint on idle. <br>- ≥ 90 % positive user rating (beta). |
| **Stakeholders** | • End‑users (photographers, hobbyists, power‑users) <br>• Developers (open‑source contributors) <br>• Distribution partners (App Store, Homebrew, Scoop) |

---

## 2️⃣ Scope

| In‑Scope | Out‑Scope (Phase 2+) |
|----------|----------------------|
| • Recursive drive/folder scanning <br>• Thumbnail & preview generation <br>• Album, tag, rating system <br>• Light‑box viewer with zoom, rotate, fullscreen <br>• Slideshow with configurable interval <br>• Basic non‑destructive edits: rotate, flip, crop, exposure, contrast <br>• Import/export of metadata (JSON/CSV) <br>• Keyboard shortcuts & right‑click context menu <br>• Dark / Light theme (Tailwind + shadcn) <br>• Multi‑platform installers | • Cloud sync / remote backups <br>• Facial recognition / AI tagging <br>• Advanced RAW processing (DNG, CR2) <br>• Video / audio support <br>• Plugins marketplace |

---

## 3️⃣ Functional Requirements

| # | Feature | Description | Acceptance Criteria |
|---|---------|-------------|----------------------|
| **F1** | **Folder Indexer** | Recursively walk a user‑selected root folder, read supported image files, store metadata in SQLite. | - Index completes without UI freeze. <br>- Progress bar reflects real‑time status.<br>- Files added/removed outside the app are detected via FS watcher. |
| **F2** | **Supported Formats** | JPEG, PNG, GIF, BMP, WebP, AVIF, HEIC, TIFF, RAW (optional minimal support). | - Each format loads in the viewer with correct orientation (EXIF). |
| **F3** | **Thumbnail Engine** | Generate & cache thumbnails (max 200 px) on first load; store in a hidden `.thumbs` sub‑folder and/or SQLite BLOB cache. | - Subsequent loads read cached thumbnails instantly (< 10 ms). |
| **F4** | **Grid Gallery View** | Virtualized infinite scroll (e.g., `react‑virtualized` or `react‑window`) rendering only visible thumbnails. | - Scrolling through 100 k images remains smooth (< 60 fps). |
| **F5** | **Detail/Light‑box Viewer** | Full‑size display with zoom, pan, rotate, next/prev navigation, fullscreen toggle. | - Opens within ≤ 150 ms from grid click. |
| **F6** | **Albums & Collections** | Users can create virtual albums (SQL many‑to‑many). Drag‑drop images into albums. | - Album view behaves like a normal folder (grid, slideshow). |
| **F7** | **Tagging & Rating** | Free‑form tags + 1‑5 star rating stored in SQLite. Tag filter UI. | - Tag filter instantly reduces gallery set (no full re‑index). |
| **F8** | **Search** | Full‑text search on filename, tags, EXIF fields (camera, date, lens). | - Results appear < 200 ms for 50 k matches. |
| **F9** | **Slideshow** | Auto‑advance viewer with configurable transition time, shuffle, loop, pause. | - Works offline, respects user‑set interval. |
| **F10** | **Basic Image Editing** | Rotate, flip, crop, adjust exposure/contrast; edits saved as separate side‑car files (e.g., `image.edit.json`) or exported as new image. | - Non‑destructive edits displayed in viewer immediately. |
| **F11** | **Preferences** | Theme, default thumbnail size, cache location, hot‑keys, startup folder. | - Settings persisted in a local JSON file (or SQLite). |
| **F12** | **Export/Import Metadata** | Export albums/tags as JSON/CSV; import to merge. | - Data round‑trips without loss. |
| **F13** | **File System Permissions** | Request read/write permissions per OS guidelines (macOS sandbox, Windows UAC). | - App starts only after user grants access; graceful fallback otherwise. |
| **F14** | **Updater** | Tauri auto‑updater (GitHub releases) for seamless patching. | - One‑click update without data loss. |

---

## 4️⃣ Non‑Functional Requirements (NFR)

| Category | Requirement | Rationale / Test |
|----------|-------------|------------------|
| **Performance** | Initial scan ≤ 2 s per 10 k files; thumbnail generation ≤ 5 ms per image (cached) | Measured with `criterion` benchmarks. |
| **Memory** | Peak RAM ≤ 150 MB for 100 k images (grid view only) | Use virtualization + lazy loading. |
| **Responsiveness** | UI interaction latency < 100 ms for typical actions (click, scroll) | End‑to‑end UI test with Playwright. |
| **Reliability** | No data loss on unexpected shutdown; SQLite uses WAL mode. | Crash‑recovery test. |
| **Security** | No network access unless the updater runs; all file ops sandboxed. | Static analysis + runtime permission audit. |
| **Portability** | Single binary < 30 MB per platform (excluding runtime). | Build size checks. |
| **Accessibility** | Keyboard navigation, ARIA labels, high‑contrast mode. | WCAG 2.1 AA compliance testing. |
| **Internationalisation** | UI strings externalised (i18next) – English default, ready for translation. | Verify with locale switcher. |

---

## 5️⃣ Architecture Overview

```
+----------------------+       +-------------------+       +------------------+
|   React (Vite/Next)  | <---> |   Tauri Bridge    | <---> |   Rust Core      |
|  UI (shadcn + Tailw) |       |  (IPC via JSON)  |       |  - Indexer      |
+----------------------+       +-------------------+       |  - DB Layer    |
          ^                               ^                |  - Image Lib   |
          |                               |                |  - Watcher    |
          |                               |                +------------------+
          |                               |
          |                               v
   +-------------------+        +--------------------+
   |   SQLite (rusqlite) |      |  Filesystem (OS)   |
   +-------------------+        +--------------------+
```

* **Frontend** communicates with the Rust backend via Tauri’s `invoke` API (promise‑based).
* **Rust core** runs heavy tasks on its own thread pool (`rayon`) to keep UI thread responsive.
* **SQLite** stores:
  - `files(id, path, hash, size, mtime, width, height, format)`
  - `thumbnails(id, file_id, size, blob_path)`
  - `albums(id, name, created_at)`
  - `album_items(album_id, file_id)`
  - `tags(id, name)` & `file_tags(file_id, tag_id)`
  - `ratings(file_id, stars)`
  - `edits(file_id, edit_json)`

* **Cache**: Thumbnails stored as files **or** SQLite BLOBs depending on user config.
* **Watcher** detects external changes and updates DB incrementally (debounced).

---

## 6️⃣ Data Model (SQLite schema)

```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    hash TEXT,               -- optional SHA256 for dedup
    size INTEGER,
    mtime INTEGER,           -- UNIX epoch ms
    width INTEGER,
    height INTEGER,
    format TEXT
);

CREATE TABLE thumbnails (
    id INTEGER PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    size INTEGER NOT NULL,   -- e.g., 200
    path TEXT NOT NULL,
    UNIQUE(file_id, size)
);

CREATE TABLE albums (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE album_items (
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    file_id  INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    PRIMARY KEY (album_id, file_id)
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE file_tags (
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, tag_id)
);

CREATE TABLE ratings (
    file_id INTEGER PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    stars   INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5)
);

CREATE TABLE edits (
    file_id INTEGER PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    json    TEXT NOT NULL          -- e.g., {"rotate":90,"crop":[x,y,w,h]}
);
```

*Indices* are added on `files(path)`, `files(mtime)`, `tags(name)`, `file_tags(tag_id)` for fast filtering.

---

## 7️⃣ API (Tauri `invoke` contracts)

| Command | Parameters | Returns | Notes |
|---------|------------|---------|-------|
| `index_folder` | `{ root: string, recursive: bool }` | `{ total: number, added: number, updated: number }` | Runs on background thread, streams progress via `event('index-progress')`. |
| `get_files` | `{ offset: number, limit: number, filter?: Filter }` | `FileMeta[]` | Supports pagination + filter (tags, rating, date range). |
| `get_thumbnail` | `{ fileId: number, size: number }` | `{ path: string }` | Returns local file path; UI loads via `<img src={path}>`. |
| `create_album` | `{ name: string }` | `{ albumId: number }` |
| `add_to_album` | `{ albumId: number, fileIds: number[] }` | `void` |
| `search` | `{ query: string, limit?: number }` | `FileMeta[]` |
| `edit_image` | `{ fileId: number, ops: EditOps }` | `{ success: bool }` |
| `export_metadata` | `{ format: 'json'|'csv' }` | `{ blobPath: string }` |
| `open_in_explorer` | `{ path: string }` | `void` |
| `watch_folder` | `{ root: string }` | `void` (emits `fs-change` events) |
| `update_settings` | `{ settings: Settings }` | `void` |
| `get_settings` | `none` | `Settings` |

*All commands are async and return Promises to the React side.*

---

## 8️⃣ UI/UX Flow (High‑level)

1. **Welcome / Onboard**
   - Splash screen with “Select folder to index”.
   - Option to remember last folder.

2. **Main Dashboard**
   - **Top bar**: Search, Settings, Theme toggle.
   - **Side panel**: Albums, Tags cloud, Smart collections (e.g., “Last 30 days”).
   - **Center area**: Virtualized grid of thumbnails.

3. **Folder Indexing Modal**
   - Progress bar, estimated time, cancel button.
   - Real‑time stats: files scanned / added / skipped.

4. **Thumbnail/Grid Interaction**
   - Click → Light‑box. <br>Shift‑click / Ctrl‑click → multi‑select. <br>Right‑click → context menu (Add to Album, Tag, Rate, Delete, Reveal in Explorer).

5. **Light‑box Viewer**
   - Header: filename, EXIF overlay toggle, rating stars. <br>Side bar (optional) with tag editor. <br>Bottom bar: zoom slider, rotate buttons, edit button.

6. **Album View**
   - Same grid layout, album title & description editing.

7. **Settings**
   - Cache location, thumbnail size, default scan depth, hot‑keys, auto‑update toggle, language.

8. **Error / Edge Cases**
   - Permissions denied → dialog with “Open system settings”. <br>Corrupt image → placeholder with “Unable to decode”.

---

## 9️⃣ Milestones / Timeline (12 weeks)

| Week | Milestone | Deliverable |
|------|-----------|------------|
| 1 | **Project scaffolding** | Repo (frontend + backend), CI (GitHub Actions), automated release workflow. |
| 2 | **Core Rust services** | Indexer + SQLite schema, thumbnail generator, file‑watcher. |
| 3 | **IPC layer** | Tauri `invoke` contracts, basic commands (`index_folder`, `get_files`). |
| 4 | **UI skeleton** | Vite + React + Tailwind + shadcn, responsive layout, loading state. |
| 5 | **Virtualized Grid** | Integration with `react-window`, display dummy thumbnails, scroll performance test. |
| 6 | **Thumbnail pipeline** | End‑to‑end generation + caching, progress UI, benchmark ≥ 5 k thumb/s. |
| 7 | **Light‑box viewer** | Zoom/pan, navigation, fullscreen, basic EXIF overlay. |
| 8 | **Albums & Tagging** | DB schema, UI dialogs, drag‑drop, filter UI. |
| 9 | **Search & Filters** | Full‑text search on filename/tags, date range selector. |
| 10 | **Basic Edits & Export** | Rotate/flip/crop UI, non‑destructive edit storage, metadata export. |
| 11 | **Settings, Theming, Updater** | Preference persistence, dark mode toggle, auto‑updater integration. |
| 12 | **Polish & Release Candidate** | Accessibility audit, performance profiling, packaging for Windows/macOS/Linux, beta release. |

*Post‑release (Month 3–6) – roadmap items: RAW support, facial‑recognition tags, video thumbnails.*

---

## 🔐 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Huge folder (≥ 1 M files)** → long indexing & memory spikes | Critical | - Use lazy pagination, limit recursion depth, allow user to set a **max‑file‑count** preview. <br>- Store only needed columns in memory; process in chunks. |
| **Cross‑platform file‑watcher inconsistencies** | Medium | Leverage `notify` crate with OS‑specific backends; fallback to periodic rescans if events are lost. |
| **Thumbnail cache bloat** | Low | Provide cache‑size setting; auto‑prune old thumbnails > 30 days. |
| **Permissions (macOS notarization, Windows protected folders)** | Medium | Use Tauri’s `allowlist` to request `fs-read`/`fs-write` permissions; create clear error dialogs. |
| **Performance regression after adding features** | High | Continuous benchmark suite; CI runs performance thresholds; profile before each PR merge. |
| **Binary size exceeding installer limits** | Low | Strip debug symbols, enable `cargo` `lto` and `opt-level = "z"` for release build. |

---

## 📦 Deployment & Distribution

| Channel | Package type | Installer |
|---------|--------------|-----------|
| Windows | `.msi` + portable `.exe` | WiX or NSIS |
| macOS   | `.dmg` + Homebrew tap | `brew install --cask` |
| Linux   | `.AppImage`, `.deb`, `.rpm` | Snap/Flatpak optional |
| GitHub  | Releases (assets per OS) with auto‑update manifest (`tauri.conf.json` `updater` section). |

**Auto‑update** – Tauri will fetch `latest.json` from GitHub releases; signed SHA256 checksum validation.

---

## 📚 Documentation & Support

| Artifact | Location |
|----------|----------|
| **Developer Docs** | `docs/` (setup, architecture, contribution guide) |
| **API Reference** | Generated from Rust `#[tauri::command]` annotations + TypeScript typings (`src-tauri/bindings.d.ts`). |
| **User Guide** | In‑app “Help” modal + `README.md` on GitHub. |
| **Issue Tracker** | GitHub Issues with labels: `bug`, `enhancement`, `performance`. |
| **Community** | Discord channel, optional `#local-gallery` subreddit. |

---

## ✅ Acceptance Checklist (MVP)

- [ ] Installable binary for all three OSes.
- [ ] User can select a folder and watch a progress bar while the app indexes images.
- [ ] Grid view displays thumbnails instantly, infinite scroll is smooth up to 100 k images.
- [ ] Light‑box opens within 150 ms, supports zoom/pan, next/prev navigation.
- [ ] Albums can be created, renamed, and images dragged into them.
- [ ] Tagging and star rating UI works; filter by tag/rating updates grid instantly.
- [ ] Search bar finds files by name/tag/exif within 200 ms.
- [ ] Settings persist across restarts; dark/light theme works.
- [ ] Auto‑updater installs a new version without data loss.
- [ ] No memory leak when navigating large galleries (observed via Valgrind / VSCode profiler).

---

### 🎉 Closing Note

Local‑Gallery is deliberately **offline‑first**, giving power users a native‑speed experience without any cloud lock‑in. By combining Tauri’s tiny Rust runtime with a modern React UI built on shadcn/ui, we achieve the best of both worlds: **blazing performance** for massive local photo collections and a **beautiful, extensible** interface that can grow with future AI‑enabled features.

Happy building! 🚀