## 🎯 Updated Project Plan – **Bun** (instead of npm)

All tasks that previously mentioned **npm** (or **yarn**) have been replaced with the equivalent **Bun** commands. The rest of the architecture (Tauri + React + Vite + shadcn + Tailwind + SQLite) stays unchanged.

---

## 1️⃣ One‑Time Setup (Bun Installation)

| Step    | Command                                                                                                                | Description                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **1.1** | `brew install bun`  *(macOS/Linux)*  <br> `scoop install bun`  *(Windows)*  <br> or `curl -fsSL https://bun.sh/install | bash`                                 | Installs the **Bun** runtime, package manager, and `bun` CLI globally. |
| **1.2** | `bun --version`                                                                                                        | Verify the install (should be ≥ 1.1). |
| **1.3** | Add `$HOME/.bun/bin` to your `$PATH` if the installer didn’t do it automatically.                                      | |

> **Why Bun?** Faster installs, script execution, and a single lockfile (`bun.lockb`). It can also run the Vite dev server and test suites directly, so we eliminate the extra `npm` layer.

---

## 2️⃣ Repository & CI Bootstrapping (Bun‑aware)

| #   | Sub‑task                                                       | Bun command                                               | Notes                                                                       |
| --- | -------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| 2.1 | Initialise repo & add `bun.lockb`                              | `git init && git add . && git commit -m "initial commit"` | After the first `bun install` the lockfile will be generated automatically. |
| 2.2 | Add CI workflow that installs Bun                              | Use **oven-sh/setup-bun** action (see CI snippet below).  |
| 2.3 | Replace any `npm ci` / `npm i` steps in CI with `bun install`. |
| 2.4 | Update README **Installation** section (show Bun commands).    | |

**GitHub Actions example (ci.yml)**

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Bun
        uses: oven-sh/setup-bun@v1   # pulls latest stable Bun

      - name: Install JS dependencies
        run: bun install

      - name: Lint
        run: bun run lint

      - name: Run unit tests
        run: bun run test

      - name: Build frontend assets
        run: bun run build

      - name: Install Tauri CLI
        run: cargo install tauri-cli --locked

      - name: Build Tauri binary (Linux)
        run: bun run tauri-build   # defined in bunfig.toml (see §4)
```

---

## 3️⃣ Front‑End Scaffolding with Bun

| #    | Sub‑task                                | Bun command                                                                                    | What it does                                                                      |
| ---- | --------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 3.1  | Create Vite + React + TS template       | `bun create vite frontend --template react-ts`                                                 | Generates `frontend/` with Vite config, `src/`, `index.html`, etc.                |
| 3.2  | Install Tailwind + PostCSS              | `bun add -D tailwindcss postcss autoprefixer`                                                  | Saves as dev‑dependencies and updates `bun.lockb`.                                |
| 3.3  | Initialise Tailwind files               | `npx tailwindcss init -p` *(Bun ships a compatible `npx` wrapper)*                             | Creates `tailwind.config.cjs` and `postcss.config.cjs`.                           |
| 3.4  | Install shadcn/ui (component generator) | `bun dl shadcn-ui@latest && bun run init`                                                      | `dl` downloads the package; `run init` launches the CLI wizard to add components. |
| 3.5  | Add Vite‑tauri plugin (hot‑reload)      | `bun add -D @tauri-apps/vite-plugin-tauri`                                                     | Enables `tauri dev` to proxy Vite.                                                |
| 3.6  | Install state‑management & devtools     | `bun add @tanstack/react-query @tanstack/react-query-devtools`                                 | Provides async data fetching for Tauri commands.                                  |
| 3.7  | Add UI helpers (icons, classnames)      | `bun add lucide-react classnames`                                                              | Icon set + conditional class helper.                                              |
| 3.8  | Install testing frameworks              | `bun add -D jest @testing-library/react @testing-library/jest-dom @playwright/test playwright` | Jest for unit tests, Playwright for E2E.                                          |
| 3.9  | Install accessibility lint plugin       | `bun add -D eslint-plugin-jsx-a11y`                                                            | ARIA & a11y linting.                                                              |
| 3.10 | Add i18n scaffolding                    | `bun add i18next react-i18next`                                                                | Internationalisation.                                                             |
| 3.11 | Add Prettier & ESLint (if not already)  | `bun add -D prettier eslint eslint-config-prettier eslint-plugin-react`                        | Code style enforcement.                                                           |

> **Tip:** After any `bun add` the lockfile (`bun.lockb`) is refreshed automatically. Commit it to the repository – it now replaces `package-lock.json` / `yarn.lock`.

---

## 4️⃣ Scripts – `bunfig.toml` (optional)

Bun can run scripts from a **`bunfig.toml`** file, which is simpler than the old `package.json` scripts but still fully compatible with `npm`‑style scripts if you keep a `package.json` for IDE hints.

```toml
# bunfig.toml – placed in the repo root
[run]
dev          = "vite"
build        = "vite build"
preview      = "vite preview"
tauri        = "tauri dev"
tauri-build  = "tauri build"
test         = "jest"
e2e          = "playwright test"
lint         = "eslint src --ext .ts,.tsx"
format       = "prettier --write ."
typecheck    = "tsc --noEmit"
```

Run them with:

```bash
bun run dev          # start Vite dev server
bun run tauri        # launch Tauri + hot reload
bun run build        # production assets
bun run test         # unit tests
bun run e2e          # Playwright
bun run lint         # linting
bun run format       # code formatting
```

All existing **npm‑script** references in the original plan simply become `bun run …`.

---

## 5️⃣ Updated Detailed To‑Do List (Bun‑centric)

Below is the same granular plan you already have, with every npm‑related command replaced by its Bun counterpart. The **estimated hours** remain unchanged.

### 1️⃣ Repository & CI (4 h)

| #            | Task                                   | Bun command / Action                                        |
| ------------ | -------------------------------------- | ----------------------------------------------------------- |
| 1.1          | Create repo, add README, LICENSE       | `git init && git add . && git commit -m "chore: init repo"` |
| 1.2          | Add CI workflow (see §2)               | commit `.github/workflows/ci.yml`                           |
| 1.3          | Add ESLint/Prettier config             | `bun add -D eslint prettier ...`                            |
| 1.4          | Add Dependabot / Renovate bots         | create `.github/dependabot.yml`                             |
| 1.5          | Generate Tauri skeleton (`src-tauri/`) | `cargo tauri init` (outside Bun)                            |
| **Subtotal** |                                        | **≈ 4 h**                                                   |

### 2️⃣ Core Rust Services (13.5 h) – unchanged (no npm involvement)

*(commands stay the same: `cargo add`, `cargo run`, etc.)*

### 3️⃣ Front‑End Foundations (5.05 h)

| #            | Task                                         | Bun command                                                    |
| ------------ | -------------------------------------------- | -------------------------------------------------------------- |
| 3.1.1        | Scaffold Vite+React+TS                       | `bun create vite frontend --template react-ts`                 |
| 3.1.2        | Install Tailwind                             | `bun add -D tailwindcss postcss autoprefixer`                  |
| 3.1.3        | Initialise Tailwind files                    | `npx tailwindcss init -p`                                      |
| 3.1.4        | Add shadcn/ui components                     | `bun dl shadcn-ui@latest && bun run init`                      |
| 3.1.5        | Add Vite‑tauri plugin                        | `bun add -D @tauri-apps/vite-plugin-tauri`                     |
| 3.2.1        | Generate TypeScript bindings                 | `bun run tauri typegen`                                        |
| 3.2.2        | Create `src/types.ts`                        | manual                                                         |
| 3.2.3        | Write tiny `tauriInvoke<T>` helper           | manual                                                         |
| 3.3.1        | Install React‑Query                          | `bun add @tanstack/react-query @tanstack/react-query-devtools` |
| 3.4.1        | Build AppShell layout with shadcn components | manual                                                         |
| **Subtotal** |                                              | **≈ 5 h**                                                      |

### 4️⃣ UI Features (≈ 24 h)

All UI‑related installs now use **Bun**:

| Feature                   | Bun commands needed                        |
| ------------------------- | ------------------------------------------ |
| **Indexing modal**        | `bun add -D lucide-react` (icons)          |
| **Virtualized grid**      | `bun add react-window`                     |
| **Light‑box**             | `bun add react-image-lightbox` (or custom) |
| **Albums / Tags UI**      | `bun add classnames`                       |
| **Search & Filters**      | `bun add lodash.debounce`                  |
| **Settings page**         | `bun add lucide-react`                     |
| **Basic editing toolbar** | `bun add lucide-react`                     |
| **Export / Import**       | native (no extra deps)                     |
| **Updater UI**            | native (no extra deps)                     |
| **i18n**                  | `bun add i18next react-i18next`            |
| **Accessibility lint**    | already added in §3.9                      |

(Implementation steps remain the same; only the install command line changes.)

### 5️⃣ Testing, QA & Release (10.5 h)

| #   | Task                                                         | Bun command                                                        |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| 5.1 | Jest + React‑Testing‑Library setup                           | `bun add -D jest @testing-library/react @testing-library/jest-dom` |
| 5.2 | Playwright E2E setup                                         | `bun add -D @playwright/test playwright`                           |
| 5.3 | Run tests                                                    | `bun run test` / `bun run e2e`                                     |
| 5.4 | Lint & format                                                | `bun run lint` / `bun run format`                                  |
| 5.5 | CI script already runs `bun install` and the above commands. |                                                                    |

---

## 6️⃣ Updated `package.json` (optional – kept for IDE compatibility)

Even though we rely on **Bun**, keeping a minimal `package.json` helps VS Code Intellisense and some tooling that still looks for it.

```json
{
  "name": "local-gallery",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri dev",
    "tauri-build": "tauri build",
    "test": "jest",
    "e2e": "playwright test",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16",
    "@tauri-apps/vite-plugin-tauri": "^2.0.0",
    "react-window": "^1.8.8",
    "lucide-react": "^0.309.0",
    "classNames": "^2.5.1",
    "i18next": "^23.6.0",
    "react-i18next": "^13.2.0",
    "eslint": "^8.55.0",
    "eslint-plugin-jsx-a11y": "^6.8.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.2.0",
    "@playwright/test": "^1.43.0"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.24.0",
    "@tanstack/react-query-devtools": "^5.24.0"
  }
}
```

When you run `bun install`, **Bun** reads this file, resolves all dependencies, writes **`bun.lockb`**, and the `node_modules` folder is populated just like npm would – but *up to 5× faster*.

---

## 7️⃣ Developer On‑boarding Cheat Sheet

```bash
# 1️⃣ Clone & cd
git clone https://github.com/yourorg/local-gallery.git
cd local-gallery

# 2️⃣ Install everything (JS + Rust)
bun install                # installs all JS deps & creates bun.lockb
cargo install tauri-cli    # once per machine

# 3️⃣ Run the app in dev mode (hot‑reload)
bun run tauri              # starts Tauri + Vite dev server

# 4️⃣ Build production binaries
bun run tauri-build        # outputs installers for the host OS

# 5️⃣ Run tests
bun run test               # jest unit tests
bun run e2e                # playwright end‑to‑end

# 6️⃣ Lint / format
bun run lint
bun run format
```

All team members now have a **single command** (`bun install`) to fetch the whole stack, and a **single runtime** (Bun) for dev scripts. The rest of the codebase (Rust + Tauri) stays untouched.

---

## 8️⃣ Impact Summary

| Area                     | Original (npm)                    | Updated (Bun)                                   | Effect                                                              |
| ------------------------ | --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| **Package manager**      | `npm` / `yarn`                    | **Bun** (`bun add`, `bun install`, `bun run`)   | Faster installs, single lockfile, no separate `node` binary needed. |
| **CI**                   | `npm ci`                          | `bun install` (via `setup-bun` action)          | Same results, quicker pipeline.                                     |
| **Scripts**              | `npm run …`                       | `bun run …` (or `bunfig.toml`)                  | No functional change; just a different command surface.             |
| **Component generation** | `npx shadcn-ui@latest init`       | `bun dl shadcn-ui@latest && bun run init`       | Same wizard, works with Bun’s downloader.                           |
| **Docs**                 | README mentions npm               | Updated to show **Bun** install & run commands. |
| **Lockfile**             | `package-lock.json` / `yarn.lock` | **`bun.lockb`**                                 | Commit this file; it replaces the old lockfiles.                    |

All other architectural pieces (Tauri backend, SQLite DB, image processing, UI design) remain exactly as defined in the original PRD.

---

## ✅ Next Step

Create a **branch** (e.g., `feat/bun-setup`) and complete the **Section 3** tasks (Bun scaffold, dependencies, scripts). Push, open a PR, and let the CI verify that `bun install` builds the frontend and the Tauri binary successfully. Once that PR lands, continue with the other sprint‑by‑sprint items exactly as previously scheduled.

Happy coding with **Bun**! 🚀
