import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { CodeVariantsPanel, type CodeSnippet, type CodeVariant } from "@/components/code-variants-panel";
import { ExplanationComments } from "@/components/explanation-comments";
import { cn } from "@/lib/utils";

type CellValue = boolean | number;
type ProblemKey =
  | "subset-sum"
  | "equal-partition"
  | "count-subset-sum"
  | "min-subset-diff"
  | "target-sum"
  | "subset-diff-count";
type ResultTone = "success" | "warning";

interface DpStep {
  i: number;
  j: number;
  value: CellValue;
  included: boolean;
  blocked: boolean;
  explanation: string;
}

interface ResultMetric {
  label: string;
  value: string;
  accent?: string;
}

interface ResultGroup {
  label: string;
  indices: number[];
}

interface ResultSummary {
  tone: ResultTone;
  title: string;
  metrics: ResultMetric[];
  groups?: ResultGroup[];
  note?: string;
}

interface VisualizerData {
  steps: DpStep[];
  dp: CellValue[][];
  baseGrid: CellValue[][];
  target: number;
  pathCells: Set<string>;
  selectedIndices: number[];
  result: ResultSummary;
}

interface ProblemPreset {
  label: string;
  numbers: number[];
  parameter?: number;
}

interface ExplanationSection {
  title: string;
  color: string;
  dot: string;
  content?: string;
  bullets?: string[];
  example?: string;
}

interface ProblemDefinition {
  key: ProblemKey;
  title: string;
  subtitle: string;
  tableTitle: string;
  dimensionLabel: string;
  badge: string;
  valueType: "boolean" | "count";
  presets: ProblemPreset[];
  parameterLabel?: string;
  explanationTitle: string;
  explanationSubtitle: string;
  explanationSections: ExplanationSection[];
  codeVariants: CodeVariant[];
  build: (preset: ProblemPreset) => VisualizerData;
}

const SPEED_OPTIONS = [
  { label: "Slow", ms: 1000 },
  { label: "Normal", ms: 450 },
  { label: "Fast", ms: 160 },
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

function cloneGrid<T>(grid: T[][]): T[][] {
  return grid.map((row) => [...row]);
}

function makeBooleanBaseGrid(n: number, target: number) {
  const base = Array.from({ length: n + 1 }, () => Array(target + 1).fill(false));
  for (let i = 0; i <= n; i++) {
    base[i][0] = true;
  }
  return base;
}

function makeCountBaseGrid(n: number, target: number) {
  const base = Array.from({ length: n + 1 }, () => Array(target + 1).fill(0));
  for (let i = 0; i <= n; i++) {
    base[i][0] = 1;
  }
  return base;
}

function traceBooleanSelection(dp: boolean[][], numbers: number[], target: number) {
  const selectedIndices: number[] = [];
  const pathCells = new Set<string>();
  let i = numbers.length;
  let j = target;

  while (i > 0 && j >= 0 && dp[i][j]) {
    pathCells.add(`${i},${j}`);
    const value = numbers[i - 1];
    if (j >= value && dp[i - 1][j - value]) {
      selectedIndices.push(i - 1);
      j -= value;
    }
    i -= 1;
  }

  pathCells.add(`${Math.max(i, 0)},${Math.max(j, 0)}`);
  selectedIndices.reverse();
  return { selectedIndices, pathCells };
}

function subsetFromIndices(numbers: number[], indices: number[]) {
  return indices.map((idx) => numbers[idx]);
}

function complementIndices(numbers: number[], selectedIndices: number[]) {
  const selectedSet = new Set(selectedIndices);
  return numbers.map((_, idx) => idx).filter((idx) => !selectedSet.has(idx));
}

function formatCellValue(value: CellValue, type: ProblemDefinition["valueType"]) {
  if (type === "boolean") {
    return value ? "1" : "0";
  }
  return String(value);
}

function createBooleanSubsetProblemData(
  numbers: number[],
  target: number,
  options: {
    explanationPrefix: string;
    resultBuilder: (found: boolean, indices: number[]) => ResultSummary;
  },
): VisualizerData {
  const n = numbers.length;
  const baseGrid = makeBooleanBaseGrid(n, target);
  const dp = cloneGrid(baseGrid);
  const steps: DpStep[] = [];

  for (let i = 1; i <= n; i++) {
    const value = numbers[i - 1];
    for (let sum = 1; sum <= target; sum++) {
      const skip = dp[i - 1][sum];
      const blocked = value > sum;
      const take = !blocked ? dp[i - 1][sum - value] : false;
      dp[i][sum] = skip || take;
      steps.push({
        i,
        j: sum,
        value: dp[i][sum],
        included: !blocked && take,
        blocked,
        explanation: blocked
          ? `${options.explanationPrefix}: ${value} is larger than ${sum}, so we copy dp[${i - 1}][${sum}] = ${skip ? 1 : 0}.`
          : dp[i][sum]
          ? `${options.explanationPrefix}: sum ${sum} is reachable because ${take ? `taking ${value} keeps dp[${i - 1}][${sum - value}] = 1` : `skipping ${value} keeps dp[${i - 1}][${sum}] = 1`}.`
          : `${options.explanationPrefix}: neither skipping ${value} nor taking it can form sum ${sum}, so dp[${i}][${sum}] = 0.`,
      });
    }
  }

  const found = dp[n][target];
  const traced = found ? traceBooleanSelection(dp, numbers, target) : { selectedIndices: [], pathCells: new Set<string>() };

  return {
    steps,
    dp,
    baseGrid,
    target,
    pathCells: traced.pathCells,
    selectedIndices: traced.selectedIndices,
    result: options.resultBuilder(found, traced.selectedIndices),
  };
}

function createCountSubsetProblemData(
  numbers: number[],
  target: number,
  options: {
    explanationPrefix: string;
    resultBuilder: (count: number) => ResultSummary;
  },
): VisualizerData {
  const n = numbers.length;
  const baseGrid = makeCountBaseGrid(n, target);
  const dp = cloneGrid(baseGrid);
  const steps: DpStep[] = [];

  for (let i = 1; i <= n; i++) {
    const value = numbers[i - 1];
    for (let sum = 1; sum <= target; sum++) {
      const skip = dp[i - 1][sum] as number;
      const blocked = value > sum;
      const take = !blocked ? (dp[i - 1][sum - value] as number) : 0;
      dp[i][sum] = skip + take;
      steps.push({
        i,
        j: sum,
        value: dp[i][sum],
        included: !blocked && take > 0,
        blocked,
        explanation: blocked
          ? `${options.explanationPrefix}: ${value} cannot fit into target ${sum}, so the count stays ${skip}.`
          : `${options.explanationPrefix}: ways(${sum}) = skip ${skip} + take ${take} = ${dp[i][sum]}.`,
      });
    }
  }

  const count = dp[n][target] as number;
  return {
    steps,
    dp,
    baseGrid,
    target,
    pathCells: new Set<string>([`${n},${target}`]),
    selectedIndices: [],
    result: options.resultBuilder(count),
  };
}

function buildBooleanCodeVariants(problemName: string, recurrence: string): CodeVariant[] {
  return [
    {
      id: "recursion",
      label: "Recursion",
      snippets: snippets({
        java: `class Solution {
  boolean solve(int[] arr, int target, int n) {
    if (target == 0) return true;
    if (n == 0) return false;
    if (arr[n - 1] > target) return solve(arr, target, n - 1);
    return solve(arr, target - arr[n - 1], n - 1) || solve(arr, target, n - 1);
  }
}`,
        csharp: `public class Solution {
  public bool Solve(int[] arr, int target, int n) {
    if (target == 0) return true;
    if (n == 0) return false;
    if (arr[n - 1] > target) return Solve(arr, target, n - 1);
    return Solve(arr, target - arr[n - 1], n - 1) || Solve(arr, target, n - 1);
  }
}`,
        python: `def solve(arr, target, n):
    if target == 0:
        return True
    if n == 0:
        return False
    if arr[n - 1] > target:
        return solve(arr, target, n - 1)
    return solve(arr, target - arr[n - 1], n - 1) or solve(arr, target, n - 1)`,
        javascript: `function solve(arr, target, n = arr.length) {
  if (target === 0) return true;
  if (n === 0) return false;
  if (arr[n - 1] > target) return solve(arr, target, n - 1);
  return solve(arr, target - arr[n - 1], n - 1) || solve(arr, target, n - 1);
}`,
        cpp: `class Solution {
public:
  bool solve(vector<int>& arr, int target, int n) {
    if (target == 0) return true;
    if (n == 0) return false;
    if (arr[n - 1] > target) return solve(arr, target, n - 1);
    return solve(arr, target - arr[n - 1], n - 1) || solve(arr, target, n - 1);
  }
};`,
      }),
      note: `${problemName} starts with the plain recursive include-or-skip decision.`,
    },
    {
      id: "topdown",
      label: "Top-down",
      snippets: snippets({
        java: `class Solution {
  Boolean[][] memo;

  boolean dfs(int[] arr, int n, int sum) {
    if (sum == 0) return true;
    if (n == 0) return false;
    if (memo[n][sum] != null) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) || dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
}`,
        csharp: `public class Solution {
  private bool?[,] memo;

  public bool Dfs(int[] arr, int n, int sum) {
    if (sum == 0) return true;
    if (n == 0) return false;
    if (memo[n, sum].HasValue) return memo[n, sum].Value;
    if (arr[n - 1] > sum) memo[n, sum] = Dfs(arr, n - 1, sum);
    else memo[n, sum] = Dfs(arr, n - 1, sum - arr[n - 1]) || Dfs(arr, n - 1, sum);
    return memo[n, sum]!.Value;
  }
}`,
        python: `def solve_memo(arr, target):
    memo = [[None] * (target + 1) for _ in range(len(arr) + 1)]

    def dfs(n, total):
        if total == 0:
            return True
        if n == 0:
            return False
        if memo[n][total] is not None:
            return memo[n][total]
        if arr[n - 1] > total:
            memo[n][total] = dfs(n - 1, total)
        else:
            memo[n][total] = dfs(n - 1, total - arr[n - 1]) or dfs(n - 1, total)
        return memo[n][total]

    return dfs(len(arr), target)`,
        javascript: `function solveMemo(arr, target) {
  const memo = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(undefined)
  );

  function dfs(n, sum) {
    if (sum === 0) return true;
    if (n === 0) return false;
    if (memo[n][sum] !== undefined) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(n - 1, sum);
    else memo[n][sum] = dfs(n - 1, sum - arr[n - 1]) || dfs(n - 1, sum);
    return memo[n][sum];
  }

  return dfs(arr.length, target);
}`,
        cpp: `class Solution {
public:
  vector<vector<int>> memo;

  bool dfs(vector<int>& arr, int n, int sum) {
    if (sum == 0) return true;
    if (n == 0) return false;
    if (memo[n][sum] != -1) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) || dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
};`,
      }),
      note: "Memoization keeps the recursive structure but caches each state once.",
    },
    {
      id: "bottomup",
      label: "Bottom-up",
      snippets: snippets({
        java: `class Solution {
  boolean solveBottomUp(int[] arr, int target) {
    boolean[][] dp = new boolean[arr.length + 1][target + 1];
    for (int i = 0; i <= arr.length; i++) dp[i][0] = true;
    for (int i = 1; i <= arr.length; i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
      }
    }
    return dp[arr.length][target];
  }
}`,
        csharp: `public class Solution {
  public bool SolveBottomUp(int[] arr, int target) {
    bool[,] dp = new bool[arr.Length + 1, target + 1];
    for (int i = 0; i <= arr.Length; i++) dp[i, 0] = true;
    for (int i = 1; i <= arr.Length; i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i, sum] = dp[i - 1, sum];
        else dp[i, sum] = dp[i - 1, sum - arr[i - 1]] || dp[i - 1, sum];
      }
    }
    return dp[arr.Length, target];
  }
}`,
        python: `def solve_bottom_up(arr, target):
    dp = [[False] * (target + 1) for _ in range(len(arr) + 1)]
    for i in range(len(arr) + 1):
        dp[i][0] = True
    for i in range(1, len(arr) + 1):
        for total in range(1, target + 1):
            if arr[i - 1] > total:
                dp[i][total] = dp[i - 1][total]
            else:
                dp[i][total] = dp[i - 1][total - arr[i - 1]] or dp[i - 1][total]
    return dp[len(arr)][target]`,
        javascript: `function solveBottomUp(arr, target) {
  const dp = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(false)
  );
  for (let i = 0; i <= arr.length; i++) dp[i][0] = true;
  for (let i = 1; i <= arr.length; i++) {
    for (let sum = 1; sum <= target; sum++) {
      ${recurrence}
    }
  }
  return dp[arr.length][target];
}`,
        cpp: `class Solution {
public:
  bool solveBottomUp(vector<int>& arr, int target) {
    vector<vector<bool>> dp(arr.size() + 1, vector<bool>(target + 1, false));
    for (int i = 0; i <= arr.size(); i++) dp[i][0] = true;
    for (int i = 1; i <= arr.size(); i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
      }
    }
    return dp[arr.size()][target];
  }
};`,
      }),
      note: "This is the tabulation view used by the visualizer table.",
    },
  ];
}

function buildCountCodeVariants(problemName: string, transformNote: string): CodeVariant[] {
  return [
    {
      id: "recursion",
      label: "Recursion",
      snippets: snippets({
        java: `class Solution {
  int countWays(int[] arr, int target, int n) {
    if (target == 0) return 1;
    if (n == 0) return 0;
    if (arr[n - 1] > target) return countWays(arr, target, n - 1);
    return countWays(arr, target - arr[n - 1], n - 1) + countWays(arr, target, n - 1);
  }
}`,
        csharp: `public class Solution {
  public int CountWays(int[] arr, int target, int n) {
    if (target == 0) return 1;
    if (n == 0) return 0;
    if (arr[n - 1] > target) return CountWays(arr, target, n - 1);
    return CountWays(arr, target - arr[n - 1], n - 1) + CountWays(arr, target, n - 1);
  }
}`,
        python: `def count_ways(arr, target, n):
    if target == 0:
        return 1
    if n == 0:
        return 0
    if arr[n - 1] > target:
        return count_ways(arr, target, n - 1)
    return count_ways(arr, target - arr[n - 1], n - 1) + count_ways(arr, target, n - 1)`,
        javascript: `function countWays(arr, target, n = arr.length) {
  if (target === 0) return 1;
  if (n === 0) return 0;
  if (arr[n - 1] > target) return countWays(arr, target, n - 1);
  return countWays(arr, target - arr[n - 1], n - 1) + countWays(arr, target, n - 1);
}`,
        cpp: `class Solution {
public:
  int countWays(vector<int>& arr, int target, int n) {
    if (target == 0) return 1;
    if (n == 0) return 0;
    if (arr[n - 1] > target) return countWays(arr, target, n - 1);
    return countWays(arr, target - arr[n - 1], n - 1) + countWays(arr, target, n - 1);
  }
};`,
      }),
      note: `${problemName} counts both branches instead of using boolean OR.`,
    },
    {
      id: "topdown",
      label: "Top-down",
      snippets: snippets({
        java: `class Solution {
  int[][] memo;

  int dfs(int[] arr, int n, int sum) {
    if (sum == 0) return 1;
    if (n == 0) return 0;
    if (memo[n][sum] != -1) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) + dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
}`,
        csharp: `public class Solution {
  private int[,] memo;

  public int Dfs(int[] arr, int n, int sum) {
    if (sum == 0) return 1;
    if (n == 0) return 0;
    if (memo[n, sum] != -1) return memo[n, sum];
    if (arr[n - 1] > sum) memo[n, sum] = Dfs(arr, n - 1, sum);
    else memo[n, sum] = Dfs(arr, n - 1, sum - arr[n - 1]) + Dfs(arr, n - 1, sum);
    return memo[n, sum];
  }
}`,
        python: `def count_ways_memo(arr, target):
    memo = [[-1] * (target + 1) for _ in range(len(arr) + 1)]

    def dfs(n, total):
        if total == 0:
            return 1
        if n == 0:
            return 0
        if memo[n][total] != -1:
            return memo[n][total]
        if arr[n - 1] > total:
            memo[n][total] = dfs(n - 1, total)
        else:
            memo[n][total] = dfs(n - 1, total - arr[n - 1]) + dfs(n - 1, total)
        return memo[n][total]

    return dfs(len(arr), target)`,
        javascript: `function countWaysMemo(arr, target) {
  const memo = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(-1)
  );

  function dfs(n, sum) {
    if (sum === 0) return 1;
    if (n === 0) return 0;
    if (memo[n][sum] !== -1) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(n - 1, sum);
    else memo[n][sum] = dfs(n - 1, sum - arr[n - 1]) + dfs(n - 1, sum);
    return memo[n][sum];
  }

  return dfs(arr.length, target);
}`,
        cpp: `class Solution {
public:
  vector<vector<int>> memo;

  int dfs(vector<int>& arr, int n, int sum) {
    if (sum == 0) return 1;
    if (n == 0) return 0;
    if (memo[n][sum] != -1) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) + dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
};`,
      }),
      note: "Top-down DP avoids recomputing the same count states.",
    },
    {
      id: "bottomup",
      label: "Bottom-up",
      snippets: snippets({
        java: `class Solution {
  int countWaysBottomUp(int[] arr, int target) {
    int[][] dp = new int[arr.length + 1][target + 1];
    for (int i = 0; i <= arr.length; i++) dp[i][0] = 1;
    for (int i = 1; i <= arr.length; i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] + dp[i - 1][sum];
      }
    }
    return dp[arr.length][target];
  }
}`,
        csharp: `public class Solution {
  public int CountWaysBottomUp(int[] arr, int target) {
    int[,] dp = new int[arr.Length + 1, target + 1];
    for (int i = 0; i <= arr.Length; i++) dp[i, 0] = 1;
    for (int i = 1; i <= arr.Length; i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i, sum] = dp[i - 1, sum];
        else dp[i, sum] = dp[i - 1, sum - arr[i - 1]] + dp[i - 1, sum];
      }
    }
    return dp[arr.Length, target];
  }
}`,
        python: `def count_ways_bottom_up(arr, target):
    dp = [[0] * (target + 1) for _ in range(len(arr) + 1)]
    for i in range(len(arr) + 1):
        dp[i][0] = 1
    for i in range(1, len(arr) + 1):
        for total in range(1, target + 1):
            if arr[i - 1] > total:
                dp[i][total] = dp[i - 1][total]
            else:
                dp[i][total] = dp[i - 1][total - arr[i - 1]] + dp[i - 1][total]
    return dp[len(arr)][target]`,
        javascript: `function countWaysBottomUp(arr, target) {
  const dp = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(0)
  );
  for (let i = 0; i <= arr.length; i++) dp[i][0] = 1;
  for (let i = 1; i <= arr.length; i++) {
    for (let sum = 1; sum <= target; sum++) {
      if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
      else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] + dp[i - 1][sum];
    }
  }
  return dp[arr.length][target];
}`,
        cpp: `class Solution {
public:
  int countWaysBottomUp(vector<int>& arr, int target) {
    vector<vector<int>> dp(arr.size() + 1, vector<int>(target + 1, 0));
    for (int i = 0; i <= arr.size(); i++) dp[i][0] = 1;
    for (int i = 1; i <= arr.size(); i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] + dp[i - 1][sum];
      }
    }
    return dp[arr.size()][target];
  }
};`,
      }),
      note: transformNote,
    },
  ];
}

const PROBLEMS = {} as Record<ProblemKey, ProblemDefinition>;

Object.assign(PROBLEMS, {
  "subset-sum": {
    key: "subset-sum",
    title: "Subset Sum Visualizer",
    subtitle: "Can a subset add up to the target?",
    tableTitle: "DP Table - dp[item][target sum]",
    dimensionLabel: "Target",
    badge: "SS",
    valueType: "boolean",
    parameterLabel: "Target Sum",
    presets: [
      { label: "Classic", numbers: [2, 3, 7, 8, 10], parameter: 11 },
      { label: "Balanced", numbers: [1, 2, 3, 4], parameter: 6 },
      { label: "Sparse", numbers: [3, 5, 6, 7], parameter: 9 },
    ],
    explanationTitle: "Understanding Subset Sum",
    explanationSubtitle: "A boolean DP table that marks whether each target sum is reachable.",
    explanationSections: [
      {
        title: "What is the problem?",
        color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
        dot: "bg-chart-1",
        content: "Given a set of numbers and a target, determine whether any subset sums exactly to that target.",
        example: "For [2, 3, 7, 8, 10] and target 11, the answer is true because 3 + 8 = 11.",
      },
      {
        title: "How is it like Knapsack?",
        color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
        dot: "bg-chart-4",
        bullets: [
          "It uses the same include-or-exclude choice as 0/1 Knapsack.",
          "Treat each number like an item and each target sum like a capacity.",
          "The main change is the DP value: here we store true/false reachability instead of maximum profit.",
        ],
      },
      {
        title: "The state",
        color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
        dot: "bg-chart-2",
        bullets: [
          "dp[i][s] = 1 if sum s can be made using the first i numbers.",
          "dp[i][0] = 1 because sum 0 is always reachable with the empty subset.",
          "The final answer is dp[n][target].",
        ],
      },
      {
        title: "Transition",
        color: "bg-chart-3/15 border-chart-3/40 text-chart-3",
        dot: "bg-chart-3",
        bullets: [
          "Skip current number: dp[i-1][s]",
          "Take current number: dp[i-1][s-number[i]]",
          "Use OR because either choice can make the sum reachable.",
        ],
      },
    ],
    codeVariants: buildBooleanCodeVariants(
      "Subset Sum",
      `if (arr[i - 1] > sum) {
        dp[i][sum] = dp[i - 1][sum];
      } else {
        dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
      }`,
    ),
    build: (preset: ProblemPreset) =>
      createBooleanSubsetProblemData(preset.numbers, preset.parameter ?? 0, {
        explanationPrefix: "Subset Sum",
        resultBuilder: (found, indices) => ({
          tone: found ? "success" : "warning",
          title: found ? "A subset reaches the target." : "No subset reaches the target.",
          metrics: [
            { label: "Target", value: String(preset.parameter ?? 0) },
            { label: "Reachable", value: found ? "Yes" : "No", accent: found ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
          ],
          groups: found ? [{ label: "Chosen subset", indices }] : undefined,
        }),
      }),
  },
  "equal-partition": {
    key: "equal-partition",
    title: "Equal Sum Partition Visualizer",
    subtitle: "Can the array be split into two equal halves?",
    tableTitle: "DP Table - reachability up to total / 2",
    dimensionLabel: "Half Sum",
    badge: "EQ",
    valueType: "boolean",
    presets: [
      { label: "Possible", numbers: [1, 5, 11, 5] },
      { label: "Odd Total", numbers: [1, 2, 3, 5] },
      { label: "Even Spread", numbers: [3, 3, 3, 3] },
    ],
    explanationTitle: "Understanding Equal Sum Partition",
    explanationSubtitle: "This problem reduces directly to subset sum with target total / 2.",
    explanationSections: [
      {
        title: "Reduction",
        color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
        dot: "bg-chart-1",
        content: "If the total sum is even, the problem becomes: can we form total / 2 from a subset?",
      },
      {
        title: "How is it like Knapsack?",
        color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
        dot: "bg-chart-4",
        bullets: [
          "It keeps the same 0/1 Knapsack decision: take the current number or skip it.",
          "The target half-sum plays the role of capacity.",
          "The change from Knapsack is that we check feasibility, not best value, and we reject odd totals before DP starts.",
        ],
      },
      {
        title: "Immediate impossible case",
        color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
        dot: "bg-chart-2",
        content: "If the total sum is odd, the array can never split into two equal halves.",
      },
      {
        title: "DP meaning",
        color: "bg-chart-3/15 border-chart-3/40 text-chart-3",
        dot: "bg-chart-3",
        bullets: [
          "dp[i][s] tells us whether sum s is reachable using the first i numbers.",
          "When dp[n][total/2] = 1, an equal partition exists.",
        ],
      },
    ],
    codeVariants: [
      {
        id: "recursion",
        label: "Recursion",
        snippets: snippets({
          java: `class Solution {
  boolean canPartition(int[] arr) {
    int total = 0;
    for (int value : arr) total += value;
    if (total % 2 != 0) return false;
    return solve(arr, total / 2, arr.length);
  }

  boolean solve(int[] arr, int target, int n) {
    if (target == 0) return true;
    if (n == 0) return false;
    if (arr[n - 1] > target) return solve(arr, target, n - 1);
    return solve(arr, target - arr[n - 1], n - 1) || solve(arr, target, n - 1);
  }
}`,
          csharp: `public class Solution {
  public bool CanPartition(int[] arr) {
    int total = 0;
    foreach (int value in arr) total += value;
    if (total % 2 != 0) return false;
    return Solve(arr, total / 2, arr.Length);
  }

  public bool Solve(int[] arr, int target, int n) {
    if (target == 0) return true;
    if (n == 0) return false;
    if (arr[n - 1] > target) return Solve(arr, target, n - 1);
    return Solve(arr, target - arr[n - 1], n - 1) || Solve(arr, target, n - 1);
  }
}`,
          python: `def can_partition(arr):
    total = sum(arr)
    if total % 2 != 0:
        return False

    def solve(target, n):
        if target == 0:
            return True
        if n == 0:
            return False
        if arr[n - 1] > target:
            return solve(target, n - 1)
        return solve(target - arr[n - 1], n - 1) or solve(target, n - 1)

    return solve(total // 2, len(arr))`,
          javascript: `function canPartition(arr) {
  const total = arr.reduce((sum, value) => sum + value, 0);
  if (total % 2 !== 0) return false;

  function solve(target, n = arr.length) {
    if (target === 0) return true;
    if (n === 0) return false;
    if (arr[n - 1] > target) return solve(target, n - 1);
    return solve(target - arr[n - 1], n - 1) || solve(target, n - 1);
  }

  return solve(total / 2);
}`,
          cpp: `class Solution {
public:
  bool canPartition(vector<int>& arr) {
    int total = 0;
    for (int value : arr) total += value;
    if (total % 2 != 0) return false;
    return solve(arr, total / 2, arr.size());
  }

  bool solve(vector<int>& arr, int target, int n) {
    if (target == 0) return true;
    if (n == 0) return false;
    if (arr[n - 1] > target) return solve(arr, target, n - 1);
    return solve(arr, target - arr[n - 1], n - 1) || solve(arr, target, n - 1);
  }
};`,
        }),
        note: "Equal partition first checks that the total is even, then reduces to subset sum.",
      },
      {
        id: "topdown",
        label: "Top-down",
        snippets: snippets({
          java: `class Solution {
  Boolean[][] memo;

  boolean canPartition(int[] arr) {
    int total = 0;
    for (int value : arr) total += value;
    if (total % 2 != 0) return false;
    int target = total / 2;
    memo = new Boolean[arr.length + 1][target + 1];
    return dfs(arr, arr.length, target);
  }

  boolean dfs(int[] arr, int n, int sum) {
    if (sum == 0) return true;
    if (n == 0) return false;
    if (memo[n][sum] != null) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) || dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
}`,
          csharp: `public class Solution {
  private bool?[,] memo;

  public bool CanPartition(int[] arr) {
    int total = 0;
    foreach (int value in arr) total += value;
    if (total % 2 != 0) return false;
    int target = total / 2;
    memo = new bool?[arr.Length + 1, target + 1];
    return Dfs(arr, arr.Length, target);
  }

  public bool Dfs(int[] arr, int n, int sum) {
    if (sum == 0) return true;
    if (n == 0) return false;
    if (memo[n, sum].HasValue) return memo[n, sum]!.Value;
    if (arr[n - 1] > sum) memo[n, sum] = Dfs(arr, n - 1, sum);
    else memo[n, sum] = Dfs(arr, n - 1, sum - arr[n - 1]) || Dfs(arr, n - 1, sum);
    return memo[n, sum]!.Value;
  }
}`,
          python: `def can_partition_memo(arr):
    total = sum(arr)
    if total % 2 != 0:
        return False
    target = total // 2
    memo = [[None] * (target + 1) for _ in range(len(arr) + 1)]

    def dfs(n, curr_sum):
        if curr_sum == 0:
            return True
        if n == 0:
            return False
        if memo[n][curr_sum] is not None:
            return memo[n][curr_sum]
        if arr[n - 1] > curr_sum:
            memo[n][curr_sum] = dfs(n - 1, curr_sum)
        else:
            memo[n][curr_sum] = dfs(n - 1, curr_sum - arr[n - 1]) or dfs(n - 1, curr_sum)
        return memo[n][curr_sum]

    return dfs(len(arr), target)`,
          javascript: `function canPartitionMemo(arr) {
  const total = arr.reduce((sum, value) => sum + value, 0);
  if (total % 2 !== 0) return false;
  const target = total / 2;
  const memo = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(undefined)
  );

  function dfs(n, sum) {
    if (sum === 0) return true;
    if (n === 0) return false;
    if (memo[n][sum] !== undefined) return memo[n][sum];

    if (arr[n - 1] > sum) memo[n][sum] = dfs(n - 1, sum);
    else memo[n][sum] = dfs(n - 1, sum - arr[n - 1]) || dfs(n - 1, sum);

    return memo[n][sum];
  }

  return dfs(arr.length, target);
}`,
          cpp: `class Solution {
public:
  vector<vector<int>> memo;

  bool canPartition(vector<int>& arr) {
    int total = 0;
    for (int value : arr) total += value;
    if (total % 2 != 0) return false;
    int target = total / 2;
    memo.assign(arr.size() + 1, vector<int>(target + 1, -1));
    return dfs(arr, arr.size(), target);
  }

  bool dfs(vector<int>& arr, int n, int sum) {
    if (sum == 0) return true;
    if (n == 0) return false;
    if (memo[n][sum] != -1) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) || dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
};`,
        }),
      },
      {
        id: "bottomup",
        label: "Bottom-up",
        snippets: snippets({
          java: `class Solution {
  boolean canPartitionBottomUp(int[] arr) {
    int total = 0;
    for (int value : arr) total += value;
    if (total % 2 != 0) return false;
    int target = total / 2;
    boolean[][] dp = new boolean[arr.length + 1][target + 1];
    for (int i = 0; i <= arr.length; i++) dp[i][0] = true;

    for (int i = 1; i <= arr.length; i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
      }
    }

    return dp[arr.length][target];
  }
}`,
          csharp: `public class Solution {
  public bool CanPartitionBottomUp(int[] arr) {
    int total = 0;
    foreach (int value in arr) total += value;
    if (total % 2 != 0) return false;
    int target = total / 2;
    bool[,] dp = new bool[arr.Length + 1, target + 1];
    for (int i = 0; i <= arr.Length; i++) dp[i, 0] = true;

    for (int i = 1; i <= arr.Length; i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i, sum] = dp[i - 1, sum];
        else dp[i, sum] = dp[i - 1, sum - arr[i - 1]] || dp[i - 1, sum];
      }
    }

    return dp[arr.Length, target];
  }
}`,
          python: `def can_partition_bottom_up(arr):
    total = sum(arr)
    if total % 2 != 0:
        return False
    target = total // 2
    dp = [[False] * (target + 1) for _ in range(len(arr) + 1)]
    for i in range(len(arr) + 1):
        dp[i][0] = True

    for i in range(1, len(arr) + 1):
        for curr_sum in range(1, target + 1):
            if arr[i - 1] > curr_sum:
                dp[i][curr_sum] = dp[i - 1][curr_sum]
            else:
                dp[i][curr_sum] = dp[i - 1][curr_sum - arr[i - 1]] or dp[i - 1][curr_sum]

    return dp[len(arr)][target]`,
          javascript: `function canPartitionBottomUp(arr) {
  const total = arr.reduce((sum, value) => sum + value, 0);
  if (total % 2 !== 0) return false;
  const target = total / 2;
  const dp = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(false)
  );

  for (let i = 0; i <= arr.length; i++) dp[i][0] = true;

  for (let i = 1; i <= arr.length; i++) {
    for (let sum = 1; sum <= target; sum++) {
      if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
      else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
    }
  }

  return dp[arr.length][target];
}`,
          cpp: `class Solution {
public:
  bool canPartitionBottomUp(vector<int>& arr) {
    int total = 0;
    for (int value : arr) total += value;
    if (total % 2 != 0) return false;
    int target = total / 2;
    vector<vector<bool>> dp(arr.size() + 1, vector<bool>(target + 1, false));
    for (int i = 0; i <= arr.size(); i++) dp[i][0] = true;

    for (int i = 1; i <= arr.size(); i++) {
      for (int sum = 1; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
      }
    }

    return dp[arr.size()][target];
  }
};`,
        }),
      },
    ],
    build: (preset: ProblemPreset) => {
      const total = preset.numbers.reduce((sum, value) => sum + value, 0);
      const target = Math.floor(total / 2);
      const data = createBooleanSubsetProblemData(preset.numbers, target, {
        explanationPrefix: "Equal Partition",
        resultBuilder: (found, indices) => {
          const canSplit = total % 2 === 0 && found;
          const complement = complementIndices(preset.numbers, indices);
          return {
            tone: canSplit ? "success" : "warning",
            title: canSplit ? "The array can be split into two equal-sum subsets." : "The array cannot be split into two equal-sum subsets.",
            metrics: [
              { label: "Total", value: String(total) },
              { label: "Target Half", value: String(target) },
            ],
            groups: canSplit ? [
              { label: "Partition A", indices },
              { label: "Partition B", indices: complement },
            ] : undefined,
            note: total % 2 !== 0 ? "The total sum is odd, so equal halves are impossible before DP starts." : undefined,
          };
        },
      });

      if (total % 2 !== 0) {
        data.pathCells = new Set<string>();
        data.selectedIndices = [];
      }

      return data;
    },
  },
  "count-subset-sum": {
    key: "count-subset-sum",
    title: "Count of Subset Sum Visualizer",
    subtitle: "How many subsets produce the target sum?",
    tableTitle: "DP Table - count of ways to make each sum",
    dimensionLabel: "Target",
    badge: "CSS",
    valueType: "count",
    parameterLabel: "Target Sum",
    presets: [
      { label: "Textbook", numbers: [2, 3, 5, 6, 8, 10], parameter: 10 },
      { label: "Duplicates", numbers: [1, 2, 3, 3], parameter: 6 },
      { label: "Short", numbers: [1, 1, 2, 3], parameter: 4 },
    ],
    explanationTitle: "Understanding Count of Subset Sum",
    explanationSubtitle: "Instead of yes/no reachability, each cell stores the number of valid subsets.",
    explanationSections: [
      {
        title: "State meaning",
        color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
        dot: "bg-chart-1",
        bullets: [
          "dp[i][s] = number of subsets from the first i numbers that make sum s.",
          "dp[i][0] = 1 because the empty subset always makes sum 0.",
        ],
      },
      {
        title: "How is it like Knapsack?",
        color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
        dot: "bg-chart-4",
        bullets: [
          "The structure still matches 0/1 Knapsack: for each item, either include it or exclude it.",
          "The target sum acts like capacity, but the cell meaning changes.",
          "Instead of storing max profit, we store the number of valid ways, so the transition uses addition.",
        ],
      },
      {
        title: "Transition",
        color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
        dot: "bg-chart-2",
        bullets: [
          "Skip current number: dp[i-1][s]",
          "Take current number: dp[i-1][s-number[i]]",
          "Final count: skip + take",
        ],
      },
    ],
    codeVariants: buildCountCodeVariants(
      "Count Subset Sum",
      "The bottom-up table counts how many subsets can build each sum.",
    ),
    build: (preset: ProblemPreset) =>
      createCountSubsetProblemData(preset.numbers, preset.parameter ?? 0, {
        explanationPrefix: "Count Subset Sum",
        resultBuilder: (count) => ({
          tone: count > 0 ? "success" : "warning",
          title: count > 0 ? "The target can be formed in one or more ways." : "No subset forms the target.",
          metrics: [
            { label: "Target", value: String(preset.parameter ?? 0) },
            { label: "Count", value: String(count), accent: count > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
          ],
        }),
      }),
  },
} satisfies Partial<Record<ProblemKey, ProblemDefinition>>);

function ProblemExplanationPanel({ definition }: { definition: ProblemDefinition }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-bold text-lg text-foreground mb-1">{definition.explanationTitle}</h2>
        <p className="text-muted-foreground text-sm">{definition.explanationSubtitle}</p>
      </div>
      {definition.explanationSections.map((section, idx) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06 }}
          className="bg-card border border-card-border rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${section.color}`}>0{idx + 1}</span>
            <h3 className="font-semibold text-foreground">{section.title}</h3>
          </div>
          {section.content && <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>}
          {section.bullets && (
            <ul className="space-y-2">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${section.dot}`} />
                  <span className="font-mono text-xs leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          {section.example && (
            <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground border border-border">
              {section.example}
            </div>
          )}
        </motion.div>
      ))}
      <CodeVariantsPanel title={`${definition.title} Code`} variants={definition.codeVariants} />
      <div className="bg-gradient-to-br from-primary/8 to-chart-2/8 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-sm text-muted-foreground">Ready to see it in motion?</p>
        <p className="text-sm font-medium text-foreground mt-1">Switch to the Visualizer view and press Play.</p>
      </div>
      <ExplanationComments storageKey={`${definition.key}-how-it-works`} />
    </div>
  );
}

function SubsetFamilyProblemVisualizer({ problemKey }: { problemKey: ProblemKey }) {
  const definition = PROBLEMS[problemKey];
  const [presetIdx, setPresetIdx] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const computedRef = useRef<VisualizerData | null>(null);
  const computedKeyRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const computedKey = `${problemKey}:${presetIdx}`;

  if (computedRef.current === null || computedKeyRef.current !== computedKey) {
    computedRef.current = definition.build(definition.presets[presetIdx]);
    computedKeyRef.current = computedKey;
  }

  useEffect(() => {
    setCurrentStep(-1);
    setIsPlaying(false);
    setShowResult(false);
  }, [computedKey]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (!isPlaying || !computedRef.current) {
      return;
    }
    const { steps } = computedRef.current;
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          setShowResult(true);
          return steps.length - 1;
        }
        return prev + 1;
      });
    }, SPEED_OPTIONS[speedIdx].ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speedIdx]);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setIsPlaying(false);
    setShowResult(false);
  }, []);

  const stepForward = useCallback(() => {
    if (!computedRef.current) {
      return;
    }
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, computedRef.current!.steps.length - 1);
      if (next === computedRef.current!.steps.length - 1) {
        setShowResult(true);
      }
      return next;
    });
  }, []);

  const stepBackward = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, -1);
      if (next < (computedRef.current?.steps.length ?? 0) - 1) {
        setShowResult(false);
      }
      return next;
    });
  }, []);

  const data = computedRef.current;
  const preset = definition.presets[presetIdx];
  const numbers = preset.numbers;
  const totalSteps = data?.steps.length ?? 0;
  const currentStepData = data && currentStep >= 0 ? data.steps[currentStep] : null;

  const partialDp = (() => {
    if (!data) {
      return null;
    }
    const grid = cloneGrid(data.baseGrid);
    for (let k = 0; k <= currentStep; k++) {
      const step = data.steps[k];
      grid[step.i][step.j] = step.value;
    }
    return grid;
  })();

  const activeIndices = showResult ? new Set(data?.selectedIndices ?? []) : new Set<number>();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Preset</h2>
          <div className="grid grid-cols-2 gap-2">
            {definition.presets.map((entry, idx) => (
              <button
                key={entry.label}
                onClick={() => setPresetIdx(idx)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                  presetIdx === idx
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <div className="font-medium">{entry.label}</div>
                <div className={cn("text-[11px]", presetIdx === idx ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {entry.parameter !== undefined ? `${definition.parameterLabel}: ${entry.parameter}` : `Count: ${entry.numbers.length} numbers`}
                </div>
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            {definition.parameterLabel && preset.parameter !== undefined ? `${definition.parameterLabel}: ` : "Array size: "}
            <span className="font-bold text-foreground">
              {definition.parameterLabel && preset.parameter !== undefined ? preset.parameter : numbers.length}
            </span>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Numbers</h2>
          <div className="flex flex-wrap gap-2">
            {numbers.map((value, idx) => {
              const colors = ITEM_COLORS[idx % ITEM_COLORS.length];
              const isCurrent = currentStepData?.i === idx + 1;
              const isSelected = activeIndices.has(idx);
              return (
                <motion.div
                  key={`${value}-${idx}`}
                  animate={{ scale: isCurrent ? 1.03 : 1 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    isSelected ? "bg-emerald-400/15 border-emerald-400/50" : isCurrent ? `${colors.activeBg} ${colors.border}` : "bg-muted/30 border-border",
                  )}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border ${colors.bg} ${colors.border} ${colors.text}`}>
                    {idx + 1}
                  </span>
                  <span className="font-medium text-foreground">{value}</span>
                </motion.div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Total sum: <span className="font-bold text-foreground">{numbers.reduce((sum, value) => sum + value, 0)}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-card-border flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm text-foreground">{definition.tableTitle}</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { color: "bg-primary/30 border-primary/60", label: "Current" },
              { color: "bg-emerald-400/30 border-emerald-400/60", label: "Include" },
              { color: "bg-rose-400/20 border-rose-400/60", label: "Blocked" },
              { color: "bg-amber-400/30 border-amber-400/60", label: "Result" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm border inline-block ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 overflow-x-auto">
          {partialDp && data ? (
            <table className="border-separate" style={{ borderSpacing: 3 }}>
              <thead>
                <tr>
                  <td style={{ width: 96, height: 38 }} className="text-xs text-muted-foreground text-right pr-2 align-bottom">
                    Num down / {definition.dimensionLabel} across
                  </td>
                  {Array.from({ length: data.target + 1 }, (_, col) => (
                    <td key={col} style={{ width: 42, height: 38 }} className="text-center">
                      <span className="inline-flex items-center justify-center w-full h-full rounded-md bg-muted/50 text-muted-foreground font-bold text-xs border border-border">
                        {col}
                      </span>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numbers.length + 1 }, (_, row) => (
                  <tr key={row}>
                    <td style={{ width: 96, height: 42 }} className="text-right pr-2">
                      {row === 0 ? (
                        <span className="text-xs text-muted-foreground italic">0 items</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border bg-muted/40 border-border text-foreground">
                          {row}. {numbers[row - 1]}
                        </span>
                      )}
                    </td>
                    {Array.from({ length: data.target + 1 }, (_, col) => {
                      const value = partialDp[row]?.[col] ?? data.baseGrid[row]?.[col];
                      const isCurrent = currentStepData?.i === row && currentStepData?.j === col;
                      const isIncluded = isCurrent && currentStepData?.included;
                      const isBlocked = isCurrent && currentStepData?.blocked;
                      const isResult = showResult && data.pathCells.has(`${row},${col}`);

                      let bg = "bg-muted/40 border-border";
                      if (isResult) bg = "bg-amber-400/25 border-amber-400/70";
                      if (isBlocked) bg = "bg-rose-400/15 border-rose-400/60";
                      if (isCurrent && !isBlocked && !isIncluded) bg = "bg-primary/20 border-primary/60";
                      if (isIncluded) bg = "bg-emerald-400/25 border-emerald-400/70";

                      return (
                        <td key={col} style={{ width: 42, height: 42 }} className="text-center">
                          <div className={cn("inline-flex items-center justify-center w-full h-full rounded-lg border-2 text-sm font-bold transition-all duration-300", bg, isCurrent && "shadow-sm scale-105")}>
                            <span className={cn(isResult && "text-amber-700 dark:text-amber-300", isIncluded && "text-emerald-700 dark:text-emerald-300", isBlocked && "text-rose-600 dark:text-rose-400", !isResult && !isIncluded && !isBlocked && "text-foreground")}>
                              {formatCellValue(value, definition.valueType)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {currentStepData && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "rounded-xl border px-4 py-3 flex items-start gap-3",
              currentStepData.included ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700" : currentStepData.blocked ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700" : "bg-primary/5 border-primary/25",
            )}
          >
            <ChevronRight size={16} className={cn("mt-0.5 shrink-0", currentStepData.included ? "text-emerald-600" : currentStepData.blocked ? "text-rose-500" : "text-primary")} />
            <p className={cn("text-sm font-medium font-mono leading-relaxed", currentStepData.included ? "text-emerald-700 dark:text-emerald-300" : currentStepData.blocked ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
              {currentStepData.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResult && data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("rounded-xl px-5 py-4 space-y-3 border", data.result.tone === "success" ? "bg-gradient-to-r from-primary/10 to-chart-2/10 border-primary/30" : "bg-gradient-to-r from-rose-500/8 to-amber-500/8 border-rose-300/40")}
          >
            <p className="text-sm font-medium text-foreground">{data.result.title}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {data.result.metrics.map((metric) => (
                <span key={metric.label} className="text-muted-foreground">
                  {metric.label}: <strong className={cn("text-foreground", metric.accent)}>{metric.value}</strong>
                </span>
              ))}
            </div>
            {data.result.groups?.map((group) => {
              const values = subsetFromIndices(numbers, group.indices);
              return (
                <div key={group.label} className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {values.length > 0 ? values.map((value, idx) => (
                      <span key={`${group.label}-${idx}-${value}`} className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                        {value}
                      </span>
                    )) : (
                      <span className="text-xs text-muted-foreground">No numbers selected.</span>
                    )}
                  </div>
                </div>
              );
            })}
            {data.result.note && <p className="text-xs text-muted-foreground">{data.result.note}</p>}
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
            <button onClick={() => setIsPlaying((value) => !value)} disabled={!data || currentStep >= totalSteps - 1} className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
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
              max={Math.max(totalSteps - 1, -1)}
              value={currentStep}
              onChange={(event) => {
                const value = Number(event.target.value);
                setCurrentStep(value);
                setIsPlaying(false);
                setShowResult(value === totalSteps - 1);
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
            {SPEED_OPTIONS.map((speed, idx) => (
              <button key={speed.label} onClick={() => setSpeedIdx(idx)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", speedIdx === idx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {speed.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubsetSumVisualizer() {
  return <SubsetFamilyProblemVisualizer problemKey="subset-sum" />;
}

export function SubsetSumExplanationPanel() {
  return <ProblemExplanationPanel definition={PROBLEMS["subset-sum"]} />;
}

export function EqualPartitionVisualizer() {
  return <SubsetFamilyProblemVisualizer problemKey="equal-partition" />;
}

export function EqualPartitionExplanationPanel() {
  return <ProblemExplanationPanel definition={PROBLEMS["equal-partition"]} />;
}

export function CountSubsetSumVisualizer() {
  return <SubsetFamilyProblemVisualizer problemKey="count-subset-sum" />;
}

export function CountSubsetSumExplanationPanel() {
  return <ProblemExplanationPanel definition={PROBLEMS["count-subset-sum"]} />;
}

export function MinimumSubsetDifferenceVisualizer() {
  return <SubsetFamilyProblemVisualizer problemKey="min-subset-diff" />;
}

export function MinimumSubsetDifferenceExplanationPanel() {
  return <ProblemExplanationPanel definition={PROBLEMS["min-subset-diff"]} />;
}

export function TargetSumVisualizer() {
  return <SubsetFamilyProblemVisualizer problemKey="target-sum" />;
}

export function TargetSumExplanationPanel() {
  return <ProblemExplanationPanel definition={PROBLEMS["target-sum"]} />;
}

export function SubsetDifferenceCountVisualizer() {
  return <SubsetFamilyProblemVisualizer problemKey="subset-diff-count" />;
}

export function SubsetDifferenceCountExplanationPanel() {
  return <ProblemExplanationPanel definition={PROBLEMS["subset-diff-count"]} />;
}

Object.assign(PROBLEMS, {
  "min-subset-diff": {
    key: "min-subset-diff",
    title: "Minimum Subset Sum Difference Visualizer",
    subtitle: "Split the set so the difference is as small as possible.",
    tableTitle: "DP Table - reachable sums up to the total",
    dimensionLabel: "Subset Sum",
    badge: "MSD",
    valueType: "boolean",
    presets: [
      { label: "Classic", numbers: [1, 6, 11, 5] },
      { label: "Near Match", numbers: [3, 1, 4, 2, 2] },
      { label: "Spread Out", numbers: [5, 10, 15] },
    ],
    explanationTitle: "Understanding Minimum Subset Sum Difference",
    explanationSubtitle: "We compute all reachable sums, then choose the one closest to total / 2.",
    explanationSections: [
      {
        title: "Key idea",
        color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
        dot: "bg-chart-1",
        content: "If one subset sums to s, the other sums to total - s. The difference becomes |total - 2s|.",
      },
      {
        title: "How is it like Knapsack?",
        color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
        dot: "bg-chart-4",
        bullets: [
          "It reuses the same subset-sum style table as the 0/1 Knapsack family.",
          "Each number is still either taken or skipped once.",
          "The change is in the final step: after building reachability, we scan sums near total / 2 instead of reading one fixed target cell.",
        ],
      },
      {
        title: "Why total / 2 matters",
        color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
        dot: "bg-chart-2",
        content: "The closer s is to total / 2, the smaller the difference becomes.",
      },
      {
        title: "DP workflow",
        color: "bg-chart-3/15 border-chart-3/40 text-chart-3",
        dot: "bg-chart-3",
        bullets: [
          "Build the same boolean table used in subset sum.",
          "Inspect the last row for reachable sums.",
          "Pick the best reachable sum at or below total / 2.",
        ],
      },
    ],
    codeVariants: [
      {
        id: "recursion",
        label: "Recursion",
        snippets: snippets({
          java: `class Solution {
  int minDiffRecursive(int[] arr, int n, int sum1, int sum2) {
    if (n == 0) return Math.abs(sum1 - sum2);
    return Math.min(
      minDiffRecursive(arr, n - 1, sum1 + arr[n - 1], sum2),
      minDiffRecursive(arr, n - 1, sum1, sum2 + arr[n - 1])
    );
  }
}`,
          csharp: `public class Solution {
  public int MinDiffRecursive(int[] arr, int n, int sum1, int sum2) {
    if (n == 0) return Math.Abs(sum1 - sum2);
    return Math.Min(
      MinDiffRecursive(arr, n - 1, sum1 + arr[n - 1], sum2),
      MinDiffRecursive(arr, n - 1, sum1, sum2 + arr[n - 1])
    );
  }
}`,
          python: `def min_diff_recursive(arr, n=None, sum1=0, sum2=0):
    if n is None:
        n = len(arr)
    if n == 0:
        return abs(sum1 - sum2)
    return min(
        min_diff_recursive(arr, n - 1, sum1 + arr[n - 1], sum2),
        min_diff_recursive(arr, n - 1, sum1, sum2 + arr[n - 1]),
    )`,
          javascript: `function minDiffRecursive(arr, n = arr.length, sum1 = 0, sum2 = 0) {
  if (n === 0) return Math.abs(sum1 - sum2);

  return Math.min(
    minDiffRecursive(arr, n - 1, sum1 + arr[n - 1], sum2),
    minDiffRecursive(arr, n - 1, sum1, sum2 + arr[n - 1])
  );
}`,
          cpp: `class Solution {
public:
  int minDiffRecursive(vector<int>& arr, int n, int sum1, int sum2) {
    if (n == 0) return abs(sum1 - sum2);
    return min(
      minDiffRecursive(arr, n - 1, sum1 + arr[n - 1], sum2),
      minDiffRecursive(arr, n - 1, sum1, sum2 + arr[n - 1])
    );
  }
};`,
        }),
        note: "The recursive version explores both subset assignments for every element.",
      },
      {
        id: "topdown",
        label: "Top-down",
        snippets: snippets({
          java: `class Solution {
  Integer[][] memo;
  int total;

  int minDiffMemo(int[] arr) {
    total = 0;
    for (int value : arr) total += value;
    memo = new Integer[arr.length + 1][total + 1];
    return dfs(arr, 0, 0);
  }

  int dfs(int[] arr, int i, int sum) {
    if (i == arr.length) return Math.abs(total - 2 * sum);
    if (memo[i][sum] != null) return memo[i][sum];
    memo[i][sum] = Math.min(dfs(arr, i + 1, sum + arr[i]), dfs(arr, i + 1, sum));
    return memo[i][sum];
  }
}`,
          csharp: `public class Solution {
  private int?[,] memo;
  private int total;

  public int MinDiffMemo(int[] arr) {
    total = 0;
    foreach (int value in arr) total += value;
    memo = new int?[arr.Length + 1, total + 1];
    return Dfs(arr, 0, 0);
  }

  public int Dfs(int[] arr, int i, int sum) {
    if (i == arr.Length) return Math.Abs(total - 2 * sum);
    if (memo[i, sum].HasValue) return memo[i, sum]!.Value;
    memo[i, sum] = Math.Min(Dfs(arr, i + 1, sum + arr[i]), Dfs(arr, i + 1, sum));
    return memo[i, sum]!.Value;
  }
}`,
          python: `def min_diff_memo(arr):
    total = sum(arr)
    memo = {}

    def dfs(i, curr_sum):
        if i == len(arr):
            return abs(total - 2 * curr_sum)
        key = (i, curr_sum)
        if key in memo:
            return memo[key]
        memo[key] = min(
            dfs(i + 1, curr_sum + arr[i]),
            dfs(i + 1, curr_sum),
        )
        return memo[key]

    return dfs(0, 0)`,
          javascript: `function minDiffMemo(arr) {
  const total = arr.reduce((sum, value) => sum + value, 0);
  const memo = new Map();

  function dfs(i, sum) {
    if (i === arr.length) return Math.abs(total - 2 * sum);
    const key = \`\${i}|\${sum}\`;
    if (memo.has(key)) return memo.get(key);

    const result = Math.min(
      dfs(i + 1, sum + arr[i]),
      dfs(i + 1, sum)
    );

    memo.set(key, result);
    return result;
  }

  return dfs(0, 0);
}`,
          cpp: `class Solution {
public:
  vector<vector<int>> memo;
  int total;

  int minDiffMemo(vector<int>& arr) {
    total = 0;
    for (int value : arr) total += value;
    memo.assign(arr.size() + 1, vector<int>(total + 1, -1));
    return dfs(arr, 0, 0);
  }

  int dfs(vector<int>& arr, int i, int sum) {
    if (i == arr.size()) return abs(total - 2 * sum);
    if (memo[i][sum] != -1) return memo[i][sum];
    memo[i][sum] = min(dfs(arr, i + 1, sum + arr[i]), dfs(arr, i + 1, sum));
    return memo[i][sum];
  }
};`,
        }),
      },
      {
        id: "bottomup",
        label: "Bottom-up",
        snippets: snippets({
          java: `class Solution {
  int minDiffBottomUp(int[] arr) {
    int total = 0;
    for (int value : arr) total += value;
    boolean[][] dp = new boolean[arr.length + 1][total + 1];
    for (int i = 0; i <= arr.length; i++) dp[i][0] = true;

    for (int i = 1; i <= arr.length; i++) {
      for (int sum = 1; sum <= total; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
      }
    }

    int best = Integer.MAX_VALUE;
    for (int sum = 0; sum <= total / 2; sum++) {
      if (dp[arr.length][sum]) best = Math.min(best, total - 2 * sum);
    }
    return best;
  }
}`,
          csharp: `public class Solution {
  public int MinDiffBottomUp(int[] arr) {
    int total = 0;
    foreach (int value in arr) total += value;
    bool[,] dp = new bool[arr.Length + 1, total + 1];
    for (int i = 0; i <= arr.Length; i++) dp[i, 0] = true;

    for (int i = 1; i <= arr.Length; i++) {
      for (int sum = 1; sum <= total; sum++) {
        if (arr[i - 1] > sum) dp[i, sum] = dp[i - 1, sum];
        else dp[i, sum] = dp[i - 1, sum - arr[i - 1]] || dp[i - 1, sum];
      }
    }

    int best = int.MaxValue;
    for (int sum = 0; sum <= total / 2; sum++) {
      if (dp[arr.Length, sum]) best = Math.Min(best, total - 2 * sum);
    }
    return best;
  }
}`,
          python: `def min_diff_bottom_up(arr):
    total = sum(arr)
    dp = [[False] * (total + 1) for _ in range(len(arr) + 1)]
    for i in range(len(arr) + 1):
        dp[i][0] = True

    for i in range(1, len(arr) + 1):
        for curr_sum in range(1, total + 1):
            if arr[i - 1] > curr_sum:
                dp[i][curr_sum] = dp[i - 1][curr_sum]
            else:
                dp[i][curr_sum] = dp[i - 1][curr_sum - arr[i - 1]] or dp[i - 1][curr_sum]

    best = float("inf")
    for curr_sum in range(total // 2 + 1):
        if dp[len(arr)][curr_sum]:
            best = min(best, total - 2 * curr_sum)
    return best`,
          javascript: `function minDiffBottomUp(arr) {
  const total = arr.reduce((sum, value) => sum + value, 0);
  const dp = Array.from({ length: arr.length + 1 }, () =>
    Array(total + 1).fill(false)
  );

  for (let i = 0; i <= arr.length; i++) dp[i][0] = true;

  for (let i = 1; i <= arr.length; i++) {
    for (let sum = 1; sum <= total; sum++) {
      if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
      else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
    }
  }

  let best = Infinity;
  for (let sum = 0; sum <= Math.floor(total / 2); sum++) {
    if (dp[arr.length][sum]) best = Math.min(best, total - 2 * sum);
  }

  return best;
}`,
          cpp: `class Solution {
public:
  int minDiffBottomUp(vector<int>& arr) {
    int total = 0;
    for (int value : arr) total += value;
    vector<vector<bool>> dp(arr.size() + 1, vector<bool>(total + 1, false));
    for (int i = 0; i <= arr.size(); i++) dp[i][0] = true;

    for (int i = 1; i <= arr.size(); i++) {
      for (int sum = 1; sum <= total; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] || dp[i - 1][sum];
      }
    }

    int best = INT_MAX;
    for (int sum = 0; sum <= total / 2; sum++) {
      if (dp[arr.size()][sum]) best = min(best, total - 2 * sum);
    }
    return best;
  }
};`,
        }),
        note: "Bottom-up first marks reachable sums, then scans for the one closest to total / 2.",
      },
    ],
    build: (preset: ProblemPreset) => {
      const total = preset.numbers.reduce((sum, value) => sum + value, 0);
      const base = createBooleanSubsetProblemData(preset.numbers, total, {
        explanationPrefix: "Minimum Difference",
        resultBuilder: () => ({
          tone: "success",
          title: "The closest split is shown below.",
          metrics: [],
        }),
      });

      let bestSum = 0;
      for (let sum = Math.floor(total / 2); sum >= 0; sum--) {
        if ((base.dp[preset.numbers.length][sum] as boolean) === true) {
          bestSum = sum;
          break;
        }
      }

      const traced = traceBooleanSelection(base.dp as boolean[][], preset.numbers, bestSum);
      const otherIndices = complementIndices(preset.numbers, traced.selectedIndices);
      const otherSum = total - bestSum;

      return {
        ...base,
        pathCells: traced.pathCells,
        selectedIndices: traced.selectedIndices,
        result: {
          tone: "success",
          title: "The split with the smallest difference is highlighted.",
          metrics: [
            { label: "Total", value: String(total) },
            { label: "Best Sum", value: String(bestSum) },
            { label: "Min Difference", value: String(Math.abs(otherSum - bestSum)), accent: "text-emerald-600 dark:text-emerald-400" },
          ],
          groups: [
            { label: `Subset A (sum ${bestSum})`, indices: traced.selectedIndices },
            { label: `Subset B (sum ${otherSum})`, indices: otherIndices },
          ],
        },
      };
    },
  },
  "target-sum": {
    key: "target-sum",
    title: "Target Sum Visualizer",
    subtitle: "Count sign assignments that reach the target.",
    tableTitle: "DP Table - count subsets for transformed target",
    dimensionLabel: "Reduced Target",
    badge: "TS",
    valueType: "count",
    parameterLabel: "Target",
    presets: [
      { label: "LeetCode", numbers: [1, 1, 1, 1, 1], parameter: 3 },
      { label: "Balanced", numbers: [1, 2, 3, 1], parameter: 1 },
      { label: "Mixed", numbers: [2, 2, 3, 5], parameter: 2 },
    ],
    explanationTitle: "Understanding Target Sum",
    explanationSubtitle: "Convert plus/minus assignments into a count-subset-sum problem.",
    explanationSections: [
      {
        title: "Reduction",
        color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
        dot: "bg-chart-1",
        content: "If subset P is positive and subset N is negative, then P - N = target and P + N = total. Solving both gives P = (total + target) / 2.",
      },
      {
        title: "How is it like Knapsack?",
        color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
        dot: "bg-chart-4",
        bullets: [
          "After reduction, it becomes the same shape as a subset-count / Knapsack-style DP.",
          "Each number is used at most once, so the include-or-skip rule stays the same.",
          "The change is that signs are converted into a reduced target, and the table stores counts instead of profits.",
        ],
      },
      {
        title: "What DP counts",
        color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
        dot: "bg-chart-2",
        bullets: [
          "Each cell counts how many subsets reach the reduced target.",
          "That count equals the number of valid sign assignments.",
        ],
      },
    ],
    codeVariants: [
      {
        id: "recursion",
        label: "Recursion",
        snippets: snippets({
          java: `class Solution {
  int targetSumRecursive(int[] nums, int target, int i, int current) {
    if (i == nums.length) return current == target ? 1 : 0;
    return targetSumRecursive(nums, target, i + 1, current + nums[i]) +
           targetSumRecursive(nums, target, i + 1, current - nums[i]);
  }
}`,
          csharp: `public class Solution {
  public int TargetSumRecursive(int[] nums, int target, int i, int current) {
    if (i == nums.Length) return current == target ? 1 : 0;
    return TargetSumRecursive(nums, target, i + 1, current + nums[i]) +
           TargetSumRecursive(nums, target, i + 1, current - nums[i]);
  }
}`,
          python: `def target_sum_recursive(nums, target, i=0, current=0):
    if i == len(nums):
        return 1 if current == target else 0
    return (
        target_sum_recursive(nums, target, i + 1, current + nums[i]) +
        target_sum_recursive(nums, target, i + 1, current - nums[i])
    )`,
          javascript: `function targetSumRecursive(nums, target, i = 0, current = 0) {
  if (i === nums.length) return current === target ? 1 : 0;

  return targetSumRecursive(nums, target, i + 1, current + nums[i]) +
         targetSumRecursive(nums, target, i + 1, current - nums[i]);
}`,
          cpp: `class Solution {
public:
  int targetSumRecursive(vector<int>& nums, int target, int i, int current) {
    if (i == nums.size()) return current == target ? 1 : 0;
    return targetSumRecursive(nums, target, i + 1, current + nums[i]) +
           targetSumRecursive(nums, target, i + 1, current - nums[i]);
  }
};`,
        }),
        note: "The direct recursive form tries both + and - for every number.",
      },
      {
        id: "topdown",
        label: "Top-down",
        snippets: snippets({
          java: `class Solution {
  Map<String, Integer> memo = new HashMap<>();

  int targetSumMemo(int[] nums, int target) {
    return dfs(nums, target, 0, 0);
  }

  int dfs(int[] nums, int target, int i, int current) {
    if (i == nums.length) return current == target ? 1 : 0;
    String key = i + "|" + current;
    if (memo.containsKey(key)) return memo.get(key);
    int ways = dfs(nums, target, i + 1, current + nums[i]) +
               dfs(nums, target, i + 1, current - nums[i]);
    memo.put(key, ways);
    return ways;
  }
}`,
          csharp: `public class Solution {
  private Dictionary<string, int> memo = new();

  public int TargetSumMemo(int[] nums, int target) {
    return Dfs(nums, target, 0, 0);
  }

  public int Dfs(int[] nums, int target, int i, int current) {
    if (i == nums.Length) return current == target ? 1 : 0;
    string key = $"{i}|{current}";
    if (memo.ContainsKey(key)) return memo[key];
    int ways = Dfs(nums, target, i + 1, current + nums[i]) +
               Dfs(nums, target, i + 1, current - nums[i]);
    memo[key] = ways;
    return ways;
  }
}`,
          python: `def target_sum_memo(nums, target):
    memo = {}

    def dfs(i, current):
        if i == len(nums):
            return 1 if current == target else 0
        key = (i, current)
        if key in memo:
            return memo[key]
        memo[key] = dfs(i + 1, current + nums[i]) + dfs(i + 1, current - nums[i])
        return memo[key]

    return dfs(0, 0)`,
          javascript: `function targetSumMemo(nums, target) {
  const memo = new Map();

  function dfs(i, current) {
    if (i === nums.length) return current === target ? 1 : 0;
    const key = \`\${i}|\${current}\`;
    if (memo.has(key)) return memo.get(key);

    const ways = dfs(i + 1, current + nums[i]) + dfs(i + 1, current - nums[i]);
    memo.set(key, ways);
    return ways;
  }

  return dfs(0, 0);
}`,
          cpp: `class Solution {
public:
  unordered_map<string, int> memo;

  int targetSumMemo(vector<int>& nums, int target) {
    return dfs(nums, target, 0, 0);
  }

  int dfs(vector<int>& nums, int target, int i, int current) {
    if (i == nums.size()) return current == target ? 1 : 0;
    string key = to_string(i) + "|" + to_string(current);
    if (memo.count(key)) return memo[key];
    memo[key] = dfs(nums, target, i + 1, current + nums[i]) +
                dfs(nums, target, i + 1, current - nums[i]);
    return memo[key];
  }
};`,
        }),
      },
      {
        id: "bottomup",
        label: "Bottom-up",
        snippets: snippets({
          java: `class Solution {
  int targetSumBottomUp(int[] nums, int target) {
    int total = 0;
    for (int value : nums) total += value;
    if ((total + target) % 2 != 0 || Math.abs(target) > total) return 0;
    int subsetTarget = (total + target) / 2;
    int[][] dp = new int[nums.length + 1][subsetTarget + 1];
    for (int i = 0; i <= nums.length; i++) dp[i][0] = 1;

    for (int i = 1; i <= nums.length; i++) {
      for (int sum = 0; sum <= subsetTarget; sum++) {
        if (nums[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - nums[i - 1]] + dp[i - 1][sum];
      }
    }

    return dp[nums.length][subsetTarget];
  }
}`,
          csharp: `public class Solution {
  public int TargetSumBottomUp(int[] nums, int target) {
    int total = 0;
    foreach (int value in nums) total += value;
    if ((total + target) % 2 != 0 || Math.Abs(target) > total) return 0;
    int subsetTarget = (total + target) / 2;
    int[,] dp = new int[nums.Length + 1, subsetTarget + 1];
    for (int i = 0; i <= nums.Length; i++) dp[i, 0] = 1;

    for (int i = 1; i <= nums.Length; i++) {
      for (int sum = 0; sum <= subsetTarget; sum++) {
        if (nums[i - 1] > sum) dp[i, sum] = dp[i - 1, sum];
        else dp[i, sum] = dp[i - 1, sum - nums[i - 1]] + dp[i - 1, sum];
      }
    }

    return dp[nums.Length, subsetTarget];
  }
}`,
          python: `def target_sum_bottom_up(nums, target):
    total = sum(nums)
    if (total + target) % 2 != 0 or abs(target) > total:
        return 0
    subset_target = (total + target) // 2
    dp = [[0] * (subset_target + 1) for _ in range(len(nums) + 1)]
    for i in range(len(nums) + 1):
        dp[i][0] = 1

    for i in range(1, len(nums) + 1):
        for curr_sum in range(subset_target + 1):
            if nums[i - 1] > curr_sum:
                dp[i][curr_sum] = dp[i - 1][curr_sum]
            else:
                dp[i][curr_sum] = dp[i - 1][curr_sum - nums[i - 1]] + dp[i - 1][curr_sum]

    return dp[len(nums)][subset_target]`,
          javascript: `function targetSumBottomUp(nums, target) {
  const total = nums.reduce((sum, value) => sum + value, 0);
  if ((total + target) % 2 !== 0 || Math.abs(target) > total) return 0;
  const subsetTarget = (total + target) / 2;

  const dp = Array.from({ length: nums.length + 1 }, () =>
    Array(subsetTarget + 1).fill(0)
  );
  for (let i = 0; i <= nums.length; i++) dp[i][0] = 1;

  for (let i = 1; i <= nums.length; i++) {
    for (let sum = 0; sum <= subsetTarget; sum++) {
      if (nums[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
      else dp[i][sum] = dp[i - 1][sum - nums[i - 1]] + dp[i - 1][sum];
    }
  }

  return dp[nums.length][subsetTarget];
}`,
          cpp: `class Solution {
public:
  int targetSumBottomUp(vector<int>& nums, int target) {
    int total = 0;
    for (int value : nums) total += value;
    if ((total + target) % 2 != 0 || abs(target) > total) return 0;
    int subsetTarget = (total + target) / 2;
    vector<vector<int>> dp(nums.size() + 1, vector<int>(subsetTarget + 1, 0));
    for (int i = 0; i <= nums.size(); i++) dp[i][0] = 1;

    for (int i = 1; i <= nums.size(); i++) {
      for (int sum = 0; sum <= subsetTarget; sum++) {
        if (nums[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - nums[i - 1]] + dp[i - 1][sum];
      }
    }

    return dp[nums.size()][subsetTarget];
  }
};`,
        }),
        note: "The bottom-up approach uses the standard subset-count reduction: (total + target) / 2.",
      },
    ],
    build: (preset: ProblemPreset) => {
      const total = preset.numbers.reduce((sum, value) => sum + value, 0);
      const reducedTarget = (total + (preset.parameter ?? 0)) / 2;
      return createCountSubsetProblemData(preset.numbers, reducedTarget, {
        explanationPrefix: "Target Sum",
        resultBuilder: (count) => ({
          tone: count > 0 ? "success" : "warning",
          title: count > 0 ? "The reduced target count matches the number of valid sign assignments." : "No sign assignment reaches the requested target.",
          metrics: [
            { label: "Target", value: String(preset.parameter ?? 0) },
            { label: "Reduced Target", value: String(reducedTarget) },
            { label: "Ways", value: String(count), accent: count > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
          ],
        }),
      });
    },
  },
  "subset-diff-count": {
    key: "subset-diff-count",
    title: "Subsets With Given Difference Visualizer",
    subtitle: "Count subset pairs whose difference equals d.",
    tableTitle: "DP Table - count subsets for transformed difference target",
    dimensionLabel: "Reduced Target",
    badge: "DIF",
    valueType: "count",
    parameterLabel: "Difference",
    presets: [
      { label: "Classic", numbers: [1, 1, 2, 3], parameter: 1 },
      { label: "Simple", numbers: [1, 2, 3, 4], parameter: 2 },
      { label: "Larger", numbers: [2, 3, 5, 6, 8, 10], parameter: 4 },
    ],
    explanationTitle: "Understanding Subsets With Given Difference",
    explanationSubtitle: "This also reduces to counting subsets for a transformed target.",
    explanationSections: [
      {
        title: "Reduction",
        color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
        dot: "bg-chart-1",
        content: "If S1 - S2 = diff and S1 + S2 = total, then S1 = (total + diff) / 2.",
      },
      {
        title: "How is it like Knapsack?",
        color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
        dot: "bg-chart-4",
        bullets: [
          "This also collapses into a 0/1 Knapsack-style subset DP after the algebra step.",
          "We still decide once per number whether it belongs in the chosen subset.",
          "The difference from classic Knapsack is that we count valid subsets for the reduced target instead of maximizing value.",
        ],
      },
      {
        title: "DP meaning",
        color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
        dot: "bg-chart-2",
        bullets: [
          "Count how many subsets reach the transformed target.",
          "That count equals the number of valid subset pairs.",
        ],
      },
    ],
    codeVariants: [
      {
        id: "recursion",
        label: "Recursion",
        snippets: snippets({
          java: `class Solution {
  int countDiffRecursive(int[] arr, int diff, int i, int left, int right) {
    if (i == arr.length) return left - right == diff ? 1 : 0;
    return countDiffRecursive(arr, diff, i + 1, left + arr[i], right) +
           countDiffRecursive(arr, diff, i + 1, left, right + arr[i]);
  }
}`,
          csharp: `public class Solution {
  public int CountDiffRecursive(int[] arr, int diff, int i, int left, int right) {
    if (i == arr.Length) return left - right == diff ? 1 : 0;
    return CountDiffRecursive(arr, diff, i + 1, left + arr[i], right) +
           CountDiffRecursive(arr, diff, i + 1, left, right + arr[i]);
  }
}`,
          python: `def count_diff_recursive(arr, diff, i=0, left=0, right=0):
    if i == len(arr):
        return 1 if left - right == diff else 0
    return (
        count_diff_recursive(arr, diff, i + 1, left + arr[i], right) +
        count_diff_recursive(arr, diff, i + 1, left, right + arr[i])
    )`,
          javascript: `function countDiffRecursive(arr, diff, i = 0, left = 0, right = 0) {
  if (i === arr.length) return left - right === diff ? 1 : 0;

  return countDiffRecursive(arr, diff, i + 1, left + arr[i], right) +
         countDiffRecursive(arr, diff, i + 1, left, right + arr[i]);
}`,
          cpp: `class Solution {
public:
  int countDiffRecursive(vector<int>& arr, int diff, int i, int left, int right) {
    if (i == arr.size()) return left - right == diff ? 1 : 0;
    return countDiffRecursive(arr, diff, i + 1, left + arr[i], right) +
           countDiffRecursive(arr, diff, i + 1, left, right + arr[i]);
  }
};`,
        }),
        note: "The direct recursive form builds both subsets and checks their difference at the end.",
      },
      {
        id: "topdown",
        label: "Top-down",
        snippets: snippets({
          java: `class Solution {
  int[][] memo;

  int countDiffMemo(int[] arr, int diff) {
    int total = 0;
    for (int value : arr) total += value;
    if ((total + diff) % 2 != 0) return 0;
    int target = (total + diff) / 2;
    memo = new int[arr.length + 1][target + 1];
    for (int i = 0; i <= arr.length; i++) {
      Arrays.fill(memo[i], -1);
    }
    return dfs(arr, arr.length, target);
  }

  int dfs(int[] arr, int n, int sum) {
    if (sum == 0) return 1;
    if (n == 0) return 0;
    if (memo[n][sum] != -1) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) + dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
}`,
          csharp: `public class Solution {
  private int[,] memo;

  public int CountDiffMemo(int[] arr, int diff) {
    int total = 0;
    foreach (int value in arr) total += value;
    if ((total + diff) % 2 != 0) return 0;
    int target = (total + diff) / 2;
    memo = new int[arr.Length + 1, target + 1];
    for (int i = 0; i <= arr.Length; i++) {
      for (int j = 0; j <= target; j++) memo[i, j] = -1;
    }
    return Dfs(arr, arr.Length, target);
  }

  public int Dfs(int[] arr, int n, int sum) {
    if (sum == 0) return 1;
    if (n == 0) return 0;
    if (memo[n, sum] != -1) return memo[n, sum];
    if (arr[n - 1] > sum) memo[n, sum] = Dfs(arr, n - 1, sum);
    else memo[n, sum] = Dfs(arr, n - 1, sum - arr[n - 1]) + Dfs(arr, n - 1, sum);
    return memo[n, sum];
  }
}`,
          python: `def count_diff_memo(arr, diff):
    total = sum(arr)
    if (total + diff) % 2 != 0:
        return 0
    target = (total + diff) // 2
    memo = [[-1] * (target + 1) for _ in range(len(arr) + 1)]

    def dfs(n, curr_sum):
        if curr_sum == 0:
            return 1
        if n == 0:
            return 0
        if memo[n][curr_sum] != -1:
            return memo[n][curr_sum]
        if arr[n - 1] > curr_sum:
            memo[n][curr_sum] = dfs(n - 1, curr_sum)
        else:
            memo[n][curr_sum] = dfs(n - 1, curr_sum - arr[n - 1]) + dfs(n - 1, curr_sum)
        return memo[n][curr_sum]

    return dfs(len(arr), target)`,
          javascript: `function countDiffMemo(arr, diff) {
  const total = arr.reduce((sum, value) => sum + value, 0);
  if ((total + diff) % 2 !== 0) return 0;
  const target = (total + diff) / 2;
  const memo = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(-1)
  );

  function dfs(n, sum) {
    if (sum === 0) return 1;
    if (n === 0) return 0;
    if (memo[n][sum] !== -1) return memo[n][sum];

    if (arr[n - 1] > sum) memo[n][sum] = dfs(n - 1, sum);
    else memo[n][sum] = dfs(n - 1, sum - arr[n - 1]) + dfs(n - 1, sum);

    return memo[n][sum];
  }

  return dfs(arr.length, target);
}`,
          cpp: `class Solution {
public:
  vector<vector<int>> memo;

  int countDiffMemo(vector<int>& arr, int diff) {
    int total = 0;
    for (int value : arr) total += value;
    if ((total + diff) % 2 != 0) return 0;
    int target = (total + diff) / 2;
    memo.assign(arr.size() + 1, vector<int>(target + 1, -1));
    return dfs(arr, arr.size(), target);
  }

  int dfs(vector<int>& arr, int n, int sum) {
    if (sum == 0) return 1;
    if (n == 0) return 0;
    if (memo[n][sum] != -1) return memo[n][sum];
    if (arr[n - 1] > sum) memo[n][sum] = dfs(arr, n - 1, sum);
    else memo[n][sum] = dfs(arr, n - 1, sum - arr[n - 1]) + dfs(arr, n - 1, sum);
    return memo[n][sum];
  }
};`,
        }),
      },
      {
        id: "bottomup",
        label: "Bottom-up",
        snippets: snippets({
          java: `class Solution {
  int countDiffBottomUp(int[] arr, int diff) {
    int total = 0;
    for (int value : arr) total += value;
    if ((total + diff) % 2 != 0) return 0;
    int target = (total + diff) / 2;
    int[][] dp = new int[arr.length + 1][target + 1];
    for (int i = 0; i <= arr.length; i++) dp[i][0] = 1;

    for (int i = 1; i <= arr.length; i++) {
      for (int sum = 0; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] + dp[i - 1][sum];
      }
    }

    return dp[arr.length][target];
  }
}`,
          csharp: `public class Solution {
  public int CountDiffBottomUp(int[] arr, int diff) {
    int total = 0;
    foreach (int value in arr) total += value;
    if ((total + diff) % 2 != 0) return 0;
    int target = (total + diff) / 2;
    int[,] dp = new int[arr.Length + 1, target + 1];
    for (int i = 0; i <= arr.Length; i++) dp[i, 0] = 1;

    for (int i = 1; i <= arr.Length; i++) {
      for (int sum = 0; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i, sum] = dp[i - 1, sum];
        else dp[i, sum] = dp[i - 1, sum - arr[i - 1]] + dp[i - 1, sum];
      }
    }

    return dp[arr.Length, target];
  }
}`,
          python: `def count_diff_bottom_up(arr, diff):
    total = sum(arr)
    if (total + diff) % 2 != 0:
        return 0
    target = (total + diff) // 2
    dp = [[0] * (target + 1) for _ in range(len(arr) + 1)]
    for i in range(len(arr) + 1):
        dp[i][0] = 1

    for i in range(1, len(arr) + 1):
        for curr_sum in range(target + 1):
            if arr[i - 1] > curr_sum:
                dp[i][curr_sum] = dp[i - 1][curr_sum]
            else:
                dp[i][curr_sum] = dp[i - 1][curr_sum - arr[i - 1]] + dp[i - 1][curr_sum]

    return dp[len(arr)][target]`,
          javascript: `function countDiffBottomUp(arr, diff) {
  const total = arr.reduce((sum, value) => sum + value, 0);
  if ((total + diff) % 2 !== 0) return 0;
  const target = (total + diff) / 2;

  const dp = Array.from({ length: arr.length + 1 }, () =>
    Array(target + 1).fill(0)
  );
  for (let i = 0; i <= arr.length; i++) dp[i][0] = 1;

  for (let i = 1; i <= arr.length; i++) {
    for (let sum = 0; sum <= target; sum++) {
      if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
      else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] + dp[i - 1][sum];
    }
  }

  return dp[arr.length][target];
}`,
          cpp: `class Solution {
public:
  int countDiffBottomUp(vector<int>& arr, int diff) {
    int total = 0;
    for (int value : arr) total += value;
    if ((total + diff) % 2 != 0) return 0;
    int target = (total + diff) / 2;
    vector<vector<int>> dp(arr.size() + 1, vector<int>(target + 1, 0));
    for (int i = 0; i <= arr.size(); i++) dp[i][0] = 1;

    for (int i = 1; i <= arr.size(); i++) {
      for (int sum = 0; sum <= target; sum++) {
        if (arr[i - 1] > sum) dp[i][sum] = dp[i - 1][sum];
        else dp[i][sum] = dp[i - 1][sum - arr[i - 1]] + dp[i - 1][sum];
      }
    }

    return dp[arr.size()][target];
  }
};`,
        }),
        note: "This is the same transformed-target counting pattern used by Target Sum.",
      },
    ],
    build: (preset: ProblemPreset) => {
      const total = preset.numbers.reduce((sum, value) => sum + value, 0);
      const reducedTarget = (total + (preset.parameter ?? 0)) / 2;
      return createCountSubsetProblemData(preset.numbers, reducedTarget, {
        explanationPrefix: "Subset Difference Count",
        resultBuilder: (count) => ({
          tone: count > 0 ? "success" : "warning",
          title: count > 0 ? "The table counts valid subset pairs for the requested difference." : "No subset pair creates the requested difference.",
          metrics: [
            { label: "Difference", value: String(preset.parameter ?? 0) },
            { label: "Reduced Target", value: String(reducedTarget) },
            { label: "Count", value: String(count), accent: count > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
          ],
        }),
      });
    },
  },
} satisfies Partial<Record<ProblemKey, ProblemDefinition>>);
