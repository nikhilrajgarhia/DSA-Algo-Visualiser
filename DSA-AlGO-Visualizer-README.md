# 🚀 DSA Algorithm Visualiser

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

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build production files |
| `pnpm serve` | Preview production build |
| `pnpm typecheck` | TypeScript type check |

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

| Route | Description |
|------|-------------|
| `/` | LCS Visualizer |
| `/dfs` | DFS Visualizer |
| `/knapsack` | Knapsack Visualizer |

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
