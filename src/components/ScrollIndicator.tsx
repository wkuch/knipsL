"use client";

interface ScrollIndicatorProps {
  progress: number;
}

export default function ScrollIndicator({ progress }: ScrollIndicatorProps) {
  // Fade out after first 2% of scroll
  const opacity = progress < 0.005 ? 1 : Math.max(0, 1 - progress / 0.02);

  if (opacity <= 0) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 pointer-events-none"
      style={{ opacity }}
    >
      <span className="text-text-muted text-xs tracking-[0.3em] uppercase">
        Scroll
      </span>
      <div className="w-px h-8 bg-text-muted/40 animate-pulse" />
    </div>
  );
}
