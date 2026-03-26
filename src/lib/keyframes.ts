export interface Keyframe {
  scroll: number; // 0-1, scroll progress
  frame: number; // 0-1056, target frame
}

const TOTAL_FRAMES = 1057;

// 2500vh total scroll. Every text section gets a real plateau.
// At 2500vh, 1% scroll = 25vh (a quarter viewport). 4% = 100vh (one full viewport).
export const DEFAULT_KEYFRAMES: Keyframe[] = [
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
