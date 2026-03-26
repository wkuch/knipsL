"use client";

import SmoothScroll from "@/components/SmoothScroll";
import ScrollVideo from "@/components/ScrollVideo";
import VideoOverlays from "@/components/VideoOverlays";
import KeyframeEditor, { useKeyframes } from "@/components/KeyframeEditor";
import { useCallback, useState } from "react";
import { type Keyframe } from "@/components/KeyframeEditor";

function PageContent() {
  const { keyframes, updateKeyframes } = useKeyframes();
  const [currentScroll, setCurrentScroll] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameOverride, setFrameOverride] = useState<number | null>(null);

  const handleKeyframesChange = useCallback(
    (kf: Keyframe[]) => {
      updateKeyframes(kf);
    },
    [updateKeyframes]
  );

  const handleFrameOverride = useCallback((frame: number | null) => {
    setFrameOverride(frame);
  }, []);

  return (
    <SmoothScroll>
      <main>
        <ScrollVideo keyframes={keyframes} frameOverride={frameOverride}>
          {(progress: number, frame: number) => {
            if (progress !== currentScroll) {
              requestAnimationFrame(() => {
                setCurrentScroll(progress);
                setCurrentFrame(frame);
              });
            }
            return <VideoOverlays progress={progress} frame={frame} />;
          }}
        </ScrollVideo>

        <div className="h-1 bg-bg" />
      </main>

      {process.env.NODE_ENV === "development" && (
        <KeyframeEditor
          currentScroll={currentScroll}
          currentFrame={currentFrame}
          onKeyframesChange={handleKeyframesChange}
          onFrameOverride={handleFrameOverride}
        />
      )}
    </SmoothScroll>
  );
}

export default function Home() {
  return <PageContent />;
}
