"use client";

import React, { useState, useEffect } from "react";

interface LogoPreloaderProps {
  /**
   * Signal indicating whether page media (video, poster) is ready.
   */
  isReady?: boolean;
  /**
   * Minimum display duration in seconds (default 0.8s).
   * Ensures the smooth logo entrance animation completes gracefully.
   */
  minDuration?: number;
  /**
   * Maximum duration in seconds (default 2.5s).
   * Capped at 2-3 seconds as requested.
   */
  maxDuration?: number;
  /**
   * Optional callback when the exit animation finishes and preloader is removed.
   */
  onComplete?: () => void;
}

export default function LogoPreloader({
  isReady = true,
  minDuration = 0.8,
  maxDuration = 2.5,
  onComplete,
}: LogoPreloaderProps) {
  const [phase, setPhase] = useState<"init" | "loading" | "logoOut" | "done">("init");
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [maxTimePassed, setMaxTimePassed] = useState(false);

  // 1. Initial trigger: transition from "init" to "loading"
  useEffect(() => {
    const t0 = setTimeout(() => {
      setPhase("loading");
    }, 40);
    return () => clearTimeout(t0);
  }, []);

  // 2. Track minimum display duration
  useEffect(() => {
    const tMin = setTimeout(() => {
      setMinTimePassed(true);
    }, minDuration * 1000);
    return () => clearTimeout(tMin);
  }, [minDuration]);

  // 3. Track maximum safety duration (max 2-3s)
  useEffect(() => {
    const tMax = setTimeout(() => {
      setMaxTimePassed(true);
    }, maxDuration * 1000);
    return () => clearTimeout(tMax);
  }, [maxDuration]);

  // 4. Trigger "logoOut" once video is ready (after minimum entrance) OR when max duration (2-3s) is reached
  useEffect(() => {
    if (phase === "loading" && ((minTimePassed && isReady) || maxTimePassed)) {
      setPhase("logoOut");
      const tDone = setTimeout(() => {
        setPhase("done");
        onComplete?.();
      }, 750);
      return () => clearTimeout(tDone);
    }
  }, [phase, minTimePassed, isReady, maxTimePassed, onComplete]);

  if (phase === "done") {
    return null;
  }

  // Animation values replicating the Framer LogoPreloader spec:
  // cubic-bezier(.7, .2, .2, 1), 0.7s duration
  let logoTranslateY = 0;
  let logoOpacity = 1;
  let bgOpacity = 1;

  if (phase === "init") {
    logoTranslateY = 70;
    logoOpacity = 0;
    bgOpacity = 1;
  } else if (phase === "loading") {
    logoTranslateY = 0;
    logoOpacity = 1;
    bgOpacity = 1;
  } else if (phase === "logoOut") {
    logoTranslateY = -70;
    logoOpacity = 0;
    bgOpacity = 0;
  }

  const transition = "transform 0.7s cubic-bezier(0.7, 0.2, 0.2, 1), opacity 0.7s cubic-bezier(0.7, 0.2, 0.2, 1)";
  const bgTransition = "opacity 0.7s cubic-bezier(0.7, 0.2, 0.2, 1)";

  return (
    <div
      role="status"
      aria-label="Caricamento in corso"
      style={{
        opacity: bgOpacity,
        transition: bgTransition,
      }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#050505] pointer-events-auto select-none overflow-hidden"
    >
      <div
        style={{
          transform: `translateY(${logoTranslateY}px)`,
          opacity: logoOpacity,
          transition,
          willChange: "transform, opacity",
        }}
        className="flex flex-col items-center justify-center px-4 text-center"
      >
        {/* VK Monogram Logo */}
        <h1 className="font-title-custom uppercase text-white tracking-[0.16em] text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-none select-none">
          VK
        </h1>
      </div>
    </div>
  );
}
