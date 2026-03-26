"use client";

import TextOverlay from "./TextOverlay";
import ScrollIndicator from "./ScrollIndicator";

/*
 * Scene map (24fps, 1057 frames total)
 *
 * A: Black intro        f0-24      (sec 0-1)
 * B: Viewfinder POV     f48-120    (sec 2-5)
 * C: Dark reveal        f144-264   (sec 6-11)
 * D: Lens exploded      f288-384   (sec 12-16)
 * E: LCD / rear         f408-432   (sec 17-18)
 * F: Black transition   f432-456   (sec 18-19)
 * G: Body detail        f456-648   (sec 19-27)
 * H: Flash / LED        f672-696   (sec 28-29)
 * I: Bottom plate       f720-792   (sec 30-33)
 * J: Exploded view      f816-888   (sec 34-37)
 * K: Hero shot          f912-1056  (sec 38-44)
 */

interface VideoOverlaysProps {
  progress: number;
  frame: number;
}

export default function VideoOverlays({ progress, frame }: VideoOverlaysProps) {
  return (
    <>
      {/* A: Scroll indicator on black */}
      <ScrollIndicator progress={progress} />

      {/* B: Viewfinder POV */}
      <TextOverlay
        frame={frame}
        enter={48}
        exit={110}
        position="center"
      >
        <p className="text-xl md:text-2xl font-light tracking-wide text-white/90">
          See what it sees.
        </p>
      </TextOverlay>

      {/* C: Dark reveal - W9001 fades/moves out to the left by f241 */}
      <TextOverlay
        frame={frame}
        enter={160}
        exit={241}
        position="left"
      >
        <div>
          <h1 className="text-[clamp(4rem,12vw,10rem)] font-bold tracking-[-0.04em] leading-none text-white">
            W9001
          </h1>
          <p className="mt-4 text-lg md:text-xl text-text-muted tracking-wide">
            Full-frame. 61 megapixels. Made by hand.
          </p>
        </div>
      </TextOverlay>

      {/* D: Lens exploded - centered, no 9-blade text */}
      <TextOverlay
        frame={frame}
        enter={307}
        exit={370}
        position="center"
      >
        <p className="text-lg md:text-2xl font-medium tracking-wide text-white">
          14 elements. 9 groups. f/1.2.
        </p>
      </TextOverlay>

      {/* E: LCD / rear view - center-low, slides in from below */}
      <TextOverlay
        frame={frame}
        enter={383}
        exit={415}
        position="center-low"
      >
        <p className="text-lg md:text-2xl font-medium tracking-wide text-white">
          3.2&quot; OLED. 2.1M dots. Shoot in RAW.
        </p>
      </TextOverlay>

      {/* F: Black transition - lingers longer */}
      <TextOverlay
        frame={frame}
        enter={440}
        exit={470}
        position="center"
      >
        <p className="text-xl md:text-3xl font-light tracking-wide text-text-muted italic">
          Now look closer.
        </p>
      </TextOverlay>

      {/* G: Body detail - more breathing room on each */}
      <TextOverlay
        frame={frame}
        enter={475}
        exit={535}
        position="left"
      >
        <p className="text-lg md:text-2xl font-medium tracking-wide text-white">
          Magnesium alloy chassis. 412 grams.
        </p>
      </TextOverlay>

      <TextOverlay
        frame={frame}
        enter={545}
        exit={615}
        position="left"
      >
        <p className="text-lg md:text-2xl font-medium tracking-wide text-white">
          Mechanical dials. No menus. No lag.
        </p>
      </TextOverlay>

      <TextOverlay
        frame={frame}
        enter={620}
        exit={665}
        position="left"
      >
        <p className="text-lg md:text-2xl font-medium tracking-wide text-white">
          Weather-sealed to &minus;10&deg;C.
        </p>
      </TextOverlay>

      {/* H: Flash / LED - lingers */}
      <TextOverlay
        frame={frame}
        enter={672}
        exit={710}
        position="right"
      >
        <p className="text-lg md:text-2xl font-medium tracking-wide text-white">
          Integrated LED array. 800 lumens.
        </p>
      </TextOverlay>

      {/* I: Bottom plate - lingers around f739 */}
      <TextOverlay
        frame={frame}
        enter={725}
        exit={790}
        position="left"
      >
        <p className="text-lg md:text-2xl font-medium tracking-wide text-white">
          Arca-Swiss compatible. Dual card slots.
        </p>
      </TextOverlay>

      {/* J: Full exploded view - bigger text, lingers around f834 */}
      <TextOverlay
        frame={frame}
        enter={820}
        exit={895}
        position="center"
      >
        <p className="text-3xl md:text-5xl font-bold tracking-tight text-white">
          147 components. Zero compromises.
        </p>
      </TextOverlay>

      {/* K: Hero shot - CTA (persists once visible) */}
      <TextOverlay
        frame={frame}
        enter={972}
        exit={1056}
        persist
        position="center"
      >
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-[clamp(3rem,8vw,7rem)] font-bold tracking-[-0.04em] leading-none text-white">
            W9001
          </h2>
          <p className="text-lg md:text-xl text-text-muted">
            Pre-order now. Ships Fall 2026.
          </p>
          <a
            href="#reserve"
            className="pointer-events-auto mt-2 inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold tracking-wider uppercase bg-accent text-bg rounded-sm hover:bg-accent/90 transition-colors"
          >
            Reserve yours
          </a>
        </div>
      </TextOverlay>

      {/* Subtle footer - appears with CTA */}
      <TextOverlay
        frame={frame}
        enter={980}
        exit={1056}
        persist
        position="bottom-center"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] text-text-muted/50 tracking-wide">
          <a href="#impressum" className="pointer-events-auto hover:text-text-muted transition-colors">Impressum</a>
          <a href="#datenschutz" className="pointer-events-auto hover:text-text-muted transition-colors">Datenschutz</a>
          <a href="#agb" className="pointer-events-auto hover:text-text-muted transition-colors">AGB</a>
          <span>&copy; 2026 KnipsL GmbH</span>
        </div>
      </TextOverlay>
    </>
  );
}
