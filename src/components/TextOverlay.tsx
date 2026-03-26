"use client";

interface TextOverlayProps {
  frame: number;
  enter: number;
  exit: number;
  persist?: boolean;
  children: React.ReactNode;
  className?: string;
  position?: "center" | "left" | "right" | "bottom-center" | "center-low";
}

export default function TextOverlay({
  frame,
  enter,
  exit,
  persist = false,
  children,
  className = "",
  position = "center",
}: TextOverlayProps) {
  const fadeFrames = 14;

  let opacity = 0;
  let phase: "before" | "entering" | "visible" | "exiting" | "after" = "before";

  if (frame < enter) {
    opacity = 0;
    phase = "before";
  } else if (frame < enter + fadeFrames) {
    opacity = (frame - enter) / fadeFrames;
    phase = "entering";
  } else if (persist) {
    opacity = 1;
    phase = "visible";
  } else if (frame > exit) {
    opacity = 0;
    phase = "after";
  } else if (frame > exit - fadeFrames) {
    opacity = (exit - frame) / fadeFrames;
    phase = "exiting";
  } else {
    opacity = 1;
    phase = "visible";
  }

  if (opacity <= 0) return null;

  // Movement based on position: left/right slide horizontally, center slides vertically
  const travel = 120; // px
  const ease = 1 - opacity;
  let translateX = 0;
  let translateY = 0;

  if (position === "left") {
    translateX = phase === "entering" ? -travel * ease : phase === "exiting" ? -travel * ease * 0.5 : 0;
  } else if (position === "right") {
    translateX = phase === "entering" ? travel * ease : phase === "exiting" ? travel * ease * 0.5 : 0;
  } else if (position === "center-low") {
    translateY = phase === "entering" ? travel * ease : phase === "exiting" ? -travel * 0.5 * ease : 0;
  } else if (position === "center") {
    translateY = phase === "entering" ? travel * 0.5 * ease : phase === "exiting" ? -travel * 0.5 * ease : 0;
  }

  const positionClasses: Record<string, string> = {
    center: "inset-0 flex items-center justify-center text-center",
    left: "inset-0 flex items-center justify-start text-left pl-[8vw]",
    right: "inset-0 flex items-center justify-end text-right pr-[8vw]",
    "bottom-center":
      "inset-x-0 bottom-0 flex items-end justify-center text-center pb-4",
    "center-low":
      "inset-0 flex items-end justify-center text-center pb-[18vh]",
  };

  return (
    <div
      className={`absolute pointer-events-none ${positionClasses[position]} ${className}`}
      style={{
        opacity,
        transform: `translate(${translateX}px, ${translateY}px)`,
        willChange: "transform, opacity",
      }}
    >
      <div className="max-w-3xl px-6">{children}</div>
    </div>
  );
}
