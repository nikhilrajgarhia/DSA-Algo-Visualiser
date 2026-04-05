import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, Info, Plus, Trash2, ChevronRight,
} from "lucide-react";

interface TreeNode {
  id: number;
  label: string;
  children: number[];
  x: number;
  y: number;
}

interface Graph {
  nodes: Record<number, TreeNode>;
  root: number;
}

type StepKind = "visit" | "explore" | "backtrack" | "done";

interface DFSStep {
  nodeId: number;
  kind: StepKind;
  stack: number[];
  visited: number[];
  explanation: string;
}

const NODE_R = 22;
const LEVEL_H = 90;

function layoutTree(nodes: Record<number, TreeNode>, root: number): Record<number, TreeNode> {
  const placed: Record<number, TreeNode> = {};
  const subtreeWidth = (id: number): number => {
    const node = nodes[id];
    if (!node || node.children.length === 0) return 1;
    return node.children.reduce((s, c) => s + subtreeWidth(c), 0);
  };
  const place = (id: number, xOffset: number, depth: number) => {
    const node = nodes[id];
    if (!node) return;
    const w = subtreeWidth(id);
    placed[id] = { ...node, x: xOffset + w / 2, y: depth };
    let cx = xOffset;
    for (const child of node.children) {
      const cw = subtreeWidth(child);
      place(child, cx, depth + 1);
      cx += cw;
    }
  };
  place(root, 0, 0);
  return placed;
}

function buildDFSSteps(nodes: Record<number, TreeNode>, root: number): DFSStep[] {
  const steps: DFSStep[] = [];
  const visited: number[] = [];
  const stack: number[] = [];

  const dfs = (id: number) => {
    visited.push(id);
    stack.push(id);
    steps.push({
      nodeId: id,
      kind: "visit",
      stack: [...stack],
      visited: [...visited],
      explanation: `Visit node ${nodes[id]?.label ?? id}. Push onto stack. Stack: [${[...stack].map(n => nodes[n]?.label).join(" → ")}]`,
    });
    const children = nodes[id]?.children ?? [];
    for (const child of children) {
      if (!visited.includes(child)) {
        steps.push({
          nodeId: child,
          kind: "explore",
          stack: [...stack],
          visited: [...visited],
          explanation: `Explore edge ${nodes[id]?.label} → ${nodes[child]?.label}`,
        });
        dfs(child);
      }
    }
    stack.pop();
    steps.push({
      nodeId: id,
      kind: "backtrack",
      stack: [...stack],
      visited: [...visited],
      explanation: `Backtrack from ${nodes[id]?.label}. Pop from stack. Stack: [${[...stack].map(n => nodes[n]?.label).join(" → ")}]`,
    });
  };

  dfs(root);
  steps.push({
    nodeId: -1,
    kind: "done",
    stack: [],
    visited: [...visited],
    explanation: `DFS complete! Traversal order: ${visited.map(n => nodes[n]?.label).join(" → ")}`,
  });
  return steps;
}

const PRESET_TREES: { label: string; graph: Graph }[] = [
  {
    label: "Binary Tree",
    graph: {
      root: 1,
      nodes: {
        1: { id: 1, label: "A", children: [2, 3], x: 0, y: 0 },
        2: { id: 2, label: "B", children: [4, 5], x: 0, y: 0 },
        3: { id: 3, label: "C", children: [6], x: 0, y: 0 },
        4: { id: 4, label: "D", children: [], x: 0, y: 0 },
        5: { id: 5, label: "E", children: [], x: 0, y: 0 },
        6: { id: 6, label: "F", children: [], x: 0, y: 0 },
      },
    },
  },
  {
    label: "Wide Tree",
    graph: {
      root: 1,
      nodes: {
        1: { id: 1, label: "R", children: [2, 3, 4], x: 0, y: 0 },
        2: { id: 2, label: "A", children: [5, 6], x: 0, y: 0 },
        3: { id: 3, label: "B", children: [7], x: 0, y: 0 },
        4: { id: 4, label: "C", children: [8, 9], x: 0, y: 0 },
        5: { id: 5, label: "D", children: [], x: 0, y: 0 },
        6: { id: 6, label: "E", children: [], x: 0, y: 0 },
        7: { id: 7, label: "F", children: [], x: 0, y: 0 },
        8: { id: 8, label: "G", children: [], x: 0, y: 0 },
        9: { id: 9, label: "H", children: [], x: 0, y: 0 },
      },
    },
  },
  {
    label: "Deep Path",
    graph: {
      root: 1,
      nodes: {
        1: { id: 1, label: "A", children: [2], x: 0, y: 0 },
        2: { id: 2, label: "B", children: [3, 6], x: 0, y: 0 },
        3: { id: 3, label: "C", children: [4, 5], x: 0, y: 0 },
        4: { id: 4, label: "D", children: [], x: 0, y: 0 },
        5: { id: 5, label: "E", children: [], x: 0, y: 0 },
        6: { id: 6, label: "F", children: [], x: 0, y: 0 },
      },
    },
  },
  {
    label: "Star Graph",
    graph: {
      root: 1,
      nodes: {
        1: { id: 1, label: "S", children: [2, 3, 4, 5, 6], x: 0, y: 0 },
        2: { id: 2, label: "A", children: [], x: 0, y: 0 },
        3: { id: 3, label: "B", children: [], x: 0, y: 0 },
        4: { id: 4, label: "C", children: [], x: 0, y: 0 },
        5: { id: 5, label: "D", children: [], x: 0, y: 0 },
        6: { id: 6, label: "E", children: [], x: 0, y: 0 },
      },
    },
  },
];

const SPEED_OPTIONS = [
  { label: "Slow", ms: 1200 },
  { label: "Normal", ms: 600 },
  { label: "Fast", ms: 200 },
];

const KIND_COLORS: Record<StepKind, string> = {
  visit: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700",
  explore: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700",
  backtrack: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700",
  done: "text-primary bg-accent border-primary/30",
};

export default function DFSVisualizer() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [graph, setGraph] = useState<Graph>(PRESET_TREES[0].graph);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  const stepsRef = useRef<DFSStep[]>(buildDFSSteps(graph.nodes, graph.root));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const laidOut = layoutTree(graph.nodes, graph.root);
  const steps = stepsRef.current;

  const recompute = useCallback((g: Graph) => {
    stepsRef.current = buildDFSSteps(g.nodes, g.root);
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    recompute(graph);
  }, [graph, recompute]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= stepsRef.current.length - 1) {
          setIsPlaying(false);
          return stepsRef.current.length - 1;
        }
        return prev + 1;
      });
    }, SPEED_OPTIONS[speedIdx].ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speedIdx]);

  const reset = () => { setCurrentStep(-1); setIsPlaying(false); };
  const stepForward = () => setCurrentStep((p) => Math.min(p + 1, steps.length - 1));
  const stepBackward = () => setCurrentStep((p) => Math.max(p - 1, -1));

  const loadPreset = (idx: number) => {
    setPresetIdx(idx);
    setGraph(PRESET_TREES[idx].graph);
  };

  const currentStepData = currentStep >= 0 ? steps[currentStep] : null;
  const visitedSet = new Set(currentStepData?.visited ?? []);
  const stackSet = new Set(currentStepData?.stack ?? []);
  const currentNodeId = currentStepData?.nodeId ?? -1;

  const svgWidth = Math.max(...Object.values(laidOut).map((n) => n.x)) * 70 + 100;
  const svgHeight = (Math.max(...Object.values(laidOut).map((n) => n.y)) + 1) * LEVEL_H + 20;

  const toSVGX = (x: number) => x * 70 + 50;
  const toSVGY = (y: number) => y * LEVEL_H + NODE_R + 10;

  const traversalOrder = currentStepData?.visited ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Tree Preset</h2>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_TREES.map((p, idx) => (
              <button
                key={p.label}
                onClick={() => loadPreset(idx)}
                data-testid={`preset-${idx}`}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${presetIdx === idx ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Legend</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { color: "bg-muted border-border", label: "Unvisited" },
              { color: "bg-emerald-400/20 border-emerald-400", label: "Visiting (Visit)" },
              { color: "bg-primary/20 border-primary", label: "In Stack" },
              { color: "bg-amber-400/20 border-amber-400", label: "Backtracking" },
              { color: "bg-slate-700 border-slate-700 dark:bg-slate-200 dark:border-slate-200", label: "Fully Done" },
              { color: "bg-rose-400/20 border-rose-400", label: "Current Node" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${item.color}`} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-card-border">
          <h2 className="font-semibold text-sm text-foreground">Tree Visualization</h2>
        </div>
        <div className="overflow-x-auto p-2">
          <svg
            width={Math.max(svgWidth, 300)}
            height={Math.max(svgHeight, 150)}
            className="mx-auto block"
          >
            {Object.values(laidOut).map((node) =>
              node.children.map((childId) => {
                const child = laidOut[childId];
                if (!child) return null;
                const isActive =
                  currentStep >= 0 &&
                  visitedSet.has(node.id) &&
                  visitedSet.has(childId);
                return (
                  <line
                    key={`${node.id}-${childId}`}
                    x1={toSVGX(node.x)}
                    y1={toSVGY(node.y)}
                    x2={toSVGX(child.x)}
                    y2={toSVGY(child.y)}
                    stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--border))"}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    strokeDasharray={isActive ? "none" : "4 3"}
                    className="transition-all duration-500"
                  />
                );
              })
            )}

            {Object.values(laidOut).map((node) => {
              const isCurrent = node.id === currentNodeId && currentStepData?.kind !== "done";
              const isVisited = visitedSet.has(node.id);
              const inStack = stackSet.has(node.id);
              const isBacktracking = isCurrent && currentStepData?.kind === "backtrack";
              const isDone = currentStepData?.kind === "done" && isVisited;

              let fillClass = "hsl(var(--muted))";
              let strokeClass = "hsl(var(--border))";
              let textClass = "hsl(var(--muted-foreground))";

              if (isDone) {
                fillClass = "hsl(var(--foreground))";
                strokeClass = "hsl(var(--foreground))";
                textClass = "hsl(var(--background))";
              } else if (isCurrent && currentStepData?.kind === "visit") {
                fillClass = "hsl(152 70% 45% / 0.25)";
                strokeClass = "hsl(152 70% 45%)";
                textClass = "hsl(152 70% 30%)";
              } else if (isBacktracking) {
                fillClass = "hsl(35 90% 55% / 0.25)";
                strokeClass = "hsl(35 90% 40%)";
                textClass = "hsl(35 90% 30%)";
              } else if (isCurrent) {
                fillClass = "hsl(0 80% 60% / 0.25)";
                strokeClass = "hsl(0 80% 55%)";
                textClass = "hsl(0 80% 40%)";
              } else if (inStack) {
                fillClass = "hsl(var(--primary) / 0.2)";
                strokeClass = "hsl(var(--primary))";
                textClass = "hsl(var(--primary))";
              } else if (isVisited) {
                fillClass = "hsl(var(--muted))";
                strokeClass = "hsl(var(--muted-foreground))";
                textClass = "hsl(var(--muted-foreground))";
              }

              return (
                <g key={node.id}>
                  {isCurrent && (
                    <circle
                      cx={toSVGX(node.x)}
                      cy={toSVGY(node.y)}
                      r={NODE_R + 7}
                      fill="none"
                      stroke={strokeClass}
                      strokeWidth={1.5}
                      opacity={0.35}
                      className="animate-ping"
                      style={{ animationDuration: "1.2s" }}
                    />
                  )}
                  <circle
                    cx={toSVGX(node.x)}
                    cy={toSVGY(node.y)}
                    r={NODE_R}
                    fill={fillClass}
                    stroke={strokeClass}
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                    className="transition-all duration-400"
                  />
                  <text
                    x={toSVGX(node.x)}
                    y={toSVGY(node.y)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textClass}
                    fontSize={13}
                    fontWeight="700"
                    fontFamily="var(--app-font-mono)"
                    className="select-none"
                  >
                    {node.label}
                  </text>
                  {isVisited && !isCurrent && (
                    <text
                      x={toSVGX(node.x) + NODE_R}
                      y={toSVGY(node.y) - NODE_R}
                      fontSize={9}
                      fill="hsl(var(--muted-foreground))"
                      textAnchor="middle"
                      fontFamily="var(--app-font-mono)"
                    >
                      {traversalOrder.indexOf(node.id) + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {currentStepData && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${KIND_COLORS[currentStepData.kind]}`}
          >
            <ChevronRight size={16} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide opacity-60 block">
                {currentStepData.kind}
              </span>
              <p className="text-sm font-medium font-mono">{currentStepData.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentStep >= 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Call Stack</h3>
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {(currentStepData?.stack ?? []).length === 0 ? (
                <span className="text-xs text-muted-foreground italic">Empty</span>
              ) : (
                (currentStepData?.stack ?? []).map((id, idx) => (
                  <motion.span
                    key={`${id}-${idx}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm font-bold font-mono"
                  >
                    {graph.nodes[id]?.label}
                  </motion.span>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Visited Order</h3>
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {(currentStepData?.visited ?? []).map((id, idx) => (
                <motion.span
                  key={`${id}-${idx}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-2.5 py-1 rounded-md bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30 text-sm font-bold font-mono"
                >
                  {graph.nodes[id]?.label}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {currentStepData?.kind === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-primary/10 to-chart-2/10 border border-primary/30 rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">DFS Traversal:</span>
              <div className="flex gap-1 flex-wrap">
                {(currentStepData.visited ?? []).map((id, idx, arr) => (
                  <span key={id} className="flex items-center gap-1">
                    <motion.span
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-sm font-mono"
                    >
                      {graph.nodes[id]?.label}
                    </motion.span>
                    {idx < arr.length - 1 && <span className="text-muted-foreground text-sm">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={reset} data-testid="button-reset-dfs" className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <RotateCcw size={15} />
            </button>
            <button onClick={stepBackward} data-testid="button-step-back-dfs" disabled={currentStep < 0} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <SkipBack size={15} />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              data-testid="button-play-pause-dfs"
              disabled={currentStep >= steps.length - 1}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button onClick={stepForward} data-testid="button-step-forward-dfs" disabled={currentStep >= steps.length - 1} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <SkipForward size={15} />
            </button>
          </div>

          <div className="flex-1 w-full">
            <input
              type="range"
              min={-1}
              max={steps.length - 1}
              value={currentStep}
              data-testid="slider-step-dfs"
              onChange={(e) => { setCurrentStep(Number(e.target.value)); setIsPlaying(false); }}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Start</span>
              <span>{currentStep + 1} / {steps.length} steps</span>
              <span>End</span>
            </div>
          </div>

          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            {SPEED_OPTIONS.map((s, idx) => (
              <button
                key={s.label}
                onClick={() => setSpeedIdx(idx)}
                data-testid={`dfs-speed-${s.label.toLowerCase()}`}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${speedIdx === idx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DFSExplanationPanel() {
  const sections = [
    {
      title: "What is DFS?",
      color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
      dot: "bg-chart-1",
      content: "Depth-First Search (DFS) explores a tree or graph by going as deep as possible along each branch before backtracking. It's like navigating a maze by always turning left until you hit a dead-end.",
    },
    {
      title: "How DFS Works",
      color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
      dot: "bg-chart-2",
      bullets: [
        "Start at the root node",
        "Mark it as visited, push onto the call stack",
        "Recursively visit the first unvisited child",
        "When no unvisited children remain, backtrack (pop the stack)",
        "Repeat until all nodes are visited",
      ],
    },
    {
      title: "The Recursion & Stack",
      color: "bg-chart-3/15 border-chart-3/40 text-chart-3",
      dot: "bg-chart-3",
      content: "DFS naturally maps to recursion. Each function call represents entering a node. The call stack IS the DFS stack — when a function returns, you backtrack to the parent. You can also implement it explicitly with a stack data structure.",
      example: "dfs(node):\n  mark node as visited\n  for each child of node:\n    if child not visited:\n      dfs(child)",
    },
    {
      title: "Time & Space Complexity",
      color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
      dot: "bg-chart-4",
      bullets: [
        "Time: O(V + E) — visits every vertex (V) and edge (E) once",
        "Space: O(H) — call stack depth equals the tree height H",
        "Best case (balanced tree): O(log N) space",
        "Worst case (skewed tree): O(N) space",
      ],
    },
    {
      title: "DFS Traversal Orders",
      color: "bg-chart-5/15 border-chart-5/40 text-chart-5",
      dot: "bg-chart-5",
      bullets: [
        "Pre-order: visit node → left → right (this visualizer uses pre-order)",
        "In-order: left → visit node → right (gives sorted output for BST)",
        "Post-order: left → right → visit node (useful for deletion)",
      ],
    },
    {
      title: "Real-world Applications",
      color: "bg-primary/15 border-primary/40 text-primary",
      dot: "bg-primary",
      bullets: [
        "Detecting cycles in a graph",
        "Topological sorting (build systems, task scheduling)",
        "Solving mazes and puzzles",
        "Finding connected components",
        "Web crawlers traversing hyperlinks",
        "Compiler syntax tree analysis",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-bold text-lg text-foreground mb-1">Understanding DFS</h2>
        <p className="text-muted-foreground text-sm">A visual guide to Depth-First Search on trees and graphs.</p>
      </div>

      {sections.map((sec, idx) => (
        <motion.div
          key={sec.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.07 }}
          className="bg-card border border-card-border rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sec.color}`}>0{idx + 1}</span>
            <h3 className="font-semibold text-foreground">{sec.title}</h3>
          </div>
          {sec.content && <p className="text-sm text-muted-foreground leading-relaxed">{sec.content}</p>}
          {sec.bullets && (
            <ul className="space-y-2">
              {sec.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${sec.dot}`} />
                  <span className="font-mono text-xs leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          )}
          {"example" in sec && sec.example && (
            <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground border border-border whitespace-pre">
              {sec.example}
            </div>
          )}
        </motion.div>
      ))}

      <div className="bg-gradient-to-br from-primary/8 to-chart-2/8 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-sm text-muted-foreground">Ready to see DFS in action?</p>
        <p className="text-sm font-medium text-foreground mt-1">Switch to the Visualizer tab and press Play!</p>
      </div>
    </div>
  );
}
