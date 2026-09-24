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
  minDuration = 0.1,
  maxDuration = 0.5,
  onComplete,
}: LogoPreloaderProps) {
  const [phase, setPhase] = useState<"init" | "loading" | "logoOut" | "done">(() => {
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("valerio_preloader_seen") === "true") {
          return "done";
        }
      } catch {}
    }
    return "init";
  });
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [maxTimePassed, setMaxTimePassed] = useState(false);

  // 1. Initial trigger: transition from "init" to "loading"
  useEffect(() => {
    if (phase === "done") return;
    const t0 = setTimeout(() => {
      setPhase("loading");
    }, 20);
    return () => clearTimeout(t0);
  }, [phase]);

  // 2. Track minimum display duration
  useEffect(() => {
    if (phase === "done") return;
    const tMin = setTimeout(() => {
      setMinTimePassed(true);
    }, minDuration * 1000);
    return () => clearTimeout(tMin);
  }, [minDuration, phase]);

  // 3. Track maximum safety duration
  useEffect(() => {
    if (phase === "done") return;
    const tMax = setTimeout(() => {
      setMaxTimePassed(true);
    }, maxDuration * 1000);
    return () => clearTimeout(tMax);
  }, [maxDuration, phase]);

  // 4. Trigger "logoOut" once video is ready (after minimum entrance) OR when max duration is reached
  useEffect(() => {
    if (phase === "loading" && ((minTimePassed && isReady) || maxTimePassed)) {
      setPhase("logoOut");
    }
  }, [phase, minTimePassed, isReady, maxTimePassed]);

  // 5. When entering "logoOut", wait for animation (300ms) then set "done"
  useEffect(() => {
    if (phase === "logoOut") {
      const tDone = setTimeout(() => {
        setPhase("done");
        try {
          sessionStorage.setItem("valerio_preloader_seen", "true");
        } catch {}
        onComplete?.();
      }, 300);
      return () => clearTimeout(tDone);
    }
  }, [phase, onComplete]);

  // 6. Absolute safety fallback: unconditionally complete after (maxDuration + 0.5) seconds
  useEffect(() => {
    if (phase === "done") return;
    const tSafety = setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem("valerio_preloader_seen", "true");
      } catch {}
      onComplete?.();
    }, (maxDuration + 0.5) * 1000);
    return () => clearTimeout(tSafety);
  }, [maxDuration, onComplete, phase]);

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

  const transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
  const bgTransition = "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
  const isInteractive = phase === "init" || phase === "loading";

  return (
    <div
      role="status"
      aria-label="Caricamento in corso"
      style={{
        opacity: bgOpacity,
        transition: bgTransition,
      }}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#050505] select-none overflow-hidden transition-opacity ${
        isInteractive ? "pointer-events-auto" : "pointer-events-none"
      }`}
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
