# Algo Visualiser

An interactive web app that visualizes classic algorithms for learning: **Longest Common Subsequence (LCS)**, **Depth-First Search (DFS)** on trees, and the **0/1 Knapsack** dynamic programming solution. Step through each algorithm with playback controls, explanatory text, and optional “How it works” panels.

## Features

- **LCS** — Build the DP table cell by cell, highlight matches, then show the backtracked LCS path and result string.
- **DFS** — Pre-order traversal on preset trees with SVG layout, call stack, visited order, and visit / explore / backtrack steps.
- **0/1 Knapsack** — Fill `dp[item][capacity]` with include/skip/too-heavy states, then show the optimal item set and totals.

Shared UX: play/pause, step forward/back, scrubber, speed (Slow / Normal / Fast), presets or sample inputs where applicable.

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev server and production build
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)-style components (`src/components/ui`)
- [Wouter](https://github.com/molefrog/wouter) for client-side routing
- [Framer Motion](https://www.framer.com/motion/) for transitions
- [TanStack Query](https://tanstack.com/query) (provider is wired for future data use)

## Prerequisites

- [Git](https://git-scm.com/downloads) (to clone the repository)
- [Node.js](https://nodejs.org/) **LTS** (v18 or newer recommended)
- [pnpm](https://pnpm.io/) — this repo uses `pnpm-lock.yaml`; use pnpm for installs (not npm or yarn)

## Installation

### macOS

1. **Install Node.js** (if you do not have it):
   - Download the LTS installer from [nodejs.org](https://nodejs.org/), or
   - With [Homebrew](https://brew.sh/): `brew install node`
2. **Install pnpm** (pick one):
   - Enable Corepack (ships with Node 16.13+): `sudo corepack enable` then `corepack prepare pnpm@latest --activate`
   - Or: `npm install -g pnpm`
3. **Clone and install dependencies**:

   ```bash
   git clone https://github.com/nikhilrajgarhia/DSA-Algo-Visualiser.git
   cd DSA-Algo-Visualiser
   pnpm install
   ```

   (SSH: `git clone git@github.com:nikhilrajgarhia/DSA-Algo-Visualiser.git`)

4. **Run the app** (see [Scripts](#scripts)): `pnpm dev` — then open the URL shown in the terminal (usually `http://localhost:5173`).

### Windows

1. **Install Node.js** (if you do not have it):
   - Download the **LTS** Windows installer (`.msi`) from [nodejs.org](https://nodejs.org/) and run it, or
   - With [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/): `winget install OpenJS.NodeJS.LTS`
2. **Open a terminal** where Git and Node are available — **PowerShell**, **Command Prompt**, or **Git Bash**.
3. **Install pnpm** (pick one):
   - In PowerShell (as Administrator, if needed): `corepack enable` then `corepack prepare pnpm@latest --activate`
   - Or: `npm install -g pnpm`
4. **Clone and install dependencies**:

   ```bash
   git clone https://github.com/nikhilrajgarhia/DSA-Algo-Visualiser.git
   cd DSA-Algo-Visualiser
   pnpm install
   ```

   (SSH: `git clone git@github.com:nikhilrajgarhia/DSA-Algo-Visualiser.git`)

5. **Run the app** (see [Scripts](#scripts)): `pnpm dev` — then open the URL shown in the terminal (usually `http://localhost:5173`).

If Windows shows an execution policy error when running scripts, you may need to [adjust PowerShell execution policy](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies) for your user scope, or run commands from **Command Prompt** / **Git Bash** instead.

## Scripts

| Command        | Description                                      |
|----------------|--------------------------------------------------|
| `pnpm dev`     | Start the Vite dev server (host `0.0.0.0`)       |
| `pnpm build`   | Production build → `dist/public`                 |
| `pnpm serve`   | Preview the production build                     |
| `pnpm typecheck` | Run TypeScript with `--noEmit`                 |

## Configuration

Vite reads:

- **`PORT`** — Dev/preview server port (default `5173` if unset).
- **`BASE_PATH`** — App base URL for deployed subpaths (default `/`). Must be set; the config falls back to `/` when missing.

You can set these in your environment or a local `.env` file (see `.gitignore` — do not commit secrets).

## Routes

| Path        | Page        |
|-------------|-------------|
| `/`         | LCS Visualizer |
| `/dfs`      | DFS Visualizer |
| `/knapsack` | Knapsack Visualizer |

Any other path shows a not-found view.

## Project layout

- `src/App.tsx` — Shell layout, navigation, “Visualizer” / “How it works” toggle, routes.
- `src/pages/` — One page component per algorithm (`LCSVisualizer`, `DFSVisualizer`, `KnapsackVisualizer`).
- `src/components/ui/` — Shared UI primitives.
- `public/` — Static assets (e.g. favicon, Open Graph image).

## Documentation

For architecture, data flow, and how each visualizer computes steps, see [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).

## License

See [LICENSE](LICENSE) (MIT).
