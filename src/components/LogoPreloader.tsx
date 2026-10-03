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

// Module-level in-memory flag: once the preloader has run in this SPA lifecycle,
// client-side navigation won't re-flash it unnecessarily.
let hasSeenPreloaderInMemory = false;

export default function LogoPreloader({
  isReady = true,
  minDuration = 0.7,
  maxDuration = 2.0,
  onComplete,
}: LogoPreloaderProps) {
  const [phase, setPhase] = useState<"init" | "loading" | "logoOut" | "done">(() => {
    // Clear any legacy sessionStorage flag that permanently blocked the preloader in the user's browser
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("valerio_preloader_seen");
      } catch {}
    }
    if (hasSeenPreloaderInMemory) {
      return "done";
    }
    return "init";
  });

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [minTimePassed, setMinTimePassed] = useState(false);
  const [maxTimePassed, setMaxTimePassed] = useState(false);

  // 1. Initial trigger: transition from "init" to "loading"
  useEffect(() => {
    if (phase !== "init") return;
    const t0 = setTimeout(() => {
      setPhase("loading");
    }, 40);
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

  // 4. When entering "logoOut", wait for exit animation (750ms) then set "done"
  useEffect(() => {
    if (phase !== "logoOut") return;
    const tDone = setTimeout(() => {
      hasSeenPreloaderInMemory = true;
      setPhase("done");
      onCompleteRef.current?.();
    }, 750);
    return () => clearTimeout(tDone);
  }, [phase]);

  // 5. Absolute safety fallback: ensure logoOut is triggered rather than skipping exit animation
  useEffect(() => {
    if (phase === "done" || phase === "logoOut") return;
    const tSafety = setTimeout(() => {
      setPhase("logoOut");
    }, (maxDuration + 0.5) * 1000);
    return () => clearTimeout(tSafety);
  }, [maxDuration, phase]);

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
  const isInteractive = phase === "init" || phase === "loading";

  return (
    <div
      role="status"
      aria-label="Caricamento in corso"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none overflow-hidden ${
        isInteractive ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Dark Cinema Backdrop (fades smoothly to reveal page behind) */}
      <div
        style={{
          opacity: bgOpacity,
          transition: bgTransition,
        }}
        className="absolute inset-0 bg-[#050505]"
      />

      {/* Floating VK Monogram (glides upwards and fades with independent opacity) */}
      <div
        style={{
          transform: `translateY(${logoTranslateY}px)`,
          opacity: logoOpacity,
          transition,
          willChange: "transform, opacity",
        }}
        className="relative z-10 flex flex-col items-center justify-center px-4 text-center"
      >
        {/* VK Monogram SVG Logo (logo.svg) */}
        <svg
          viewBox="447.9 339.94 1028.37 400.12"
          className="h-9 sm:h-[60px] md:h-[72px] lg:h-[96px] w-auto select-none pointer-events-none drop-shadow-sm"
          fill="#ffffff"
          aria-hidden="true"
        >
          <g>
            <path d="M621.32,339.94v186.45l229.34-186.45h246.19l-491.68,400.11h-157.27v-400.11h173.42Z" />
            <polygon points="1476.27 339.94 1242.79 339.94 1009.8 529.55 1009.8 451.94 839.04 590.94 839.04 668.51 839.04 740.06 983.81 740.06 1009.8 719.01 1119.1 630.5 1207.48 740.06 1436.94 740.06 1246.85 526.4 1476.27 339.94" />
          </g>
        </svg>
      </div>
    </div>
  );
}
