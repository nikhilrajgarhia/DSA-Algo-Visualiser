import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Eye, Info, Network, PanelLeftClose, PanelLeftOpen, Spline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeVariantsPanel, type CodeSnippet, type CodeVariant } from "@/components/code-variants-panel";
import { ExplanationComments } from "@/components/explanation-comments";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import LCSVisualizer from "@/pages/LCSVisualizer";
import DFSVisualizer, { DFSExplanationPanel } from "@/pages/DFSVisualizer";
import KnapsackVisualizer, { KnapsackExplanationPanel } from "@/pages/KnapsackVisualizer";
import {
  CountSubsetSumExplanationPanel,
  CountSubsetSumVisualizer,
  EqualPartitionExplanationPanel,
  EqualPartitionVisualizer,
  MinimumSubsetDifferenceExplanationPanel,
  MinimumSubsetDifferenceVisualizer,
  SubsetDifferenceCountExplanationPanel,
  SubsetDifferenceCountVisualizer,
  SubsetSumExplanationPanel,
  SubsetSumVisualizer,
  TargetSumExplanationPanel,
  TargetSumVisualizer,
} from "@/pages/SubsetFamilyVisualizers";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

type ViewMode = "visualizer" | "explanation";

type NavItem = {
  path: string;
  label: string;
  compactLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  children?: NavItem[];
};

type NavGroup = {
  id: string;
  title: string;
  hint: string;
  icon: typeof Spline;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "tree",
    title: "Tree",
    hint: "Traversal",
    icon: Network,
    items: [
      {
        path: "/dfs",
        label: "DFS Tree",
        compactLabel: "DFS",
        badge: "DFS",
        title: "DFS",
        subtitle: "Depth-First Search",
      },
    ],
  },
  {
    id: "dp",
    title: "DP - Dynamic Programming",
    hint: "Optimization",
    icon: Spline,
    items: [
      {
        path: "/knapsack",
        label: "Knapsack",
        compactLabel: "KS",
        badge: "KS",
        title: "Knapsack",
        subtitle: "0/1 Knapsack",
        children: [
          {
            path: "/subset-sum",
            label: "Subset Sum",
            compactLabel: "SS",
            badge: "SS",
            title: "Subset Sum",
            subtitle: "Target feasibility",
          },
          {
            path: "/equal-partition",
            label: "Equal Partition",
            compactLabel: "EQ",
            badge: "EQ",
            title: "Equal Partition",
            subtitle: "Two equal halves",
          },
          {
            path: "/count-subset-sum",
            label: "Count Subset Sum",
            compactLabel: "CSS",
            badge: "CSS",
            title: "Count Subset Sum",
            subtitle: "Number of valid subsets",
          },
          {
            path: "/min-subset-diff",
            label: "Min Subset Diff",
            compactLabel: "MSD",
            badge: "MSD",
            title: "Min Subset Difference",
            subtitle: "Closest partition",
          },
          {
            path: "/target-sum",
            label: "Target Sum",
            compactLabel: "TS",
            badge: "TS",
            title: "Target Sum",
            subtitle: "Sign assignments",
          },
          {
            path: "/subset-diff-count",
            label: "Subset Diff Count",
            compactLabel: "DIF",
            badge: "DIF",
            title: "Subset Diff Count",
            subtitle: "Pairs by difference",
          },
        ],
      },
      {
        path: "/",
        label: "LCS",
        compactLabel: "LCS",
        badge: "LCS",
        title: "LCS",
        subtitle: "Longest Common Subsequence",
      },
    ],
  },
];

function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => flattenNavItems(group.items));

function itemContainsPath(item: NavItem, location: string) {
  return item.path === location || item.children?.some((child) => itemContainsPath(child, location)) || false;
}

const VIEW_ITEMS: Array<{
  id: ViewMode;
  label: string;
  compactLabel: string;
  description: string;
}> = [
  {
    id: "visualizer",
    label: "Visualizer",
    compactLabel: "V",
    description: "Interactive controls and step-by-step playback",
  },
  {
    id: "explanation",
    label: "How it works",
    compactLabel: "?",
    description: "Concept overview, recurrence, and walkthrough",
  },
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

const LCS_CODE_VARIANTS: CodeVariant[] = [
  {
    id: "recursion",
    label: "Recursion",
    snippets: snippets({
      java: `class Solution {
  int lcs(String s1, String s2, int i, int j) {
    if (i == 0 || j == 0) return 0;
    if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
      return 1 + lcs(s1, s2, i - 1, j - 1);
    }
    return Math.max(lcs(s1, s2, i - 1, j), lcs(s1, s2, i, j - 1));
  }
}`,
      csharp: `public class Solution {
  public int Lcs(string s1, string s2, int i, int j) {
    if (i == 0 || j == 0) return 0;
    if (s1[i - 1] == s2[j - 1]) {
      return 1 + Lcs(s1, s2, i - 1, j - 1);
    }
    return Math.Max(Lcs(s1, s2, i - 1, j), Lcs(s1, s2, i, j - 1));
  }
}`,
      python: `def lcs_recursive(s1, s2, i, j):
    if i == 0 or j == 0:
        return 0
    if s1[i - 1] == s2[j - 1]:
        return 1 + lcs_recursive(s1, s2, i - 1, j - 1)
    return max(
        lcs_recursive(s1, s2, i - 1, j),
        lcs_recursive(s1, s2, i, j - 1),
    )`,
      javascript: `function lcsRecursive(s1, s2, i = s1.length, j = s2.length) {
  if (i === 0 || j === 0) return 0;
  if (s1[i - 1] === s2[j - 1]) {
    return 1 + lcsRecursive(s1, s2, i - 1, j - 1);
  }
  return Math.max(
    lcsRecursive(s1, s2, i - 1, j),
    lcsRecursive(s1, s2, i, j - 1)
  );
}`,
      cpp: `class Solution {
public:
  int lcs(string s1, string s2, int i, int j) {
    if (i == 0 || j == 0) return 0;
    if (s1[i - 1] == s2[j - 1]) {
      return 1 + lcs(s1, s2, i - 1, j - 1);
    }
    return max(lcs(s1, s2, i - 1, j), lcs(s1, s2, i, j - 1));
  }
};`,
    }),
    note: "The pure recursive version is the easiest to understand, but it recomputes many overlapping subproblems.",
  },
  {
    id: "topdown",
    label: "Top-down",
    snippets: snippets({
      java: `class Solution {
  int[][] memo;

  int lcs(String s1, String s2, int i, int j) {
    if (i == 0 || j == 0) return 0;
    if (memo[i][j] != -1) return memo[i][j];
    if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
      memo[i][j] = 1 + lcs(s1, s2, i - 1, j - 1);
    } else {
      memo[i][j] = Math.max(lcs(s1, s2, i - 1, j), lcs(s1, s2, i, j - 1));
    }
    return memo[i][j];
  }
}`,
      csharp: `public class Solution {
  private int[,] memo;

  public int LcsMemo(string s1, string s2, int i, int j) {
    if (i == 0 || j == 0) return 0;
    if (memo[i, j] != -1) return memo[i, j];
    if (s1[i - 1] == s2[j - 1]) {
      memo[i, j] = 1 + LcsMemo(s1, s2, i - 1, j - 1);
    } else {
      memo[i, j] = Math.Max(LcsMemo(s1, s2, i - 1, j), LcsMemo(s1, s2, i, j - 1));
    }
    return memo[i, j];
  }
}`,
      python: `def lcs_memo(s1, s2):
    memo = [[-1] * (len(s2) + 1) for _ in range(len(s1) + 1)]

    def solve(i, j):
        if i == 0 or j == 0:
            return 0
        if memo[i][j] != -1:
            return memo[i][j]
        if s1[i - 1] == s2[j - 1]:
            memo[i][j] = 1 + solve(i - 1, j - 1)
        else:
            memo[i][j] = max(solve(i - 1, j), solve(i, j - 1))
        return memo[i][j]

    return solve(len(s1), len(s2))`,
      javascript: `function lcsMemo(s1, s2) {
  const memo = Array.from({ length: s1.length + 1 }, () =>
    Array(s2.length + 1).fill(-1)
  );

  function solve(i, j) {
    if (i === 0 || j === 0) return 0;
    if (memo[i][j] !== -1) return memo[i][j];
    if (s1[i - 1] === s2[j - 1]) {
      memo[i][j] = 1 + solve(i - 1, j - 1);
    } else {
      memo[i][j] = Math.max(solve(i - 1, j), solve(i, j - 1));
    }
    return memo[i][j];
  }

  return solve(s1.length, s2.length);
}`,
      cpp: `class Solution {
public:
  vector<vector<int>> memo;

  int lcsMemo(string &s1, string &s2, int i, int j) {
    if (i == 0 || j == 0) return 0;
    if (memo[i][j] != -1) return memo[i][j];
    if (s1[i - 1] == s2[j - 1]) {
      memo[i][j] = 1 + lcsMemo(s1, s2, i - 1, j - 1);
    } else {
      memo[i][j] = max(lcsMemo(s1, s2, i - 1, j), lcsMemo(s1, s2, i, j - 1));
    }
    return memo[i][j];
  }
};`,
    }),
    note: "Memoization keeps the recursive shape, but stores answers so each state is solved only once.",
  },
  {
    id: "bottomup",
    label: "Bottom-up",
    snippets: snippets({
      java: `class Solution {
  int lcsBottomUp(String s1, String s2) {
    int[][] dp = new int[s1.length() + 1][s2.length() + 1];
    for (int i = 1; i <= s1.length(); i++) {
      for (int j = 1; j <= s2.length(); j++) {
        if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
          dp[i][j] = 1 + dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[s1.length()][s2.length()];
  }
}`,
      csharp: `public class Solution {
  public int LcsBottomUp(string s1, string s2) {
    int[,] dp = new int[s1.Length + 1, s2.Length + 1];
    for (int i = 1; i <= s1.Length; i++) {
      for (int j = 1; j <= s2.Length; j++) {
        if (s1[i - 1] == s2[j - 1]) dp[i, j] = 1 + dp[i - 1, j - 1];
        else dp[i, j] = Math.Max(dp[i - 1, j], dp[i, j - 1]);
      }
    }
    return dp[s1.Length, s2.Length];
  }
}`,
      python: `def lcs_bottom_up(s1, s2):
    dp = [[0] * (len(s2) + 1) for _ in range(len(s1) + 1)]
    for i in range(1, len(s1) + 1):
        for j in range(1, len(s2) + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = 1 + dp[i - 1][j - 1]
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[len(s1)][len(s2)]`,
      javascript: `function lcsBottomUp(s1, s2) {
  const dp = Array.from({ length: s1.length + 1 }, () =>
    Array(s2.length + 1).fill(0)
  );

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[s1.length][s2.length];
}`,
      cpp: `class Solution {
public:
  int lcsBottomUp(string s1, string s2) {
    vector<vector<int>> dp(s1.size() + 1, vector<int>(s2.size() + 1, 0));
    for (int i = 1; i <= s1.size(); i++) {
      for (int j = 1; j <= s2.size(); j++) {
        if (s1[i - 1] == s2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];
        else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[s1.size()][s2.size()];
  }
};`,
    }),
    note: "This is the tabulation approach used by the visualizer, where the table is filled row by row.",
  },
];

function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<ViewMode>("visualizer");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [openGroupId, setOpenGroupId] = useState<string>(() => {
    const initialGroup = NAV_GROUPS.find((group) => group.items.some((item) => itemContainsPath(item, location)));
    return initialGroup?.id ?? NAV_GROUPS[0]?.id ?? "";
  });
  const [openItemPath, setOpenItemPath] = useState<string>(() => {
    const initialParent = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.children?.some((child) => itemContainsPath(child, location)));
    return initialParent?.path ?? "/knapsack";
  });

  useEffect(() => {
    setIsSidebarExpanded(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const currentGroup = NAV_GROUPS.find((group) => group.items.some((item) => itemContainsPath(item, location)));
    if (currentGroup) {
      setOpenGroupId(currentGroup.id);
    }
  }, [location]);

  useEffect(() => {
    const activeParent = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.children?.some((child) => itemContainsPath(child, location)));
    if (activeParent) {
      setOpenItemPath(activeParent.path);
    }
  }, [location]);

  const current = NAV_ITEMS.find((item) => item.path === location) ?? NAV_ITEMS[0];

  const explanationPanel =
    location === "/knapsack" ? <KnapsackExplanationPanel /> :
    location === "/subset-sum" ? <SubsetSumExplanationPanel /> :
    location === "/equal-partition" ? <EqualPartitionExplanationPanel /> :
    location === "/count-subset-sum" ? <CountSubsetSumExplanationPanel /> :
    location === "/min-subset-diff" ? <MinimumSubsetDifferenceExplanationPanel /> :
    location === "/target-sum" ? <TargetSumExplanationPanel /> :
    location === "/subset-diff-count" ? <SubsetDifferenceCountExplanationPanel /> :
    location === "/dfs" ? <DFSExplanationPanel /> :
    <LCSExplanationPanel />;

  const handleRouteSelect = () => {
    setActiveTab("visualizer");
    if (isMobile) {
      setIsSidebarExpanded(false);
    }
  };

  const handleViewSelect = (view: ViewMode) => {
    setActiveTab(view);
    if (isMobile) {
      setIsSidebarExpanded(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <aside
          className={cn(
            "shrink-0 border-b border-border bg-card md:border-b-0 md:border-r",
            "transition-[width] duration-200",
            isSidebarExpanded ? "md:w-[330px]" : "md:w-[72px]",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 border-b border-border px-4 py-3.5",
              !isSidebarExpanded && !isMobile && "justify-center px-3",
            )}
          >
            {(isSidebarExpanded || isMobile) ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-[11px] font-bold text-primary-foreground shadow-sm">
                  DSA
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">DSA Visualizer</p>
                  <p className="text-[11px] text-muted-foreground">Visual algorithm guides</p>
                </div>
              </>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-[11px] font-bold text-primary-foreground shadow-sm">
                DSA
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:bg-muted"
              onClick={() => setIsSidebarExpanded((prev) => !prev)}
              aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
          </div>

          {isSidebarExpanded || isMobile ? (
            <div className={cn("space-y-6 p-4", isMobile && !isSidebarExpanded && "hidden")}>
              <section className="space-y-5">
                <div className="space-y-5">
                  {NAV_GROUPS.map((group) => {
                    const Icon = group.icon;
                    const isOpen = openGroupId === group.id;

                    return (
                      <div key={group.id} className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setOpenGroupId((prev) => (prev === group.id ? "" : group.id))}
                          className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium text-foreground">{group.title}</p>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>

                        {isOpen && (
                          <div className="ml-4 border-l border-border pl-4">
                            <div className="space-y-1.5">
                              {group.items.map((item) => {
                                const isActive = location === item.path;
                                const hasActiveChild = item.children?.some((child) => itemContainsPath(child, location)) ?? false;
                                const isExpandedItem = openItemPath === item.path;

                                return (
                                  <div key={item.path} className="space-y-1.5">
                                    <div
                                      className={cn(
                                        "flex items-center gap-3 rounded-2xl px-2.5 py-1.5 transition-colors",
                                        isActive || hasActiveChild ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted/70",
                                      )}
                                    >
                                      <Link href={item.path} onClick={handleRouteSelect} className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={cn(
                                              "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[11px] font-semibold",
                                              isActive || hasActiveChild ? "bg-primary-foreground/12 text-primary-foreground" : "bg-muted text-muted-foreground",
                                            )}
                                          >
                                            {item.badge}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[14px] font-semibold leading-tight">{item.label}</p>
                                            <p className={cn("text-[10px] leading-tight", isActive || hasActiveChild ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                              {item.subtitle}
                                            </p>
                                          </div>
                                        </div>
                                      </Link>
                                      {item.children && (
                                        <button
                                          type="button"
                                          onClick={() => setOpenItemPath((prev) => (prev === item.path ? "" : item.path))}
                                          className={cn(
                                            "flex h-7 w-7 items-center justify-center rounded-lg",
                                            isActive || hasActiveChild ? "hover:bg-primary-foreground/10" : "hover:bg-muted",
                                          )}
                                          aria-label={isExpandedItem ? `Collapse ${item.label}` : `Expand ${item.label}`}
                                        >
                                          <ChevronDown className={cn("h-3 w-3 transition-transform", isExpandedItem && "rotate-180")} />
                                        </button>
                                      )}
                                    </div>

                                    {item.children && isExpandedItem && (
                                      <div className="ml-4 space-y-1 border-l border-border/80 pl-3">
                                        {item.children.map((child) => {
                                          const isChildActive = location === child.path;
                                          return (
                                            <Link
                                              key={child.path}
                                              href={child.path}
                                              onClick={handleRouteSelect}
                                              className={cn(
                                                "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors",
                                                isChildActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                              )}
                                            >
                                              <div
                                                className={cn(
                                                  "flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[9px] font-semibold",
                                                  isChildActive ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground",
                                                )}
                                              >
                                                {child.badge}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-[12px] font-medium leading-tight">{child.label}</p>
                                              </div>
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex h-[calc(100vh-65px)] flex-col items-center gap-3 px-2 py-4">
              {NAV_GROUPS.map((group) => {
                const Icon = group.icon;
                const active = group.items.some((item) => itemContainsPath(item, location));

                return (
                  <Link
                    key={group.id}
                    href={group.items[0].path}
                    onClick={handleRouteSelect}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
                      active ? "border-primary/30 bg-primary text-primary-foreground shadow-sm" : "border-transparent text-muted-foreground hover:bg-muted",
                    )}
                    title={group.title}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </Link>
                );
              })}
            </div>
          )}
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-b border-border bg-card">
            <div className="flex min-h-[72px] items-center justify-between gap-4 px-6 py-3 md:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-[13px] font-bold text-primary-foreground shadow-sm">
                  {current.badge}
                </div>
                <div>
                  <h1 className="text-[17px] font-semibold text-foreground">{current.title}</h1>
                  <p className="text-[12px] text-muted-foreground">{current.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {VIEW_ITEMS.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleViewSelect(item.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors",
                        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {item.id === "visualizer" ? <Eye className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-5 md:px-10 md:py-8">
            <AnimatePresence mode="wait">
              {activeTab === "visualizer" ? (
                <motion.div
                  key={`visualizer-${location}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  {children}
                </motion.div>
              ) : (
                <motion.div
                  key={`explanation-${location}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  {explanationPanel}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

function LCSExplanationPanel() {
  const sections = [
    {
      title: "What is LCS?",
      color: "bg-chart-1/15 border-chart-1/40 text-chart-1",
      dot: "bg-chart-1",
      content: "The Longest Common Subsequence (LCS) problem asks: given two strings, find the longest sequence of characters that appears in both strings in the same relative order (but not necessarily contiguously).",
      example: 'For S1 = "ABCBDAB" and S2 = "BDCAB", the LCS is "BCAB" or "BDAB" with length 4.',
    },
    {
      title: "Why Dynamic Programming?",
      color: "bg-chart-2/15 border-chart-2/40 text-chart-2",
      dot: "bg-chart-2",
      content: "Brute force would check all 2^n subsequences of each string - exponential time. DP breaks it into overlapping subproblems: if we know LCS(S1[1..i-1], S2[1..j-1]), we can extend it efficiently.",
      example: "Time complexity: O(m x n). Space complexity: O(m x n). Where m and n are string lengths.",
    },
    {
      title: "The Recurrence",
      color: "bg-chart-3/15 border-chart-3/40 text-chart-3",
      dot: "bg-chart-3",
      content: "Define dp[i][j] = length of LCS of S1[1..i] and S2[1..j].",
      bullets: [
        "Base case: dp[i][0] = dp[0][j] = 0 (empty string has no LCS)",
        "If S1[i] == S2[j]: dp[i][j] = dp[i-1][j-1] + 1 (characters match, extend LCS)",
        "If S1[i] != S2[j]: dp[i][j] = max(dp[i-1][j], dp[i][j-1]) (skip one char from either)",
      ],
    },
    {
      title: "Backtracking the Path",
      color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
      dot: "bg-chart-4",
      content: "Once the DP table is filled, start from dp[m][n] and trace back: wherever a match occurred (S1[i] == S2[j]), that character is part of the LCS. The golden cells in the visualizer show this path.",
      example: "Each golden cell represents one character of the final LCS sequence.",
    },
    {
      title: "Real-world Applications",
      color: "bg-chart-5/15 border-chart-5/40 text-chart-5",
      dot: "bg-chart-5",
      bullets: [
        "Git diff - showing differences between file versions",
        "DNA sequence alignment in bioinformatics",
        "Spell checkers and autocorrect",
        "Plagiarism detection tools",
        "File comparison tools (diff, patch)",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-bold text-lg text-foreground mb-1">Understanding LCS</h2>
        <p className="text-muted-foreground text-sm">A visual guide to the Longest Common Subsequence algorithm and dynamic programming.</p>
      </div>
      {sections.map((sec, idx) => (
        <motion.div key={sec.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }} className="bg-card border border-card-border rounded-xl p-5 space-y-3">
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
      <CodeVariantsPanel title="LCS Code" variants={LCS_CODE_VARIANTS} />
      <div className="bg-gradient-to-br from-primary/8 to-chart-2/8 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-sm text-muted-foreground">Ready to see it in action?</p>
        <p className="text-sm font-medium text-foreground mt-1">Switch to the Visualizer view and press Play.</p>
      </div>
      <ExplanationComments storageKey="lcs-how-it-works" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LCSVisualizer} />
      <Route path="/dfs" component={DFSVisualizer} />
      <Route path="/knapsack" component={KnapsackVisualizer} />
      <Route path="/subset-sum" component={SubsetSumVisualizer} />
      <Route path="/equal-partition" component={EqualPartitionVisualizer} />
      <Route path="/count-subset-sum" component={CountSubsetSumVisualizer} />
      <Route path="/min-subset-diff" component={MinimumSubsetDifferenceVisualizer} />
      <Route path="/target-sum" component={TargetSumVisualizer} />
      <Route path="/subset-diff-count" component={SubsetDifferenceCountVisualizer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const [location] = useLocation();
  const dirMap: Record<string, number> = {
    "/dfs": 0,
    "/knapsack": 1,
    "/subset-sum": 2,
    "/equal-partition": 3,
    "/count-subset-sum": 4,
    "/min-subset-diff": 5,
    "/target-sum": 6,
    "/subset-diff-count": 7,
    "/": 8,
  };
  const dir = dirMap[location] ?? 0;

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div key={location} initial={{ opacity: 0, x: dir * 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <Router />
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppInner />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
