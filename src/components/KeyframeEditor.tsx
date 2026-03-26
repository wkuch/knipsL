"use client";

import { useState, useCallback, useEffect } from "react";

export interface Keyframe {
  scroll: number; // 0-1, scroll progress
  frame: number; // 0-1056, target frame
}

// 2500vh total scroll. Every text section gets a real plateau.
// At 2500vh, 1% scroll = 25vh (a quarter viewport). 4% = 100vh (one full viewport).
const DEFAULT_KEYFRAMES: Keyframe[] = [
  { scroll: 0, frame: 0 },

  // A: Black intro
  { scroll: 0.01, frame: 48 },

  // B: Viewfinder
  { scroll: 0.03, frame: 60 },
  { scroll: 0.06, frame: 110 },

  // Transition to reveal
  { scroll: 0.07, frame: 145 },

  // C: W9001 REVEAL — plateau f160-180
  { scroll: 0.08, frame: 160 },
  { scroll: 0.15, frame: 180 },    // 7% = 175vh for 20 frames
  { scroll: 0.17, frame: 241 },

  // Transition to lens
  { scroll: 0.19, frame: 290 },

  // D: LENS EXPLODED — plateau f307-330
  { scroll: 0.20, frame: 307 },
  { scroll: 0.26, frame: 330 },    // 6% = 150vh for 23 frames
  { scroll: 0.28, frame: 370 },

  // E: LCD REAR — plateau f383-415
  { scroll: 0.29, frame: 383 },
  { scroll: 0.38, frame: 415 },    // 9% = 225vh for 32 frames
  { scroll: 0.39, frame: 438 },

  // F: "Now look closer" — plateau f440-455
  { scroll: 0.40, frame: 440 },
  { scroll: 0.45, frame: 455 },    // 5% = 125vh
  { scroll: 0.46, frame: 470 },

  // G: Magnesium — plateau f475-500
  { scroll: 0.47, frame: 475 },
  { scroll: 0.52, frame: 500 },    // 5% = 125vh
  { scroll: 0.53, frame: 535 },

  // Mechanical dials — plateau f545-575
  { scroll: 0.54, frame: 545 },
  { scroll: 0.59, frame: 575 },    // 5% = 125vh
  { scroll: 0.60, frame: 615 },

  // Weather sealed — plateau f620-640
  { scroll: 0.61, frame: 620 },
  { scroll: 0.66, frame: 640 },    // 5% = 125vh
  { scroll: 0.67, frame: 665 },

  // H: LED — plateau f672-690
  { scroll: 0.68, frame: 672 },
  { scroll: 0.73, frame: 690 },    // 5% = 125vh
  { scroll: 0.74, frame: 710 },

  // I: Bottom plate — plateau around f739
  { scroll: 0.75, frame: 725 },
  { scroll: 0.79, frame: 739 },    // 4% = 100vh
  { scroll: 0.80, frame: 790 },

  // J: Exploded — plateau around f834
  { scroll: 0.81, frame: 820 },
  { scroll: 0.88, frame: 840 },    // 7% = 175vh. big pause.
  { scroll: 0.90, frame: 895 },

  // K: Hero + CTA — plateau on final shot
  { scroll: 0.92, frame: 940 },
  { scroll: 0.98, frame: 1000 },   // 6% = 150vh. let the CTA breathe.
  { scroll: 1, frame: 1056 },
];

const TOTAL_FRAMES = 1057;
const VIDEO_DURATION = 44; // seconds

interface KeyframeEditorProps {
  currentScroll: number;
  currentFrame: number;
  onKeyframesChange: (keyframes: Keyframe[]) => void;
  onFrameOverride: (frame: number | null) => void;
}

function frameToTimecode(frame: number): string {
  const sec = (frame / TOTAL_FRAMES) * VIDEO_DURATION;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

export function applyKeyframes(
  scrollProgress: number,
  keyframes: Keyframe[]
): number {
  if (keyframes.length < 2) return scrollProgress * (TOTAL_FRAMES - 1);

  // Find surrounding keyframes
  const sorted = [...keyframes].sort((a, b) => a.scroll - b.scroll);

  // Clamp
  if (scrollProgress <= sorted[0].scroll) return sorted[0].frame;
  if (scrollProgress >= sorted[sorted.length - 1].scroll)
    return sorted[sorted.length - 1].frame;

  // Find the two keyframes we're between
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (scrollProgress >= a.scroll && scrollProgress <= b.scroll) {
      const t = (scrollProgress - a.scroll) / (b.scroll - a.scroll);
      return a.frame + t * (b.frame - a.frame);
    }
  }

  return scrollProgress * (TOTAL_FRAMES - 1);
}

const STORAGE_KEY = "knipsl-keyframes-v7";

function loadKeyframes(): Keyframe[] {
  if (typeof window === "undefined") return DEFAULT_KEYFRAMES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
    }
  } catch {}
  return DEFAULT_KEYFRAMES;
}

function saveKeyframes(kf: Keyframe[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kf));
  } catch {}
}

export function useKeyframes() {
  const [keyframes, setKeyframes] = useState<Keyframe[]>(DEFAULT_KEYFRAMES);

  useEffect(() => {
    setKeyframes(loadKeyframes());
  }, []);

  const updateKeyframes = useCallback((kf: Keyframe[]) => {
    setKeyframes(kf);
    saveKeyframes(kf);
  }, []);

  return { keyframes, updateKeyframes };
}

export default function KeyframeEditor({
  currentScroll,
  currentFrame,
  onKeyframesChange,
  onFrameOverride,
}: KeyframeEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyframes, setKeyframes] = useState<Keyframe[]>(() =>
    loadKeyframes()
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [stepping, setStepping] = useState(false);
  const [stepFrame, setStepFrame] = useState(0);

  // When entering step mode, start at current frame
  const enterStepMode = useCallback(() => {
    setStepping(true);
    setStepFrame(currentFrame);
    onFrameOverride(currentFrame);
  }, [currentFrame, onFrameOverride]);

  const exitStepMode = useCallback(() => {
    setStepping(false);
    onFrameOverride(null);
  }, [onFrameOverride]);

  const stepBy = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(TOTAL_FRAMES - 1, stepFrame + delta));
      setStepFrame(next);
      onFrameOverride(next);
    },
    [stepFrame, onFrameOverride]
  );

  // Keyboard shortcuts when stepping
  useEffect(() => {
    if (!stepping) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        stepBy(e.shiftKey ? 10 : 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        stepBy(e.shiftKey ? -10 : -1);
      } else if (e.key === "Escape") {
        exitStepMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stepping, stepBy, exitStepMode]);

  // Sync outward
  useEffect(() => {
    onKeyframesChange(keyframes);
  }, [keyframes, onKeyframesChange]);

  const addKeyframe = useCallback(() => {
    const newKf: Keyframe = {
      scroll: Math.round(currentScroll * 1000) / 1000,
      frame: currentFrame,
    };
    const updated = [...keyframes, newKf].sort((a, b) => a.scroll - b.scroll);
    setKeyframes(updated);
    saveKeyframes(updated);
  }, [currentScroll, currentFrame, keyframes]);

  const removeKeyframe = useCallback(
    (index: number) => {
      // Don't remove first or last
      if (index === 0 || index === keyframes.length - 1) return;
      const updated = keyframes.filter((_, i) => i !== index);
      setKeyframes(updated);
      saveKeyframes(updated);
    },
    [keyframes]
  );

  const updateKeyframe = useCallback(
    (index: number, field: "scroll" | "frame", value: number) => {
      const updated = [...keyframes];
      updated[index] = { ...updated[index], [field]: value };
      updated.sort((a, b) => a.scroll - b.scroll);
      setKeyframes(updated);
      saveKeyframes(updated);
    },
    [keyframes]
  );

  const resetKeyframes = useCallback(() => {
    setKeyframes(DEFAULT_KEYFRAMES);
    saveKeyframes(DEFAULT_KEYFRAMES);
  }, []);

  const exportKeyframes = useCallback(() => {
    const code = `const KEYFRAMES: Keyframe[] = ${JSON.stringify(
      keyframes,
      null,
      2
    )};`;
    navigator.clipboard.writeText(code);
  }, [keyframes]);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/10 backdrop-blur-sm text-white px-3 py-1.5 rounded-sm hover:bg-white/20 transition-colors border border-white/10"
      >
        {isOpen ? "Close" : "KF Editor"}{" "}
        <span className="text-white/50">
          {Math.round(currentScroll * 100)}% → f{currentFrame} (
          {frameToTimecode(currentFrame)})
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 w-[420px] max-h-[70vh] overflow-auto bg-black/90 backdrop-blur-md border border-white/10 rounded-sm p-4 text-white">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <span className="font-bold text-sm">Keyframe Editor</span>
            <div className="flex gap-2">
              <button
                onClick={exportKeyframes}
                className="px-2 py-1 bg-accent/80 text-bg rounded-sm hover:bg-accent text-[10px]"
              >
                Copy
              </button>
              <button
                onClick={resetKeyframes}
                className="px-2 py-1 bg-red-500/20 text-red-400 rounded-sm hover:bg-red-500/30 text-[10px]"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Current position */}
          <div className="mb-3 p-2 bg-white/5 rounded-sm">
            <div className="flex justify-between text-white/60 mb-1">
              <span>Current position</span>
              <span>
                {(currentScroll * 100).toFixed(1)}% → frame {stepping ? stepFrame : currentFrame} (
                {frameToTimecode(stepping ? stepFrame : currentFrame)})
              </span>
            </div>
            <button
              onClick={addKeyframe}
              className="w-full py-1.5 bg-accent/20 text-accent rounded-sm hover:bg-accent/30 transition-colors"
            >
              + Add keyframe here
            </button>
          </div>

          {/* Frame stepper */}
          <div className="mb-3 p-2 bg-white/5 rounded-sm">
            {!stepping ? (
              <button
                onClick={enterStepMode}
                className="w-full py-1.5 bg-white/10 text-white/80 rounded-sm hover:bg-white/15 transition-colors"
              >
                Enter frame-step mode
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-accent font-bold text-[11px]">FRAME STEPPING</span>
                  <button
                    onClick={exitStepMode}
                    className="text-[10px] text-white/40 hover:text-white/70"
                  >
                    Exit (Esc)
                  </button>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={() => stepBy(-10)}
                    className="px-2 py-1 bg-white/10 rounded-sm hover:bg-white/20 text-white/70"
                  >
                    -10
                  </button>
                  <button
                    onClick={() => stepBy(-1)}
                    className="px-3 py-1 bg-white/10 rounded-sm hover:bg-white/20 text-white/70"
                  >
                    -1
                  </button>

                  <input
                    type="number"
                    value={stepFrame}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(TOTAL_FRAMES - 1, parseInt(e.target.value) || 0));
                      setStepFrame(v);
                      onFrameOverride(v);
                    }}
                    className="w-20 bg-transparent border-b border-accent px-2 py-1 text-center text-accent font-bold outline-none"
                    min={0}
                    max={1056}
                  />

                  <button
                    onClick={() => stepBy(1)}
                    className="px-3 py-1 bg-white/10 rounded-sm hover:bg-white/20 text-white/70"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => stepBy(10)}
                    className="px-2 py-1 bg-white/10 rounded-sm hover:bg-white/20 text-white/70"
                  >
                    +10
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Scrub slider */}
                  <input
                    type="range"
                    min={0}
                    max={1056}
                    value={stepFrame}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setStepFrame(v);
                      onFrameOverride(v);
                    }}
                    className="flex-1 h-1 accent-amber-500"
                  />
                </div>

                <p className="text-[10px] text-white/30 mt-2">
                  Arrow keys: +/-1 frame. Shift+arrow: +/-10 frames.
                </p>
              </div>
            )}
          </div>

          {/* Keyframe list */}
          <div className="space-y-1">
            {keyframes.map((kf, i) => {
              const isEdge = i === 0 || i === keyframes.length - 1;
              const isEditing = editingIndex === i;

              return (
                <div
                  key={`${kf.scroll}-${kf.frame}-${i}`}
                  className={`flex items-center gap-2 p-1.5 rounded-sm ${
                    isEditing ? "bg-white/10" : "bg-white/5"
                  } ${isEdge ? "opacity-50" : ""}`}
                >
                  {/* Scroll % */}
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-white/40 w-8">scr</span>
                    <input
                      type="number"
                      value={Math.round(kf.scroll * 100 * 10) / 10}
                      onChange={(e) =>
                        updateKeyframe(
                          i,
                          "scroll",
                          parseFloat(e.target.value) / 100
                        )
                      }
                      onFocus={() => setEditingIndex(i)}
                      onBlur={() => setEditingIndex(null)}
                      disabled={isEdge}
                      className="w-16 bg-transparent border-b border-white/20 px-1 text-right focus:border-accent outline-none disabled:opacity-50"
                      step={0.1}
                    />
                    <span className="text-white/30">%</span>
                  </div>

                  {/* Frame */}
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-white/40 w-6">fr</span>
                    <input
                      type="number"
                      value={Math.round(kf.frame)}
                      onChange={(e) =>
                        updateKeyframe(i, "frame", parseInt(e.target.value))
                      }
                      onFocus={() => setEditingIndex(i)}
                      onBlur={() => setEditingIndex(null)}
                      disabled={isEdge}
                      className="w-16 bg-transparent border-b border-white/20 px-1 text-right focus:border-accent outline-none disabled:opacity-50"
                      step={1}
                      min={0}
                      max={1056}
                    />
                  </div>

                  {/* Timecode */}
                  <span className="text-white/30 w-12 text-right">
                    {frameToTimecode(kf.frame)}
                  </span>

                  {/* Remove */}
                  {!isEdge && (
                    <button
                      onClick={() => removeKeyframe(i)}
                      className="text-red-400/60 hover:text-red-400 px-1"
                    >
                      x
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Visual curve */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <svg
              viewBox="0 0 400 100"
              className="w-full h-20"
              preserveAspectRatio="none"
            >
              {/* Grid */}
              {[0.25, 0.5, 0.75].map((v) => (
                <line
                  key={v}
                  x1={v * 400}
                  y1={0}
                  x2={v * 400}
                  y2={100}
                  stroke="rgba(255,255,255,0.05)"
                />
              ))}
              {[0.25, 0.5, 0.75].map((v) => (
                <line
                  key={`h${v}`}
                  x1={0}
                  y1={v * 100}
                  x2={400}
                  y2={v * 100}
                  stroke="rgba(255,255,255,0.05)"
                />
              ))}

              {/* Linear reference */}
              <line
                x1={0}
                y1={100}
                x2={400}
                y2={0}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 4"
              />

              {/* Keyframe curve */}
              <polyline
                points={keyframes
                  .sort((a, b) => a.scroll - b.scroll)
                  .map(
                    (kf) =>
                      `${kf.scroll * 400},${100 - (kf.frame / 1056) * 100}`
                  )
                  .join(" ")}
                fill="none"
                stroke="#C4943A"
                strokeWidth={2}
              />

              {/* Keyframe dots */}
              {keyframes.map((kf, i) => (
                <circle
                  key={i}
                  cx={kf.scroll * 400}
                  cy={100 - (kf.frame / 1056) * 100}
                  r={3}
                  fill="#C4943A"
                />
              ))}

              {/* Current position */}
              <circle
                cx={currentScroll * 400}
                cy={100 - (currentFrame / 1056) * 100}
                r={4}
                fill="white"
                stroke="#C4943A"
                strokeWidth={1}
              />
            </svg>
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>0% scroll</span>
              <span>100% scroll</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
