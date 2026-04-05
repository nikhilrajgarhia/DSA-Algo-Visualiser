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

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/) (the repo uses `pnpm-lock.yaml`)

## Setup

```bash
pnpm install
```

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
