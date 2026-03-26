"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { type Keyframe, applyKeyframes } from "@/lib/keyframes";

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
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
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
    const ctx = ctxRef.current;
    if (!ctx) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

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
  const lastProgressRef = useRef(0);
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

    // Only trigger React re-render when progress changes meaningfully
    // and only while ScrollIndicator is still visible (< 3%)
    if (
      Math.abs(rawProgress - lastProgressRef.current) > 0.001 &&
      (rawProgress < 0.03 || lastProgressRef.current < 0.03)
    ) {
      lastProgressRef.current = rawProgress;
      setProgress(rawProgress);
    }

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
      ctxRef.current = canvas.getContext("2d");
      drawFrame(drawnFrameRef.current >= 0 ? drawnFrameRef.current : 0);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawFrame]);

  // Frame loading: viewport-window strategy with memory management
  useEffect(() => {
    let cancelled = false;
    const VIEWPORT_WINDOW = 100; // frames ahead/behind to keep loaded
    const MAX_LOADED = 250; // max frames in memory
    const SKELETON_STEP = 24; // one frame per ~second for skeleton
    const skeletonIndices = new Set<number>();
    const loadedIndices = new Set<number>();

    // Build skeleton frame set (never evicted)
    for (let i = 0; i < TOTAL_FRAMES; i += SKELETON_STEP) {
      skeletonIndices.add(i);
    }
    skeletonIndices.add(TOTAL_FRAMES - 1);

    const loadFrame = async (index: number): Promise<void> => {
      if (cancelled || framesRef.current[index]) {
        if (framesRef.current[index]) loadedIndices.add(index);
        return;
      }

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
          loadedIndices.add(index);
          loadedCountRef.current++;
          setLoadProgress(loadedCountRef.current / TOTAL_FRAMES);

          if (index === Math.round(displayFrameRef.current)) {
            drawFrame(index);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = getFramePath(index);
      });
    };

    // Evict frames that are far from the current position
    const evictDistant = (currentFrame: number) => {
      if (loadedIndices.size <= MAX_LOADED) return;

      const sorted = [...loadedIndices].sort(
        (a, b) => Math.abs(b - currentFrame) - Math.abs(a - currentFrame)
      );

      const toEvict = sorted.slice(0, loadedIndices.size - MAX_LOADED);
      for (const idx of toEvict) {
        // Never evict skeleton frames or bootstrap frames
        if (skeletonIndices.has(idx) || idx < 10) continue;
        const frame = framesRef.current[idx];
        if (frame instanceof ImageBitmap) {
          frame.close();
        }
        framesRef.current[idx] = null;
        loadedIndices.delete(idx);
        loadedCountRef.current--;
      }
    };

    // Load frames in a window around the current position
    const loadViewportWindow = async () => {
      const center = Math.round(targetFrameRef.current);
      const dir = scrollDirectionRef.current;
      const ahead = dir === "down" ? VIEWPORT_WINDOW : Math.round(VIEWPORT_WINDOW * 0.4);
      const behind = dir === "down" ? Math.round(VIEWPORT_WINDOW * 0.4) : VIEWPORT_WINDOW;

      const start = Math.max(0, center - behind);
      const end = Math.min(TOTAL_FRAMES - 1, center + ahead);

      // Load in batches of 20
      const batchSize = 20;
      for (let i = start; i <= end; i += batchSize) {
        if (cancelled) return;
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, end + 1); j++) {
          if (!framesRef.current[j]) {
            batch.push(loadFrame(j));
          }
        }
        if (batch.length > 0) await Promise.all(batch);
      }

      evictDistant(center);
    };

    const bootstrap = async () => {
      // Phase 1: Load first 10 frames in parallel for instant display
      await Promise.all(
        Array.from({ length: Math.min(10, TOTAL_FRAMES) }, (_, i) =>
          loadFrame(i)
        )
      );
      if (cancelled) return;

      // Phase 2: Load skeleton keyframes for full-range fallback
      const skeletonBatch = [...skeletonIndices].filter(
        (i) => !framesRef.current[i]
      );
      const batchSize = 20;
      for (let i = 0; i < skeletonBatch.length; i += batchSize) {
        if (cancelled) return;
        await Promise.all(
          skeletonBatch.slice(i, i + batchSize).map((idx) => loadFrame(idx))
        );
      }
      if (cancelled) return;

      // Phase 3: Load viewport window around current position, then keep updating
      await loadViewportWindow();
    };

    bootstrap();

    // Continuously load frames around viewport as user scrolls
    let lastLoadedCenter = -1;
    const viewportInterval = setInterval(() => {
      if (cancelled) return;
      const center = Math.round(targetFrameRef.current);
      if (Math.abs(center - lastLoadedCenter) > 10) {
        lastLoadedCenter = center;
        loadViewportWindow();
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(viewportInterval);
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
