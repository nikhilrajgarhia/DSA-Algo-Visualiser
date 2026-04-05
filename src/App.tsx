import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import LCSVisualizer from "@/pages/LCSVisualizer";
import DFSVisualizer, { DFSExplanationPanel } from "@/pages/DFSVisualizer";
import KnapsackVisualizer, { KnapsackExplanationPanel } from "@/pages/KnapsackVisualizer";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { path: "/", label: "LCS", badge: "LCS", title: "LCS Visualizer", subtitle: "Longest Common Subsequence" },
  { path: "/dfs", label: "DFS Tree", badge: "DFS", title: "DFS Visualizer", subtitle: "Depth-First Search" },
  { path: "/knapsack", label: "Knapsack", badge: "KS", title: "Knapsack Visualizer", subtitle: "0/1 Knapsack — DP Optimization" },
];

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<"visualizer" | "explanation">("visualizer");

  const current = NAV_ITEMS.find((n) => n.path === location) ?? NAV_ITEMS[0];

  const explanationPanel =
    location === "/knapsack" ? <KnapsackExplanationPanel /> :
    location === "/dfs" ? <DFSExplanationPanel /> :
    <LCSExplanationPanel />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-xs">{current.badge}</span>
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm leading-tight">{current.title}</h1>
              <p className="text-muted-foreground text-xs">{current.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setActiveTab("visualizer")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${location === item.path ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setActiveTab("visualizer")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "visualizer" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              Visualizer
            </button>
            <button
              onClick={() => setActiveTab("explanation")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${activeTab === "explanation" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Info size={13} /> How it works
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">
        <AnimatePresence mode="wait">
          {activeTab === "visualizer" ? (
            <motion.div key={`visualizer-${location}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              {children}
            </motion.div>
          ) : (
            <motion.div key={`explanation-${location}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              {explanationPanel}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
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
      content: "Brute force would check all 2ⁿ subsequences of each string — exponential time. DP breaks it into overlapping subproblems: if we know LCS(S1[1..i-1], S2[1..j-1]), we can extend it efficiently.",
      example: "Time complexity: O(m×n). Space complexity: O(m×n). Where m and n are string lengths.",
    },
    {
      title: "The Recurrence",
      color: "bg-chart-3/15 border-chart-3/40 text-chart-3",
      dot: "bg-chart-3",
      content: "Define dp[i][j] = length of LCS of S1[1..i] and S2[1..j].",
      bullets: [
        "Base case: dp[i][0] = dp[0][j] = 0 (empty string has no LCS)",
        "If S1[i] == S2[j]: dp[i][j] = dp[i-1][j-1] + 1  (characters match, extend LCS)",
        "If S1[i] ≠ S2[j]: dp[i][j] = max(dp[i-1][j], dp[i][j-1])  (skip one char from either)",
      ],
    },
    {
      title: "Backtracking the Path",
      color: "bg-chart-4/15 border-chart-4/40 text-chart-4",
      dot: "bg-chart-4",
      content: "Once the DP table is filled, start from dp[m][n] and trace back: wherever a match occurred (S1[i]==S2[j]), that character is part of the LCS. The golden cells in the visualizer show this path.",
      example: "Each golden cell represents one character of the final LCS sequence.",
    },
    {
      title: "Real-world Applications",
      color: "bg-chart-5/15 border-chart-5/40 text-chart-5",
      dot: "bg-chart-5",
      bullets: [
        "Git diff — showing differences between file versions",
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
      <div className="bg-gradient-to-br from-primary/8 to-chart-2/8 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-sm text-muted-foreground">Ready to see it in action?</p>
        <p className="text-sm font-medium text-foreground mt-1">Switch to the Visualizer tab and press Play!</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LCSVisualizer} />
      <Route path="/dfs" component={DFSVisualizer} />
      <Route path="/knapsack" component={KnapsackVisualizer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const [location] = useLocation();
  const dirMap: Record<string, number> = { "/": -1, "/dfs": 0, "/knapsack": 1 };
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
