# KnipsL W9001

Proof-of-concept for a scroll-driven product launch page, Apple style. A 3D-rendered camera animation scrubs frame-by-frame as you scroll, with text overlays fading in at key moments.

Built with Next.js, GSAP ScrollTrigger, and an image sequence rendered to canvas.

## What this is

An experiment to learn the scroll-driven video technique — extracting a video into individual frames, preloading them, and mapping scroll position to frame number so the user "controls" playback by scrolling. The product (KnipsL W9001 camera) is fictional.

## Running locally

```bash
npm install
npm run dev
```
