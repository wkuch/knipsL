"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { type Keyframe, applyKeyframes } from "./KeyframeEditor";

const TOTAL_FRAMES = 1057;
const SCROLL_HEIGHT_VH = 2500; // Apple-style: very long scroll, dramatic pacing
const LERP_SPEED_BASE = 0.12; // Smooth catchup for small frame differences
const LERP_SPEED_FAST = 0.4;  // Faster catchup for large jumps (transitions)

interface ScrollVideoProps {
  children?:
    | ((progress: number, frame: number) => React.ReactNode)
    | React.ReactNode;
  keyframes?: Keyframe[];
  frameOverride?: number | null;
}

export default function ScrollVideo({ children, keyframes, frameOverride }: ScrollVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<(ImageBitmap | HTMLImageElement | null)[]>(
    new Array(TOTAL_FRAMES).fill(null)
  );
  const targetFrameRef = useRef(0);
  const displayFrameRef = useRef(0); // Lerped frame (float)
  const drawnFrameRef = useRef(-1); // Last integer frame drawn to canvas
  const rafRef = useRef<number>(0);
  const lerpRafRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const keyframesRef = useRef<Keyframe[] | undefined>(keyframes);
  const [loadProgress, setLoadProgress] = useState(0);
  const loadedCountRef = useRef(0);
  const scrollDirectionRef = useRef<"down" | "up">("down");
  const lastScrollTopRef = useRef(0);

  const frameOverrideRef = useRef<number | null>(frameOverride ?? null);

  useEffect(() => {
    keyframesRef.current = keyframes;
  }, [keyframes]);

  const getFramePath = useCallback((index: number) => {
    return `/frames/frame_${String(index + 1).padStart(4, "0")}.webp`;
  }, []);

  // Draw frame, with fallback to nearest loaded frame if target isn't ready
  const drawFrame = useCallback((fi: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Find the requested frame, or fall back to nearest loaded frame
    let frame = framesRef.current[fi];
    if (!frame) {
      // Search nearby frames (prefer behind, then ahead)
      for (let offset = 1; offset < 30; offset++) {
        if (fi - offset >= 0 && framesRef.current[fi - offset]) {
          frame = framesRef.current[fi - offset];
          break;
        }
        if (
          fi + offset < TOTAL_FRAMES &&
          framesRef.current[fi + offset]
        ) {
          frame = framesRef.current[fi + offset];
          break;
        }
      }
    }
    if (!frame) return;

    const width = canvas.width;
    const height = canvas.height;

    const frameW =
      frame instanceof ImageBitmap ? frame.width : frame.naturalWidth;
    const frameH =
      frame instanceof ImageBitmap ? frame.height : frame.naturalHeight;

    const scale = Math.max(width / frameW, height / frameH);
    const drawW = frameW * scale;
    const drawH = frameH * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(frame, drawX, drawY, drawW, drawH);
  }, []);

  // Frame override: when set, jump directly to that frame (bypass lerp/scroll)
  useEffect(() => {
    frameOverrideRef.current = frameOverride ?? null;
    if (frameOverride != null) {
      const fi = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameOverride));
      targetFrameRef.current = fi;
      displayFrameRef.current = fi;
      drawnFrameRef.current = fi;
      drawFrame(fi);
      setFrameIndex(fi);
    }
  }, [frameOverride, drawFrame]);

  // Lerp loop: smoothly interpolates displayed frame toward target frame
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;

      // Skip lerp when frame override is active
      if (frameOverrideRef.current != null) {
        lerpRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const target = targetFrameRef.current;
      const current = displayFrameRef.current;
      const diff = target - current;
      const absDiff = Math.abs(diff);

      // If close enough, snap
      if (absDiff < 0.5) {
        displayFrameRef.current = target;
      } else {
        // Use faster lerp for large jumps (e.g. transitions between scenes)
        // so we don't slowly crawl through black/transition frames
        const speed = absDiff > 15 ? LERP_SPEED_FAST : LERP_SPEED_BASE;
        displayFrameRef.current = current + diff * speed;
      }

      const roundedFrame = Math.round(displayFrameRef.current);
      const clampedFrame = Math.max(
        0,
        Math.min(TOTAL_FRAMES - 1, roundedFrame)
      );

      // Only draw and update state if the integer frame changed
      if (clampedFrame !== drawnFrameRef.current) {
        drawnFrameRef.current = clampedFrame;
        drawFrame(clampedFrame);
        setFrameIndex(clampedFrame);
      }

      lerpRafRef.current = requestAnimationFrame(tick);
    };

    lerpRafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (lerpRafRef.current) cancelAnimationFrame(lerpRafRef.current);
    };
  }, [drawFrame]);

  // Handle scroll -> target frame mapping
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scrollTop = -rect.top;
    const scrollHeight = container.offsetHeight - window.innerHeight;
    const rawProgress = Math.max(0, Math.min(1, scrollTop / scrollHeight));

    // Track scroll direction for preloading
    scrollDirectionRef.current =
      scrollTop > lastScrollTopRef.current ? "down" : "up";
    lastScrollTopRef.current = scrollTop;

    setProgress(rawProgress);

    let fi: number;
    if (keyframesRef.current && keyframesRef.current.length >= 2) {
      fi = Math.round(applyKeyframes(rawProgress, keyframesRef.current));
    } else {
      fi = Math.floor(rawProgress * TOTAL_FRAMES);
    }
    fi = Math.max(0, Math.min(TOTAL_FRAMES - 1, fi));

    targetFrameRef.current = fi;
  }, []);

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      drawFrame(drawnFrameRef.current >= 0 ? drawnFrameRef.current : 0);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawFrame]);

  // Frame loading with directional priority
  useEffect(() => {
    let cancelled = false;

    const loadFrame = async (index: number): Promise<void> => {
      if (cancelled || framesRef.current[index]) return;

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
          if (cancelled) {
            resolve();
            return;
          }
          try {
            const bitmap = await createImageBitmap(img);
            framesRef.current[index] = bitmap;
          } catch {
            framesRef.current[index] = img;
          }
          loadedCountRef.current++;
          setLoadProgress(loadedCountRef.current / TOTAL_FRAMES);

          // Draw immediately if this is the frame we need right now
          if (index === Math.round(displayFrameRef.current)) {
            drawFrame(index);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = getFramePath(index);
      });
    };

    const loadAll = async () => {
      // Phase 1: Load first 10 frames for instant display
      for (let i = 0; i < Math.min(10, TOTAL_FRAMES); i++) {
        if (cancelled) return;
        await loadFrame(i);
      }

      // Phase 2: Load keyframes (every 24th frame = 1 per second)
      // This gives a rough version of the whole video fast
      for (let i = 0; i < TOTAL_FRAMES; i += 24) {
        if (cancelled) return;
        await loadFrame(i);
      }

      // Phase 3: Fill in remaining frames in batches
      const batchSize = 15;
      for (let i = 0; i < TOTAL_FRAMES; i += batchSize) {
        if (cancelled) break;
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, TOTAL_FRAMES); j++) {
          batch.push(loadFrame(j));
        }
        await Promise.all(batch);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
      framesRef.current.forEach((frame) => {
        if (frame instanceof ImageBitmap) {
          frame.close();
        }
      });
    };
  }, [drawFrame, getFramePath]);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${SCROLL_HEIGHT_VH}vh` }}
    >
      <div className="sticky top-0 h-screen w-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ background: "#08090A" }}
        />

        {/* Loading indicator */}
        {loadProgress < 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="w-32 h-px bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/30 transition-[width] duration-300 ease-out"
                style={{ width: `${loadProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {typeof children === "function"
          ? (
              children as (
                progress: number,
                frame: number
              ) => React.ReactNode
            )(progress, frameIndex)
          : children}
      </div>
    </div>
  );
}
