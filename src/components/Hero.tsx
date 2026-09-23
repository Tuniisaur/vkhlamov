"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sound } from "@/utils/audio";
import { Volume2, VolumeX, ArrowDown } from "lucide-react";
import { TRANSLATIONS } from "@/data/translations";

interface HeroProps {
  onOpenReel: () => void;
}

export default function Hero({ onOpenReel }: HeroProps) {
  const t = TRANSLATIONS.en.hero;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Cinema Viewfinder, Focus Peaking & Anamorphic Lens Flare State
  const [isFocusing, setIsFocusing] = useState(false);
  const [flareActive, setFlareActive] = useState(false);
  const [focusDistance, setFocusDistance] = useState("1.8m");
  const [timecode, setTimecode] = useState("01:24:08:14");
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const peakingLayerRef = useRef<HTMLDivElement>(null);

  // SMPTE 24.000 FPS Timecode generator when cinema viewfinder is active
  useEffect(() => {
    if (!isFocusing) return;
    let frames = 14;
    let seconds = 8;
    let minutes = 24;
    const hours = 1;

    const interval = setInterval(() => {
      frames++;
      if (frames >= 24) {
        frames = 0;
        seconds++;
        if (seconds >= 60) {
          seconds = 0;
          minutes++;
        }
      }
      const pad = (n: number) => n.toString().padStart(2, "0");
      setTimecode(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`);
    }, 1000 / 24);

    return () => clearInterval(interval);
  }, [isFocusing]);

  const updateFocusPosition = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!titleContainerRef.current) return;
    const rect = titleContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const ratio = x / rect.width;

    // Cinematic focal distance calculation from close rack to infinity
    let distStr = "";
    if (ratio < 0.2) distStr = "0.9m [MACRO]";
    else if (ratio < 0.45) distStr = "1.5m [T1.3]";
    else if (ratio < 0.7) distStr = "2.8m [T1.3]";
    else if (ratio < 0.88) distStr = "5.0m [T1.3]";
    else distStr = "∞ [INFINITY]";
    setFocusDistance(distStr);

    // Dynamic Focus Peaking mask following the focal plane
    if (peakingLayerRef.current) {
      const mask = `radial-gradient(ellipse 220px 100px at ${x}px ${y}px, black 40%, transparent 100%)`;
      peakingLayerRef.current.style.maskImage = mask;
      peakingLayerRef.current.style.webkitMaskImage = mask;
    }
  };

  const handleFocusEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsFocusing(true);
    setFlareActive(true);
    sound.playBlip(750, 0.02);

    setTimeout(() => {
      setFlareActive(false);
    }, 900);

    updateFocusPosition(e);
  };

  const handleFocusMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateFocusPosition(e);
  };

  const handleFocusLeave = () => {
    setIsFocusing(false);
  };

  useEffect(() => {
    // Autoplay video smoothly on entry
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  }, []);

  const toggleMute = () => {
    sound.playBlip(680, 0.03);
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <section className="relative w-full h-screen min-h-[650px] flex flex-col justify-between pt-28 sm:pt-36 pb-8 sm:pb-12 overflow-hidden bg-black select-none">
      {/* Background Fullscreen Video with Autoplay Muted */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          src="/videos/hero-showreel.webm"
          poster="/images/gt-night-race.jpg"
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`w-full h-full object-cover object-center transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100 scale-100" : "opacity-80 scale-102"
          }`}
        />

        {/* Subtle Cinematic Vignette & Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/30 to-[#050505]/70 pointer-events-none" />
        <div className="absolute inset-0 cinema-grain opacity-30 mix-blend-overlay pointer-events-none" />
      </div>

      {/* Discreet Sound Toggle (Top-right) */}
      <div className="absolute top-24 sm:top-28 right-6 sm:right-12 z-30">
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? t.audioOff : t.audioOn}
          data-cursor="AUDIO"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel hover:border-white/40 font-mono text-[10px] tracking-widest text-neutral-300 hover:text-white transition-all cursor-pointer"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">MUTED</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#e0fe10]" />
              <span className="hidden sm:inline text-[#e0fe10] font-bold">LIVE AUDIO</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Core Content - Pure Minimal Luxury */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 w-full mt-10 sm:mt-16 md:mt-20">
        <div className="max-w-3xl space-y-4 sm:space-y-6">
          {/* Micro Index */}
          <div className="font-mono text-[11px] text-neutral-400 tracking-[0.25em] uppercase">
            [ MOTORSPORT & TRACK CINEMA ]
          </div>

          {/* Monumental Headline with Cinema Viewfinder, Focus Peaking & Anamorphic Flare */}
          <div
            ref={titleContainerRef}
            onMouseEnter={handleFocusEnter}
            onMouseMove={handleFocusMove}
            onMouseLeave={handleFocusLeave}
            onClick={() => sound.playRev()}
            className="group relative inline-block select-none cursor-pointer pt-6 pb-8 px-3 sm:px-4 mb-3 sm:mb-4"
          >
            {/* Viewfinder Corner Framing Brackets (⌜ ⌝ ⌞ ⌟) & Cinema Telemetry */}
            <div
              className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
                isFocusing ? "opacity-100 scale-100" : "opacity-0 scale-98 pointer-events-none"
              }`}
            >
              {/* Top-Left Bracket + REC Indicator & SMPTE Timecode */}
              <div className="absolute top-0 left-0 flex items-start gap-2.5">
                <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-[#e0fe10]" />
                <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-neutral-300">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-rec-blink" />
                  <span className="text-red-500 font-bold">REC</span>
                  <span className="text-neutral-400 font-mono hidden sm:inline">{timecode}</span>
                </div>
              </div>

              {/* Top-Right Bracket + Shutter & Frame Rate */}
              <div className="absolute top-0 right-0 flex items-start gap-2.5">
                <div className="font-mono text-[10px] tracking-wider text-neutral-400 hidden sm:block">
                  24.000 FPS // 180° SHUTTER
                </div>
                <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-[#e0fe10]" />
              </div>

              {/* Bottom-Left Bracket + Camera Sensor Spec */}
              <div className="absolute bottom-0 left-0 flex items-end gap-2.5">
                <div className="w-3.5 h-3.5 border-b-2 border-l-2 border-[#e0fe10]" />
                <div className="font-mono text-[10px] tracking-wider text-neutral-400 hidden sm:block">
                  ARRI RAW // 8K DCI
                </div>
              </div>

              {/* Bottom-Right Bracket + Lens Spec & Dynamic Focal Distance */}
              <div className="absolute bottom-0 right-0 flex items-end gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-[9px] sm:text-[10px] tracking-wider">
                  <span className="text-neutral-400 hidden md:inline">50mm T1.3</span>
                  <span className="text-[#e0fe10] font-semibold">{focusDistance}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#e0fe10]/20 text-[#e0fe10] text-[9px] font-bold">
                    PEAKING
                  </span>
                </div>
                <div className="w-3.5 h-3.5 border-b-2 border-r-2 border-[#e0fe10]" />
              </div>
            </div>

            {/* Base Layer: Monumental Pure White Text */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight uppercase leading-[0.92] text-white">
              {t.titleLine1}
            </h1>

            {/* Cinema Focus Peaking Layer: 100% SOLID Filled Letters with Glow (Zero Internal Segments) */}
            <div
              ref={peakingLayerRef}
              aria-hidden="true"
              className={`absolute inset-0 pointer-events-none transition-opacity duration-150 pt-6 pb-8 px-3 sm:px-4 mb-3 sm:mb-4 ${
                isFocusing ? "opacity-100" : "opacity-0"
              }`}
              style={{
                maskImage: "radial-gradient(ellipse 220px 100px at 50% 50%, black 40%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 220px 100px at 50% 50%, black 40%, transparent 100%)",
              }}
            >
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight uppercase leading-[0.92] text-[#e0fe10] drop-shadow-[0_0_24px_rgba(224,254,16,0.85)]">
                {t.titleLine1}
              </h1>
            </div>

            {/* Soft Cinema Anamorphic Atmosphere (Pure Soft Glow, Zero Slicing Lines) */}
            {flareActive && (
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-700"
              >
                <div className="w-full h-full bg-gradient-to-r from-transparent via-[#e0fe10]/10 to-transparent blur-2xl" />
              </div>
            )}
          </div>

          {/* Concise Narrative */}
          <p className="text-neutral-300 text-sm sm:text-base md:text-lg max-w-xl font-light leading-relaxed pt-1 sm:pt-2">
            {t.tagline}
          </p>

          {/* Minimal Action Link */}
          <div className="pt-2 sm:pt-4">
            <a
              href="#works"
              onClick={() => sound.playRev()}
              data-cursor="WORKS"
              className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-white text-black hover:bg-neutral-200 font-mono text-xs font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-lg"
            >
              <span>{t.btnWorks}</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Minimal Bottom Anchor */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 w-full flex items-center justify-between font-mono text-[10px] text-neutral-400 tracking-widest uppercase">
        <span>MILAN // MONZA // WORLDWIDE</span>
        <span className="hidden sm:inline">2026 RACE SEASON</span>
      </div>
    </section>
  );
}
