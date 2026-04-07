import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronRight } from "lucide-react";
import { CodeVariantsPanel, type CodeSnippet, type CodeVariant } from "@/components/code-variants-panel";
import { ExplanationComments } from "@/components/explanation-comments";

interface Item {
  id: number;
  name: string;
  weight: number;
  value: number;
}

interface KnapsackStep {
  i: number;
  j: number;
  value: number;
  included: boolean;
  tooHeavy: boolean;
  prevValue: number;
  includeValue: number | null;
  explanation: string;
}

interface KnapsackData {
  steps: KnapsackStep[];
  dp: number[][];
  selected: number[];
  selectedCellSet: Set<string>;
}

function buildKnapsackSteps(items: Item[], capacity: number): KnapsackData {
  const n = items.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));
  const steps: KnapsackStep[] = [];

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    for (let j = 0; j <= capacity; j++) {
      const tooHeavy = item.weight > j;
      const excludeVal = dp[i - 1][j];
      const includeVal = !tooHeavy ? dp[i - 1][j - item.weight] + item.value : null;
      const included = !tooHeavy && includeVal! > excludeVal;
      dp[i][j] = included ? includeVal! : excludeVal;
      steps.push({
        i, j, value: dp[i][j], included, tooHeavy,
        prevValue: excludeVal,
        includeValue: includeVal,
        explanation: tooHeavy
          ? `"${item.name}" weighs ${item.weight} — too heavy for capacity ${j}. Copy from above: dp[${i}][${j}] = dp[${i - 1}][${j}] = ${dp[i][j]}`
          : included
          ? `"${item.name}" (wt=${item.weight}, val=${item.value}): Include it! dp[${i - 1}][${j - item.weight}] + ${item.value} = ${includeVal} > ${excludeVal} (skip). dp[${i}][${j}] = ${dp[i][j]}`
          : `"${item.name}" (wt=${item.weight}, val=${item.value}): Skip it. ${excludeVal} ≥ ${includeVal ?? 0} (include). dp[${i}][${j}] = ${dp[i][j]}`,
      });
    }
  }

  const selected: number[] = [];
  const selectedCellSet = new Set<string>();
  let pi = n, pj = capacity;
  while (pi > 0 && pj >= 0) {
    if (dp[pi][pj] !== dp[pi - 1][pj]) {
      selected.push(pi - 1);
      selectedCellSet.add(`${pi},${pj}`);
      pj -= items[pi - 1].weight;
    }
    pi--;
  }

  return { steps, dp, selected, selectedCellSet };
}

const PRESETS: { label: string; capacity: number; items: Item[] }[] = [
  {
    label: "Classic",
    capacity: 5,
    items: [
      { id: 1, name: "Gold", weight: 2, value: 3 },
      { id: 2, name: "Silver", weight: 3, value: 4 },
      { id: 3, name: "Diamond", weight: 4, value: 5 },
      { id: 4, name: "Ruby", weight: 5, value: 8 },
    ],
  },
  {
    label: "Treasure",
    capacity: 6,
    items: [
      { id: 1, name: "Ring", weight: 1, value: 1 },
      { id: 2, name: "Map", weight: 2, value: 6 },
      { id: 3, name: "Sword", weight: 3, value: 10 },
      { id: 4, name: "Shield", weight: 5, value: 16 },
    ],
  },
  {
    label: "Thief's Bag",
    capacity: 8,
    items: [
      { id: 1, name: "Laptop", weight: 3, value: 4 },
      { id: 2, name: "Camera", weight: 2, value: 3 },
      { id: 3, name: "Watch", weight: 1, value: 2 },
      { id: 4, name: "Phone", weight: 2, value: 5 },
      { id: 5, name: "Tablet", weight: 4, value: 6 },
    ],
  },
  {
    label: "Simple",
    capacity: 4,
    items: [
      { id: 1, name: "A", weight: 1, value: 1 },
      { id: 2, name: "B", weight: 2, value: 6 },
      { id: 3, name: "C", weight: 3, value: 10 },
      { id: 4, name: "D", weight: 5, value: 16 },
    ],
  },
];

const SPEED_OPTIONS = [
  { label: "Slow", ms: 1000 },
  { label: "Normal", ms: 450 },
  { label: "Fast", ms: 150 },
];

const ITEM_COLORS = [
  { bg: "bg-chart-1/15", border: "border-chart-1/50", text: "text-chart-1", activeBg: "bg-chart-1/25" },
  { bg: "bg-chart-2/15", border: "border-chart-2/50", text: "text-chart-2", activeBg: "bg-chart-2/25" },
  { bg: "bg-chart-3/15", border: "border-chart-3/50", text: "text-chart-3", activeBg: "bg-chart-3/25" },
  { bg: "bg-chart-4/15", border: "border-chart-4/50", text: "text-chart-4", activeBg: "bg-chart-4/25" },
  { bg: "bg-chart-5/15", border: "border-chart-5/50", text: "text-chart-5", activeBg: "bg-chart-5/25" },
];

function snippets(languages: {
  java: string;
  csharp: string;
  python: string;
  javascript: string;
  cpp: string;
}): CodeSnippet[] {
  return [
    { id: "java", language: "Java", code: languages.java },
    { id: "csharp", language: "C#", code: languages.csharp },
    { id: "python", language: "Python", code: languages.python },
    { id: "javascript", language: "JavaScript", code: languages.javascript },
    { id: "cpp", language: "C++", code: languages.cpp },
  ];
}

const KNAPSACK_CODE_VARIANTS: CodeVariant[] = [
  {
    id: "recursion",
    label: "Recursion",
    snippets: snippets({
      java: `class Solution {
  int knapsack(int[] wt, int[] val, int capacity, int n) {
    if (n == 0 || capacity == 0) return 0;
    if (wt[n - 1] > capacity) return knapsack(wt, val, capacity, n - 1);
    return Math.max(
      val[n - 1] + knapsack(wt, val, capacity - wt[n - 1], n - 1),
      knapsack(wt, val, capacity, n - 1)
    );
  }
}`,
      csharp: `public class Solution {
  public int Knapsack(int[] wt, int[] val, int capacity, int n) {
    if (n == 0 || capacity == 0) return 0;
    if (wt[n - 1] > capacity) return Knapsack(wt, val, capacity, n - 1);
    return Math.Max(
      val[n - 1] + Knapsack(wt, val, capacity - wt[n - 1], n - 1),
      Knapsack(wt, val, capacity, n - 1)
    );
  }
}`,
      python: `def knapsack_recursive(wt, val, capacity, n):
    if n == 0 or capacity == 0:
        return 0
    if wt[n - 1] > capacity:
        return knapsack_recursive(wt, val, capacity, n - 1)
    return max(
        val[n - 1] + knapsack_recursive(wt, val, capacity - wt[n - 1], n - 1),
        knapsack_recursive(wt, val, capacity, n - 1),
    )`,
      javascript: `function knapsackRecursive(weights, values, capacity, n) {
  if (n === 0 || capacity === 0) return 0;
  if (weights[n - 1] > capacity) {
    return knapsackRecursive(weights, values, capacity, n - 1);
  }
  return Math.max(
    values[n - 1] + knapsackRecursive(weights, values, capacity - weights[n - 1], n - 1),
    knapsackRecursive(weights, values, capacity, n - 1)
  );
}`,
      cpp: `class Solution {
public:
  int knapsack(vector<int>& wt, vector<int>& val, int capacity, int n) {
    if (n == 0 || capacity == 0) return 0;
    if (wt[n - 1] > capacity) return knapsack(wt, val, capacity, n - 1);
    return max(
      val[n - 1] + knapsack(wt, val, capacity - wt[n - 1], n - 1),
      knapsack(wt, val, capacity, n - 1)
    );
  }
};`,
    }),
    note: "This version directly models the include-or-skip choice, but it repeats the same states many times.",
  },
  {
    id: "topdown",
    label: "Top-down",
    snippets: snippets({
      java: `class Solution {
  int[][] memo;

  int solve(int[] wt, int[] val, int n, int w) {
    if (n == 0 || w == 0) return 0;
    if (memo[n][w] != -1) return memo[n][w];
    if (wt[n - 1] > w) memo[n][w] = solve(wt, val, n - 1, w);
    else {
      memo[n][w] = Math.max(
        val[n - 1] + solve(wt, val, n - 1, w - wt[n - 1]),
        solve(wt, val, n - 1, w)
      );
    }
    return memo[n][w];
  }
}`,
      csharp: `public class Solution {
  private int[,] memo;

  public int Solve(int[] wt, int[] val, int n, int w) {
    if (n == 0 || w == 0) return 0;
    if (memo[n, w] != -1) return memo[n, w];
    if (wt[n - 1] > w) memo[n, w] = Solve(wt, val, n - 1, w);
    else {
      memo[n, w] = Math.Max(
        val[n - 1] + Solve(wt, val, n - 1, w - wt[n - 1]),
        Solve(wt, val, n - 1, w)
      );
    }
    return memo[n, w];
  }
}`,
      python: `def knapsack_memo(wt, val, capacity):
    memo = [[-1] * (capacity + 1) for _ in range(len(wt) + 1)]

    def solve(n, w):
        if n == 0 or w == 0:
            return 0
        if memo[n][w] != -1:
            return memo[n][w]
        if wt[n - 1] > w:
            memo[n][w] = solve(n - 1, w)
        else:
            memo[n][w] = max(
                val[n - 1] + solve(n - 1, w - wt[n - 1]),
                solve(n - 1, w),
            )
        return memo[n][w]

    return solve(len(wt), capacity)`,
      javascript: `function knapsackMemo(weights, values, capacity) {
  const memo = Array.from({ length: weights.length + 1 }, () =>
    Array(capacity + 1).fill(-1)
  );

  function solve(n, w) {
    if (n === 0 || w === 0) return 0;
    if (memo[n][w] !== -1) return memo[n][w];
    if (weights[n - 1] > w) memo[n][w] = solve(n - 1, w);
    else {
      memo[n][w] = Math.max(
        values[n - 1] + solve(n - 1, w - weights[n - 1]),
        solve(n - 1, w)
      );
    }
    return memo[n][w];
  }

  return solve(weights.length, capacity);
}`,
      cpp: `class Solution {
public:
  vector<vector<int>> memo;

  int solve(vector<int>& wt, vector<int>& val, int n, int w) {
    if (n == 0 || w == 0) return 0;
    if (memo[n][w] != -1) return memo[n][w];
    if (wt[n - 1] > w) memo[n][w] = solve(wt, val, n - 1, w);
    else {
      memo[n][w] = max(
        val[n - 1] + solve(wt, val, n - 1, w - wt[n - 1]),
        solve(wt, val, n - 1, w)
      );
    }
    return memo[n][w];
  }
};`,
    }),
    note: "Memoization preserves the recursive decision tree while caching each (item, capacity) state.",
  },
  {
    id: "bottomup",
    label: "Bottom-up",
    snippets: snippets({
      java: `class Solution {
  int knapsackBottomUp(int[] wt, int[] val, int capacity) {
    int n = wt.length;
    int[][] dp = new int[n + 1][capacity + 1];
    for (int i = 1; i <= n; i++) {
      for (int w = 0; w <= capacity; w++) {
        if (wt[i - 1] > w) dp[i][w] = dp[i - 1][w];
        else dp[i][w] = Math.max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w]);
      }
    }
    return dp[n][capacity];
  }
}`,
      csharp: `public class Solution {
  public int KnapsackBottomUp(int[] wt, int[] val, int capacity) {
    int n = wt.Length;
    int[,] dp = new int[n + 1, capacity + 1];
    for (int i = 1; i <= n; i++) {
      for (int w = 0; w <= capacity; w++) {
        if (wt[i - 1] > w) dp[i, w] = dp[i - 1, w];
        else dp[i, w] = Math.Max(val[i - 1] + dp[i - 1, w - wt[i - 1]], dp[i - 1, w]);
      }
    }
    return dp[n, capacity];
  }
}`,
      python: `def knapsack_bottom_up(wt, val, capacity):
    n = len(wt)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            if wt[i - 1] > w:
                dp[i][w] = dp[i - 1][w]
            else:
                dp[i][w] = max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w])
    return dp[n][capacity]`,
      javascript: `function knapsackBottomUp(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () =>
    Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] > w) dp[i][w] = dp[i - 1][w];
      else dp[i][w] = Math.max(values[i - 1] + dp[i - 1][w - weights[i - 1]], dp[i - 1][w]);
    }
  }

  return dp[n][capacity];
}`,
      cpp: `class Solution {
public:
  int knapsackBottomUp(vector<int>& wt, vector<int>& val, int capacity) {
    int n = wt.size();
    vector<vector<int>> dp(n + 1, vector<int>(capacity + 1, 0));
    for (int i = 1; i <= n; i++) {
      for (int w = 0; w <= capacity; w++) {
        if (wt[i - 1] > w) dp[i][w] = dp[i - 1][w];
        else dp[i][w] = max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w]);
      }
    }
    return dp[n][capacity];
  }
};`,
    }),
    note: "This tabulation form fills the same table shape that the visualizer animates on screen.",
  },
];

export default function KnapsackVisualizer() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [items, setItems] = useState(PRESETS[0].items);
  const [capacity, setCapacity] = useState(PRESETS[0].capacity);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showResult, setShowResult] = useState(false);

  const computedRef = useRef<KnapsackData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (computedRef.current === null) {
    computedRef.current = buildKnapsackSteps(items, capacity);
  }

  useEffect(() => {
    computedRef.current = buildKnapsackSteps(items, capacity);
    setCurrentStep(-1);
    setIsPlaying(false);
    setShowResult(false);
  }, [items, capacity]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || !computedRef.current) return;
    const { steps } = computedRef.current;
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) { setIsPlaying(false); setShowResult(true); return steps.length - 1; }
        return prev + 1;
      });
    }, SPEED_OPTIONS[speedIdx].ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speedIdx]);

  const reset = useCallback(() => { setCurrentStep(-1); setIsPlaying(false); setShowResult(false); }, []);

  const stepForward = useCallback(() => {
    if (!computedRef.current) return;
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, computedRef.current!.steps.length - 1);
      if (next === computedRef.current!.steps.length - 1) setShowResult(true);
      return next;
    });
  }, []);

  const stepBackward = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, -1);
      if (next < (computedRef.current?.steps.length ?? 0) - 1) setShowResult(false);
      return next;
    });
  }, []);

  const loadPreset = (idx: number) => {
    setPresetIdx(idx);
    setItems(PRESETS[idx].items);
    setCapacity(PRESETS[idx].capacity);
  };

  const data = computedRef.current;
  const totalSteps = data?.steps.length ?? 0;
  const currentStepData = data && currentStep >= 0 ? data.steps[currentStep] : null;

  const partialDp: (number | null)[][] = Array.from(
    { length: items.length + 1 },
    () => Array(capacity + 1).fill(null)
  );
  for (let j = 0; j <= capacity; j++) partialDp[0][j] = 0;
  if (data) {
    for (let k = 0; k <= currentStep; k++) {
      const s = data.steps[k];
      partialDp[s.i][s.j] = s.value;
    }
  }

  const selectedSet = showResult && data ? new Set(data.selected) : new Set<number>();
  const totalValue = showResult && data ? data.selected.reduce((s, idx) => s + items[idx].value, 0) : null;
  const totalWeight = showResult && data ? data.selected.reduce((s, idx) => s + items[idx].weight, 0) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Preset</h2>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={p.label}
                onClick={() => loadPreset(idx)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${presetIdx === idx ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            Knapsack capacity: <span className="font-bold text-foreground">{capacity}</span> units
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
          <div className="space-y-1.5">
            {items.map((item, idx) => {
              const colors = ITEM_COLORS[idx % ITEM_COLORS.length];
              const isCurrentItem = currentStepData?.i === idx + 1;
              const isSelected = selectedSet.has(idx);
              return (
                <motion.div
                  key={item.id}
                  animate={{ scale: isCurrentItem ? 1.02 : 1 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-300 ${
                    isSelected
                      ? "bg-emerald-400/15 border-emerald-400/50"
                      : isCurrentItem
                      ? `${colors.activeBg} ${colors.border}`
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {idx + 1}
                  </span>
                  <span className="font-medium text-foreground flex-1">{item.name}</span>
                  <span className="text-muted-foreground text-xs">wt: <strong className="text-foreground">{item.weight}</strong></span>
                  <span className="text-muted-foreground text-xs">val: <strong className="text-foreground">{item.value}</strong></span>
                  {isSelected && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-card-border flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm text-foreground">DP Table — dp[item][weight capacity]</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { color: "bg-primary/30 border-primary/60", label: "Current" },
              { color: "bg-emerald-400/30 border-emerald-400/60", label: "Include" },
              { color: "bg-rose-400/20 border-rose-400/60", label: "Too Heavy" },
              { color: "bg-amber-400/30 border-amber-400/60", label: "Optimal Path" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm border inline-block ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="border-separate" style={{ borderSpacing: 3 }}>
            <thead>
              <tr>
                <td style={{ width: 90, height: 40 }} className="text-xs text-muted-foreground text-right pr-2 align-bottom">
                  Item ↓ / Cap →
                </td>
                {Array.from({ length: capacity + 1 }, (_, j) => (
                  <td key={j} style={{ width: 44, height: 40 }} className="text-center">
                    <span className="inline-flex items-center justify-center w-full h-full rounded-md bg-muted/50 text-muted-foreground font-bold text-xs border border-border">{j}</span>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: items.length + 1 }, (_, i) => (
                <tr key={i}>
                  <td style={{ width: 90, height: 44 }} className="text-right pr-2">
                    {i === 0 ? (
                      <span className="text-xs text-muted-foreground italic">∅ none</span>
                    ) : (() => {
                      const colors = ITEM_COLORS[(i - 1) % ITEM_COLORS.length];
                      const isActive = currentStepData?.i === i;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border transition-all ${isActive ? `${colors.activeBg} ${colors.text} ${colors.border}` : `${colors.bg} ${colors.text} ${colors.border}`}`}>
                          {i}. {items[i - 1].name}
                        </span>
                      );
                    })()}
                  </td>
                  {Array.from({ length: capacity + 1 }, (_, j) => {
                    const val = partialDp[i][j];
                    const isCurrent = currentStepData?.i === i && currentStepData?.j === j;
                    const isIncluded = isCurrent && currentStepData?.included;
                    const isTooHeavy = isCurrent && currentStepData?.tooHeavy;
                    const isResultPath = showResult && data?.selectedCellSet.has(`${i},${j}`);
                    const isJustFilled = isCurrent && val !== null;

                    let bg = "bg-muted/40 border-border";
                    if (isResultPath) bg = "bg-amber-400/25 border-amber-400/70";
                    if (isTooHeavy) bg = "bg-rose-400/15 border-rose-400/60";
                    if (isCurrent && !isIncluded && !isTooHeavy) bg = "bg-primary/20 border-primary/60";
                    if (isIncluded) bg = "bg-emerald-400/25 border-emerald-400/70";

                    return (
                      <td key={j} style={{ width: 44, height: 44 }} className="text-center">
                        <div
                          className={`inline-flex items-center justify-center w-full h-full rounded-lg border-2 text-sm font-bold transition-all duration-300 ${bg} ${isCurrent ? "shadow-sm scale-105" : ""} ${isJustFilled ? "cell-pop" : ""}`}
                        >
                          {val !== null ? (
                            <span className={
                              isResultPath ? "text-amber-700 dark:text-amber-300" :
                              isIncluded ? "text-emerald-700 dark:text-emerald-300" :
                              isTooHeavy ? "text-rose-600 dark:text-rose-400" :
                              isCurrent ? "text-primary" : "text-foreground"
                            }>{val}</span>
                          ) : (
                            <span className="text-border/50 text-xs">·</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {currentStepData && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
              currentStepData.included
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
                : currentStepData.tooHeavy
                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700"
                : "bg-primary/5 border-primary/25"
            }`}
          >
            <ChevronRight size={16} className={`mt-0.5 shrink-0 ${currentStepData.included ? "text-emerald-600" : currentStepData.tooHeavy ? "text-rose-500" : "text-primary"}`} />
            <p className={`text-sm font-medium font-mono leading-relaxed ${currentStepData.included ? "text-emerald-700 dark:text-emerald-300" : currentStepData.tooHeavy ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
              {currentStepData.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResult && totalValue !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-primary/10 to-chart-2/10 border border-primary/30 rounded-xl px-5 py-4 space-y-3"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Optimal items to take:</span>
              <div className="flex gap-1.5 flex-wrap">
                {data!.selected.map((itemIdx, i) => (
                  <motion.span
                    key={itemIdx}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-sm"
                  >
                    {items[itemIdx].name}
                  </motion.span>
                ))}
              </div>
            </div>
            <div className="flex gap-6 text-sm flex-wrap">
              <span className="text-muted-foreground">
                Max Value: <strong className="text-emerald-600 dark:text-emerald-400 text-base">{totalValue}</strong>
              </span>
              <span className="text-muted-foreground">
                Weight Used: <strong className="text-foreground text-base">{totalWeight}</strong>
                <span className="text-muted-foreground"> / {capacity}</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={reset} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <RotateCcw size={15} />
            </button>
            <button onClick={stepBackward} disabled={currentStep < 0} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <SkipBack size={15} />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              disabled={!data || currentStep >= totalSteps - 1}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button onClick={stepForward} disabled={!data || currentStep >= totalSteps - 1} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <SkipForward size={15} />
            </button>
          </div>

          <div className="flex-1 w-full">
            <input
              type="range"
              min={-1}
              max={totalSteps - 1}
              value={currentStep}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentStep(val);
                setIsPlaying(false);
                setShowResult(val === totalSteps - 1);
              }}
              className="w-full accent-primary cursor-pointer"
              disabled={!data}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Start</span>
              <span>{currentStep + 1} / {totalSteps} steps</span>
              <span>End</span>
            </div>
          </div>

          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            {SPEED_OPTIONS.map((s, idx) => (
              <button
                key={s.label}
                onClick={() => setSpeedIdx(idx)}
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

export function KnapsackExplanationPanel() {
  const sections = [
    {
      title: "What is the 0/1 Knapsack Problem?",
      color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
      dot: "bg-chart-1",
      content: "You have a bag with a weight limit and a set of items, each with a weight and a value. You must choose which items to take to maximize total value — but you can't break items (0/1 rule: take it fully or leave it).",
      example: "Bag capacity = 5. Items: Gold (wt=2, val=3), Silver (wt=3, val=4), Ruby (wt=5, val=8). Best pick: Gold + Silver = val 7 at weight 5.",
    },
    {
      title: "Why Dynamic Programming?",
      color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
      dot: "bg-chart-2",
      content: "With n items, brute force checks all 2ⁿ subsets — exponential. DP avoids redundant work by storing results for every (item count, capacity) pair.",
      example: "Time: O(n × W). Space: O(n × W). Where n = number of items, W = capacity.",
    },
    {
      title: "The Recurrence",
      color: "bg-chart-3/15 border-chart-3/40 text-chart-3",
      dot: "bg-chart-3",
      content: "dp[i][j] = max value using the first i items with a bag of capacity j.",
      bullets: [
        "Base case: dp[0][j] = 0 for all j (no items → no value)",
        "If weight[i] > j: dp[i][j] = dp[i−1][j]  (item is too heavy, skip it)",
        "Else: dp[i][j] = max(dp[i−1][j], dp[i−1][j−weight[i]] + value[i])",
        "The max() picks the better of: skip item i, or take it and use remaining capacity",
      ],
    },
    {
      title: "Reading the Table",
      color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
      dot: "bg-chart-4",
      content: "Each cell dp[i][j] answers: 'what's the best value I can get using items 1..i and a bag of size j?' The final answer is dp[n][W] — bottom-right cell.",
      example: "Green cells = item was included. Red cells = item was too heavy. Gold path = optimal backtracked solution.",
    },
    {
      title: "Backtracking the Solution",
      color: "bg-chart-5/15 border-chart-5/40 text-chart-5",
      dot: "bg-chart-5",
      content: "To find which items to take, trace back from dp[n][W]. If dp[i][j] ≠ dp[i−1][j], item i was included — subtract its weight and move up. The golden cells show this path.",
      bullets: [
        "Start at dp[n][W] (bottom-right)",
        "If value came from above (dp[i−1][j]), item i was skipped — go up",
        "If value changed, item i was included — record it, subtract its weight, go up-left",
      ],
    },
    {
      title: "Real-world Applications",
      color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
      dot: "bg-chart-1",
      bullets: [
        "Resource allocation in operating systems (memory, CPU)",
        "Portfolio optimization in finance",
        "Cargo loading for shipping containers",
        "Cutting stock problems in manufacturing",
        "Ad selection for limited screen space",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-bold text-lg text-foreground mb-1">Understanding 0/1 Knapsack</h2>
        <p className="text-muted-foreground text-sm">A visual guide to the classic DP optimization problem — choosing items to maximize value within a weight limit.</p>
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
            <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground border border-border">{sec.example}</div>
          )}
        </motion.div>
      ))}
      <CodeVariantsPanel title="0/1 Knapsack Code" variants={KNAPSACK_CODE_VARIANTS} />
      <div className="bg-gradient-to-br from-primary/8 to-chart-2/8 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-sm text-muted-foreground">Ready to see it in action?</p>
        <p className="text-sm font-medium text-foreground mt-1">Switch to the Visualizer tab and press Play!</p>
      </div>
      <ExplanationComments storageKey="knapsack-how-it-works" />
    </div>
  );
}
