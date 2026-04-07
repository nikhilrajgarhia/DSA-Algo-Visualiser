import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronRight } from "lucide-react";

interface Step {
  i: number;
  j: number;
  value: number;
  isMatch: boolean;
  explanation: string;
}

interface TraceCell {
  i: number;
  j: number;
}

function buildLCSSteps(s1: string, s2: string): { steps: Step[]; dp: number[][]; trace: TraceCell[] } {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const steps: Step[] = [];

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const isMatch = s1[i - 1] === s2[j - 1];
      if (isMatch) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        steps.push({ i, j, value: dp[i][j], isMatch: true, explanation: `'${s1[i - 1]}' matches '${s2[j - 1]}'! dp[${i}][${j}] = dp[${i-1}][${j-1}] + 1 = ${dp[i][j]}` });
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        steps.push({ i, j, value: dp[i][j], isMatch: false, explanation: `'${s1[i - 1]}' ≠ '${s2[j - 1]}'. dp[${i}][${j}] = max(dp[${i-1}][${j}], dp[${i}][${j-1}]) = max(${dp[i-1][j]}, ${dp[i][j-1]}) = ${dp[i][j]}` });
      }
    }
  }

  const trace: TraceCell[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) { trace.push({ i, j }); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) { i--; }
    else { j--; }
  }

  return { steps, dp, trace };
}

function getLCSString(s1: string, s2: string, dp: number[][]): string {
  let result = "";
  let i = s1.length, j = s2.length;
  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) { result = s1[i - 1] + result; i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) { i--; }
    else { j--; }
  }
  return result;
}

const SPEED_OPTIONS = [
  { label: "Slow", ms: 1200 },
  { label: "Normal", ms: 600 },
  { label: "Fast", ms: 200 },
];

const EXAMPLES = [
  { s1: "ABCBDAB", s2: "BDCAB", label: "Classic Example" },
  { s1: "AGGTAB", s2: "GXTXAYB", label: "Common Textbook" },
  { s1: "MZJAWXU", s2: "XMJYAUZ", label: "Mixed Chars" },
  { s1: "HELLO", s2: "HALLO", label: "Short & Simple" },
];

export default function LCSVisualizer() {
  const [s1, setS1] = useState("ABCBDAB");
  const [s2, setS2] = useState("BDCAB");
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showTrace, setShowTrace] = useState(false);

  const computedRef = useRef<{ steps: Step[]; dp: number[][]; trace: TraceCell[] } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const s1Clean = s1.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 9);
  const s2Clean = s2.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 9);

  if (computedRef.current === null && s1Clean.length > 0 && s2Clean.length > 0) {
    computedRef.current = buildLCSSteps(s1Clean, s2Clean);
  }

  useEffect(() => {
    computedRef.current = s1Clean.length > 0 && s2Clean.length > 0 ? buildLCSSteps(s1Clean, s2Clean) : null;
    setCurrentStep(-1);
    setIsPlaying(false);
    setShowTrace(false);
  }, [s1Clean, s2Clean]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || !computedRef.current) return;
    const { steps } = computedRef.current;
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) { setIsPlaying(false); setShowTrace(true); return steps.length - 1; }
        return prev + 1;
      });
    }, SPEED_OPTIONS[speedIdx].ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speedIdx]);

  const reset = useCallback(() => { setCurrentStep(-1); setIsPlaying(false); setShowTrace(false); }, []);

  const stepForward = useCallback(() => {
    if (!computedRef.current) return;
    const { steps } = computedRef.current;
    setCurrentStep((prev) => { const next = Math.min(prev + 1, steps.length - 1); if (next === steps.length - 1) setShowTrace(true); return next; });
  }, []);

  const stepBackward = useCallback(() => {
    setCurrentStep((prev) => { const next = Math.max(prev - 1, -1); if (next < (computedRef.current?.steps.length ?? 0) - 1) setShowTrace(false); return next; });
  }, []);

  const data = computedRef.current;
  const currentStepData = data && currentStep >= 0 ? data.steps[currentStep] : null;
  const totalSteps = data?.steps.length ?? 0;

  const filledDp = (() => {
    if (!data || !s1Clean || !s2Clean) return null;
    const m = s1Clean.length;
    const n = s2Clean.length;
    const grid: (number | null)[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
    for (let r = 0; r <= m; r++) grid[r][0] = 0;
    for (let c = 0; c <= n; c++) grid[0][c] = 0;
    for (let k = 0; k <= currentStep; k++) { const s = data.steps[k]; grid[s.i][s.j] = s.value; }
    return grid;
  })();

  const traceSet = showTrace && data ? new Set(data.trace.map((c) => `${c.i},${c.j}`)) : new Set<string>();
  const lcsString = showTrace && data ? getLCSString(s1Clean, s2Clean, data.dp) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card border border-card-border rounded-[28px] p-6 space-y-4 shadow-sm">
          <label className="text-[15px] font-semibold text-foreground flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-chart-1 text-white text-sm flex items-center justify-center font-bold">S</span>
            String 1
          </label>
          <input
            data-testid="input-s1"
            value={s1}
            onChange={(e) => setS1(e.target.value)}
            placeholder="e.g. ABCBDAB"
            className="h-[68px] w-full rounded-2xl border border-input bg-muted/35 px-5 font-mono text-2xl tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            maxLength={12}
          />
          <div className="flex gap-2 flex-wrap">
            {s1Clean.split("").map((ch, idx) => (
              <span key={idx} className="w-10 h-10 rounded-xl bg-chart-1/12 text-chart-1 font-bold text-xl flex items-center justify-center border border-chart-1/30">{ch}</span>
            ))}
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-[28px] p-6 space-y-4 shadow-sm">
          <label className="text-[15px] font-semibold text-foreground flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-chart-2 text-white text-sm flex items-center justify-center font-bold">T</span>
            String 2
          </label>
          <input
            data-testid="input-s2"
            value={s2}
            onChange={(e) => setS2(e.target.value)}
            placeholder="e.g. BDCAB"
            className="h-[68px] w-full rounded-2xl border border-input bg-muted/35 px-5 font-mono text-2xl tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            maxLength={12}
          />
          <div className="flex gap-2 flex-wrap">
            {s2Clean.split("").map((ch, idx) => (
              <span key={idx} className="w-10 h-10 rounded-xl bg-chart-2/12 text-chart-2 font-bold text-xl flex items-center justify-center border border-chart-2/30">{ch}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-muted-foreground font-semibold">Examples:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => { setS1(ex.s1); setS2(ex.s2); }}
            data-testid={`example-${ex.label.replace(/\s/g, "-").toLowerCase()}`}
            className="rounded-full border border-border bg-card px-5 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-[28px] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-card-border flex items-center justify-between">
          <h2 className="font-semibold text-[16px] text-foreground">DP Table</h2>
          <div className="flex items-center gap-5">
            {[
              { color: "bg-emerald-400/30 border-emerald-400/60", label: "Match" },
              { color: "bg-amber-400/30 border-amber-400/60", label: "LCS Path" },
              { color: "bg-primary/30 border-primary/60", label: "Current" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`w-4 h-4 rounded-full border inline-block ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 overflow-x-auto">
          {filledDp && s1Clean && s2Clean ? (
            <div style={{ fontFamily: "var(--app-font-mono)" }}>
              <table className="border-separate" style={{ borderSpacing: 3 }}>
                <thead>
                  <tr>
                    <td style={{ width: 44, height: 44 }} />
                    <td style={{ width: 44, height: 44 }} className="text-center text-xs text-muted-foreground font-medium">ε</td>
                    {s2Clean.split("").map((ch, j) => (
                      <td key={j} style={{ width: 44, height: 44 }} className="text-center">
                        <span className="inline-flex items-center justify-center w-full h-full rounded-md bg-chart-2/15 text-chart-2 font-bold text-sm border border-chart-2/30">{ch}</span>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: s1Clean.length + 1 }, (_, i) => (
                    <tr key={i}>
                      <td style={{ width: 44, height: 44 }} className="text-center">
                        {i === 0
                          ? <span className="text-xs text-muted-foreground font-medium">ε</span>
                          : <span className="inline-flex items-center justify-center w-full h-full rounded-md bg-chart-1/15 text-chart-1 font-bold text-sm border border-chart-1/30">{s1Clean[i - 1]}</span>
                        }
                      </td>
                      {Array.from({ length: s2Clean.length + 1 }, (_, j) => {
                        const val = filledDp[i][j];
                        const isCurrent = currentStepData?.i === i && currentStepData?.j === j;
                        const isMatchCell = isCurrent && currentStepData?.isMatch;
                        const inTrace = traceSet.has(`${i},${j}`);
                        const isJustFilled = currentStep >= 0 && data?.steps[currentStep]?.i === i && data?.steps[currentStep]?.j === j;
                        let bg = "bg-muted/40 border-border";
                        if (inTrace) bg = "bg-amber-400/25 border-amber-400/70";
                        if (isCurrent && !isMatchCell) bg = "bg-primary/20 border-primary/60";
                        if (isMatchCell) bg = "bg-emerald-400/25 border-emerald-400/70";
                        return (
                          <td key={j} style={{ width: 44, height: 44 }} className="text-center">
                            <div className={`inline-flex items-center justify-center w-full h-full rounded-lg border-2 text-sm font-bold transition-all duration-300 ${bg} ${isCurrent ? "shadow-sm scale-105" : ""} ${isJustFilled && val !== null ? "cell-pop" : ""}`}>
                              {val !== null
                                ? <span className={inTrace ? "text-amber-700 dark:text-amber-300" : isCurrent ? "text-primary" : "text-foreground"}>{val}</span>
                                : <span className="text-border/50 text-xs">·</span>
                              }
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Enter two strings to start the visualization</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {currentStepData && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${currentStepData.isMatch ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700" : "bg-primary/5 border-primary/25"}`}
          >
            <ChevronRight size={16} className={`mt-0.5 shrink-0 ${currentStepData.isMatch ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`} />
            <p className={`text-sm font-medium font-mono ${currentStepData.isMatch ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
              {currentStepData.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lcsString !== null && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-primary/10 to-chart-2/10 border border-primary/30 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">LCS Result:</span>
              <div className="flex gap-1.5">
                {lcsString.split("").map((ch, idx) => (
                  <motion.span key={idx} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-base flex items-center justify-center shadow-sm">
                    {ch}
                  </motion.span>
                ))}
              </div>
              <span className="text-muted-foreground text-sm">Length = <strong className="text-foreground">{lcsString.length}</strong></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={reset} data-testid="button-reset" className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <RotateCcw size={15} />
            </button>
            <button onClick={stepBackward} data-testid="button-step-back" disabled={currentStep < 0} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <SkipBack size={15} />
            </button>
            <button onClick={() => setIsPlaying((p) => !p)} data-testid="button-play-pause" disabled={!data || currentStep >= totalSteps - 1} className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button onClick={stepForward} data-testid="button-step-forward" disabled={!data || currentStep >= totalSteps - 1} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <SkipForward size={15} />
            </button>
          </div>

          <div className="flex-1 w-full">
            <input
              type="range"
              min={-1}
              max={totalSteps - 1}
              value={currentStep}
              data-testid="slider-step"
              onChange={(e) => { const val = Number(e.target.value); setCurrentStep(val); setIsPlaying(false); setShowTrace(val === totalSteps - 1); }}
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
              <button key={s.label} onClick={() => setSpeedIdx(idx)} data-testid={`speed-${s.label.toLowerCase()}`} className={`px-3 py-1.5 text-xs font-medium transition-colors ${speedIdx === idx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
