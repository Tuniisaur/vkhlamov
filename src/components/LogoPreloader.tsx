"use client";

import React, { useState, useEffect, useRef } from "react";

interface LogoPreloaderProps {
  /**
   * Signal indicating whether page media (video, poster) is ready.
   */
  isReady?: boolean;
  /**
   * Minimum display duration in seconds (default 0.15s).
   * Ensures the smooth logo entrance animation completes gracefully.
   */
  minDuration?: number;
  /**
   * Maximum duration in seconds (default 0.6s).
   * Capped at ~0.6 seconds for an ultra-fast cinema entrance.
   */
  maxDuration?: number;
  /**
   * Optional callback when the exit animation finishes and preloader is removed.
   */
  onComplete?: () => void;
}

// Module-level in-memory flag: once the preloader has run in this session/SPA lifecycle,
// client-side navigation will NEVER show or flash it again.
let hasSeenPreloaderInMemory = false;

export default function LogoPreloader({
  isReady = true,
  minDuration = 0.15,
  maxDuration = 0.6,
  onComplete,
}: LogoPreloaderProps) {
  const isAlreadySeen = () => {
    if (hasSeenPreloaderInMemory) return true;
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("valerio_preloader_seen") === "true") {
          hasSeenPreloaderInMemory = true;
          return true;
        }
      } catch {}
    }
    return false;
  };

  const [phase, setPhase] = useState<"init" | "loading" | "logoOut" | "done">(() => {
    if (isAlreadySeen()) {
      return "done";
    }
    return "init";
  });

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [minTimePassed, setMinTimePassed] = useState(false);
  const [maxTimePassed, setMaxTimePassed] = useState(false);

  // 1. Initial trigger: transition from "init" to "loading" exactly once
  useEffect(() => {
    if (phase !== "init") return;
    const t0 = setTimeout(() => {
      setPhase("loading");
    }, 20);
    return () => clearTimeout(t0);
  }, [phase]);

  // 2. Track minimum and maximum display durations (started once on mount)
  useEffect(() => {
    if (phase === "done") return;
    const tMin = setTimeout(() => {
      setMinTimePassed(true);
    }, minDuration * 1000);

    const tMax = setTimeout(() => {
      setMaxTimePassed(true);
    }, maxDuration * 1000);

    return () => {
      clearTimeout(tMin);
      clearTimeout(tMax);
    };
  }, [minDuration, maxDuration, phase === "done"]);

  // 3. Trigger "logoOut" once ready & min time passed, OR max duration elapsed
  useEffect(() => {
    if (phase !== "loading") return;
    if ((minTimePassed && isReady) || maxTimePassed) {
      setPhase("logoOut");
    }
  }, [phase, minTimePassed, isReady, maxTimePassed]);

  // 4. When entering "logoOut", wait for exit animation (300ms) then set "done"
  useEffect(() => {
    if (phase !== "logoOut") return;
    const tDone = setTimeout(() => {
      hasSeenPreloaderInMemory = true;
      try {
        sessionStorage.setItem("valerio_preloader_seen", "true");
      } catch {}
      setPhase("done");
      onCompleteRef.current?.();
    }, 300);
    return () => clearTimeout(tDone);
  }, [phase]);

  // 5. Absolute safety fallback: unconditionally complete after (maxDuration + 0.4) seconds
  useEffect(() => {
    if (phase === "done") return;
    const tSafety = setTimeout(() => {
      hasSeenPreloaderInMemory = true;
      try {
        sessionStorage.setItem("valerio_preloader_seen", "true");
      } catch {}
      setPhase("done");
      onCompleteRef.current?.();
    }, (maxDuration + 0.4) * 1000);
    return () => clearTimeout(tSafety);
  }, [maxDuration, phase === "done"]);

  if (phase === "done") {
    return null;
  }

  // Animation values replicating the Framer LogoPreloader spec:
  let logoTranslateY = 0;
  let logoOpacity = 1;
  let bgOpacity = 1;

  if (phase === "init") {
    logoTranslateY = 50;
    logoOpacity = 0;
    bgOpacity = 1;
  } else if (phase === "loading") {
    logoTranslateY = 0;
    logoOpacity = 1;
    bgOpacity = 1;
  } else if (phase === "logoOut") {
    logoTranslateY = -50;
    logoOpacity = 0;
    bgOpacity = 0;
  }

  const transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
  const bgTransition = "opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
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
