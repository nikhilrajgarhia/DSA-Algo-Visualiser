# 🚀 DSA Algorithm Visualiser

URL: https://nikhilrajgarhia.github.io/DSA-Algo-Visualiser/

An interactive web application to **visualize classic algorithms step-by-step** for learning and understanding.

Currently supported:

- 🔤 **Longest Common Subsequence (LCS)**
- 🌳 **Depth-First Search (DFS)**
- 🎒 **0/1 Knapsack (Dynamic Programming)**

Each visualizer includes **step controls, animations, explanations, and playback features**.

---

# ✨ Features

### 🔤 Longest Common Subsequence (LCS)

- Build DP table step-by-step
- Highlight matching characters
- Backtracking visualization
- Final LCS result

### 🌳 Depth-First Search (DFS)

- Tree traversal visualization
- Call stack simulation
- Visited order display
- Explore & backtrack animation

### 🎒 0/1 Knapsack

- DP table filling visualization
- Include / exclude decision states
- Optimal item selection
- Final profit calculation

---

# 🎮 Controls

All visualizers include:

- ▶️ Play / Pause
- ⏭ Step Forward
- ⏮ Step Backward
- 🎚 Speed Control (Slow / Normal / Fast)
- 🔎 Scrubber Navigation

---

# 🛠 Tech Stack

- ⚛️ React
- 🟦 TypeScript
- ⚡ Vite
- 🎨 Tailwind CSS
- 🧩 shadcn/ui components
- 🛣 Wouter (routing)
- 🎬 Framer Motion (animations)
- 🔄 TanStack Query

---

# 🚀 Quick Start

```bash
git clone https://github.com/nikhilrajgarhia/DSA-Algo-Visualiser.git
cd DSA-Algo-Visualiser
pnpm install
pnpm dev
```

Open:

http://localhost:5173

---

# 📦 Prerequisites

Install:

- Node.js **v20.19+ (recommended Node 22 LTS)**
- pnpm
- Git

---

# 💻 Installation

## macOS

### Install Node

```bash
brew install node
```

Or download from:

https://nodejs.org

### Install pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Or:

```bash
npm install -g pnpm
```

### Clone and Install

```bash
git clone https://github.com/nikhilrajgarhia/DSA-Algo-Visualiser.git
cd DSA-Algo-Visualiser
pnpm install
```

### Run Project

```bash
pnpm dev
```

---

## Windows

### Install Node

Download from:

https://nodejs.org

Or:

```bash
winget install OpenJS.NodeJS.LTS
```

### Install pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Or:

```bash
npm install -g pnpm
```

### Clone and Install

```bash
git clone https://github.com/nikhilrajgarhia/DSA-Algo-Visualiser.git
cd DSA-Algo-Visualiser
pnpm install
```

### Run Project

```bash
pnpm dev
```

---

# ⚙️ Environment Variables

Create `.env` file in project root:

```bash
touch .env
```

Add:

```
PORT=5173
BASE_PATH=/
```

---

# 📜 Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `pnpm dev`       | Start development server |
| `pnpm build`     | Build production files   |
| `pnpm serve`     | Preview production build |
| `pnpm typecheck` | TypeScript type check    |

---

# 🗂 Project Structure

```
Algo-visualiser
│
├── src/
│   ├── pages/
│   ├── components/
│   ├── App.tsx
│
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
```

---

# 🌐 Routes

---

# 🚀 CI/CD Deployment

This project is now configured for **GitHub Pages + GitHub Actions**.

## What happens

- Every pull request runs:
  - `pnpm install --frozen-lockfile`
  - `pnpm build`
- Every push to `main` does the same checks and then deploys the built app to **GitHub Pages**

## GitHub setup required

After pushing these files to GitHub:

1. Open your GitHub repository
2. Go to `Settings` → `Pages`
3. Under `Build and deployment`, choose `Source: GitHub Actions`
4. Push or merge to `main`

GitHub will publish the app automatically.

## Live URL

- If this is a project repo, the site will usually be:
  - `https://<your-github-username>.github.io/<repo-name>/`
- If this repo is named `<your-github-username>.github.io`, the site will be:
  - `https://<your-github-username>.github.io/`

## Files added for deployment

- `.github/workflows/deploy-pages.yml`
- `public/404.html`

The workflow also sets `BASE_PATH` automatically, so routing works correctly on GitHub Pages.

Note: the current repository deploy pipeline is build-first. A full TypeScript compiler gate can be added later once `typescript` is pinned directly in the workspace lockfile.

---

# 📸 Screenshots

(Add screenshots here later)

---

# 🚀 Deployment

Build project:

```bash
pnpm build
```

Preview:

```bash
pnpm serve
```

---

# 🤝 Contributing

Contributions are welcome!

Steps:

1. Fork repo
2. Create feature branch
3. Commit changes
4. Open Pull Request

---

# 📄 License

MIT License

---

# 🙌 Author

**Nikhil Rajgarhia**

GitHub:
https://github.com/nikhilrajgarhia
