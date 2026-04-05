# How this application works

This document describes how the **Algo Visualiser** single-page app is structured and how each algorithm view behaves under the hood.

## High-level architecture

1. **Entry** — `src/main.tsx` mounts React on `#root` and loads global styles from `src/index.css`.
2. **App shell** — `src/App.tsx` wraps the UI in `QueryClientProvider`, `TooltipProvider`, and Wouter’s `Router` with `base` set from `import.meta.env.BASE_URL` so deployments under a subpath work when `BASE_PATH` is configured in Vite.
3. **Layout** — A sticky header shows the current algorithm title and links to `/`, `/dfs`, and `/knapsack`. Two modes apply to every route:
   - **Visualizer** — The interactive page for that algorithm.
   - **How it works** — Static explanatory content (either inline in `App.tsx` for LCS, or exported from the DFS/Knapsack page modules).

Routing uses Wouter’s `<Switch>` / `<Route>`; unknown paths render `not-found`.

There is **no backend**. All logic runs in the browser. Algorithm implementations live next to the UI in each page file.

---

## LCS (`/` — `LCSVisualizer.tsx`)

### What it computes

- Two strings **S1** and **S2** are normalized to uppercase letters only, max length 9 for the DP grid.
- **`buildLCSSteps`** fills a classic LCS DP table `dp[i][j]` for `i = 1..m`, `j = 1..n`, in row-major order. Each cell produces one **step** with coordinates, value, whether `S1[i-1] === S2[j-1]`, and a human-readable `explanation` string.
- After the table is complete, a **trace** walks from `(m, n)` toward `(0, 0)` following matches and max moves, collecting cells on the LCS path.
- **`getLCSString`** reconstructs the actual LCS substring from the full `dp` table.

### What you see

- The DP table renders incrementally: only cells for steps `0 .. currentStep` are filled; others show a placeholder.
- The **current** cell is highlighted; **match** cells use distinct styling.
- When the animation reaches the last fill step, **showTrace** turns on: path cells are highlighted and the LCS string and length appear.
- Playback uses `setInterval` at a chosen delay (Slow / Normal / Fast); scrubbing the range input jumps to any step and toggles trace at the end.

---

## DFS (`/dfs` — `DFSVisualizer.tsx`)

### What it computes

- Trees are stored as an adjacency list: each node has `id`, `label`, and `children` (numeric ids).
- **`layoutTree`** assigns `x` / `y` positions for a tidy layered layout (subtree width recursion) for SVG rendering.
- **`buildDFSSteps`** runs a **recursive DFS** from `root`, recording steps of kinds:
  - **visit** — node entered, pushed on conceptual stack;
  - **explore** — moving to a child edge;
  - **backtrack** — after children, pop/backtrack;
  - **done** — traversal complete with full order summary.

Each step stores a copy of **stack** and **visited** order for the UI.

### What you see

- Preset graphs (binary, wide, deep path, star) replace the entire tree; changing a preset recomputes steps from scratch.
- An **SVG** draws edges and labeled nodes; colors reflect visit, stack, backtrack, and completion. Active edges emphasize the path taken so far.
- Panels show **Call stack** and **Visited order** for the current step. When the final **done** step runs, the full DFS order is shown as a sequence.

Playback and speed work like LCS, driven by the same step index and interval pattern.

---

## Knapsack (`/knapsack` — `KnapsackVisualizer.tsx`)

### What it computes

- **0/1 Knapsack**: items have weight and value; capacity is fixed per preset.
- **`buildKnapsackSteps`** iterates `i = 1..n` (items) and `j = 0..W` (capacity). For each cell it decides if the item is **too heavy**, or whether **including** beats **excluding**, updates `dp[i][j]`, and appends a step with explanation.
- **Backtracking** after the table is full: from `(n, W)`, if `dp[i][j] !== dp[i-1][j]`, item `i-1` is in the solution; move up and left by that item’s weight. Collected indices and a set of “path” cells support the UI.

### What you see

- Rows are items (plus row 0 = no items); columns are capacities `0..W`.
- The table fills in step order; the current cell is highlighted; **include**, **too heavy**, and later the **optimal path** use distinct styles (see legend on the page).
- At the last step, **showResult** lists chosen items, total value, and weight used vs capacity.

---

## Cross-cutting UI patterns

- **State** — Each visualizer keeps `currentStep`, `isPlaying`, and speed index; `useEffect` clears and sets an interval when playing.
- **Refs** — LCS and Knapsack use a ref to hold the latest computed steps/dp so the first render and string cleaning stay consistent; inputs changing strings or presets trigger recomputation and reset the step index.
- **Accessibility / tests** — Some controls expose `data-testid` attributes for automated testing.

---

## Build and runtime

- **Vite** bundles the app; production output goes to `dist/public` per `vite.config.ts`.
- **`@`** resolves to `src/`; **`@assets`** points outside `src` for optional attached assets in some setups.
- Replit-specific Vite plugins load only when `REPL_ID` is defined; local development uses the standard React + Tailwind + runtime error overlay stack.

For user-facing algorithm tutorials, the in-app **How it works** tabs duplicate and expand on the ideas above with examples and complexity notes.
