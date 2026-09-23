"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LOCALIZED_PROJECTS } from "@/data/translations";
import { useSiteData } from "@/context/SiteDataContext";
import CustomCursor from "@/components/CustomCursor";
import InstagramIcon from "@/components/InstagramIcon";
import { Mail, ArrowUp } from "lucide-react";

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { projects, settings, isLoading } = useSiteData();
  const currentProjects = projects.length > 0 ? projects : LOCALIZED_PROJECTS;
  const project = currentProjects.find((p) => p.id === projectId);

  if (!project) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      );
    }
    notFound();
  }

  // Circular navigation for previous and next films
  const currentIndex = currentProjects.findIndex((p) => p.id === projectId);
  const safeIdx = currentIndex >= 0 ? currentIndex : 0;
  const nextProject = currentProjects[(safeIdx + 1) % currentProjects.length];
  const prevProject = currentProjects[(safeIdx - 1 + currentProjects.length) % currentProjects.length];

  // Video state (audio active by default)
  const videoRef = useRef<HTMLVideoElement>(null);
  const stillsRef = useRef<HTMLElement>(null);
  const switcherRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00:00:00");
  const [selectedStill, setSelectedStill] = useState<string | null>(null);
  const [isScrolledToStills, setIsScrolledToStills] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Always start at the very top of the page when opening or switching projects
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "manual";
        }
      } catch {}

      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });

      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [projectId]);

  // Scroll listener for stills visibility and switcher/footer overlap avoidance
  useEffect(() => {
    const checkBottomOffset = () => {
      const vh = window.innerHeight;
      let offset = 0;

      // 1. Avoid overlapping Section 3 (previous & next switcher)
      if (switcherRef.current) {
        const rect = switcherRef.current.getBoundingClientRect();
        if (rect.top < vh) {
          offset = Math.max(offset, vh - rect.top);
        }
      }

      // 2. Avoid overlapping footer if visible
      if (footerRef.current) {
        const rect = footerRef.current.getBoundingClientRect();
        if (rect.top < vh) {
          offset = Math.max(offset, vh - rect.top);
        }
      }

      setBottomOffset(offset);
    };

    const handleScroll = () => {
      checkBottomOffset();
      if (stillsRef.current) {
        const rect = stillsRef.current.getBoundingClientRect();
        setIsScrolledToStills(rect.top < window.innerHeight * 0.75);
      } else {
        setIsScrolledToStills(window.scrollY > 400);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      videoRef.current.currentTime = 0;
      setIsMuted(false);
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // If browser policy restricts autoplay with audio before direct interaction,
          // fallback to muted playback so playback starts smoothly
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current
              .play()
              .then(() => {
                setIsPlaying(true);
                setIsMuted(true);
              })
              .catch(() => setIsPlaying(false));
          }
        });
    }
  }, [projectId]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleSound = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    videoRef.current.volume = nextMuted ? 0 : 1;
    setIsMuted(nextMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const mins = Math.floor(cur / 60);
    const secs = Math.floor(cur % 60);
    const frames = Math.floor((cur % 1) * 24);
    setCurrentTime(
      `00:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`
    );
  };

  const isDocFullscreen = () => {
    if (typeof document === "undefined") return false;
    const doc = document as any;
    const vid = videoRef.current as any;
    return Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      vid?.webkitDisplayingFullscreen
    );
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = isDocFullscreen();
      setIsFullscreen(isFs);
      if (videoRef.current) {
        // Expose native scrub/pause controls while in fullscreen mode
        videoRef.current.controls = isFs;
      }
    };

    const videoEl = videoRef.current as any;
    const onVideoEnterFs = () => {
      setIsFullscreen(true);
    };
    const onVideoExitFs = () => {
      setIsFullscreen(false);
      if (videoRef.current) {
        videoRef.current.controls = false;
        setIsPlaying(!videoRef.current.paused);
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);

    if (videoEl) {
      videoEl.addEventListener("webkitbeginfullscreen", onVideoEnterFs);
      videoEl.addEventListener("webkitendfullscreen", onVideoExitFs);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
      if (videoEl) {
        videoEl.removeEventListener("webkitbeginfullscreen", onVideoEnterFs);
        videoEl.removeEventListener("webkitendfullscreen", onVideoExitFs);
      }
    };
  }, []);

  const toggleFullscreen = async () => {
    const video = videoRef.current as any;
    if (!video) return;

    if (isDocFullscreen()) {
      // Exit fullscreen
      const doc = document as any;
      if (typeof doc.exitFullscreen === "function") {
        try {
          await doc.exitFullscreen();
          return;
        } catch {}
      }
      if (typeof doc.webkitExitFullscreen === "function") {
        try {
          doc.webkitExitFullscreen();
          return;
        } catch {}
      }
      if (typeof doc.mozCancelFullScreen === "function") {
        try {
          doc.mozCancelFullScreen();
          return;
        } catch {}
      }
      if (typeof doc.msExitFullscreen === "function") {
        try {
          doc.msExitFullscreen();
          return;
        } catch {}
      }
      if (typeof video.webkitExitFullscreen === "function") {
        try {
          video.webkitExitFullscreen();
          return;
        } catch {}
      }
    } else {
      // Enter fullscreen
      const isIOS =
        typeof navigator !== "undefined" &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

      // 1. Prioritize native webkitEnterFullscreen on iOS devices (iPhone, iPad)
      // where element.requestFullscreen is either not supported or throws errors
      if (isIOS && typeof video.webkitEnterFullscreen === "function") {
        try {
          if (video.paused) {
            video.play().catch(() => {});
            setIsPlaying(true);
          }
          video.webkitEnterFullscreen();
          return;
        } catch (e) {
          console.warn("webkitEnterFullscreen failed:", e);
        }
      }

      // 2. Standard Fullscreen API (Android Chrome, Firefox, desktop browsers)
      if (typeof video.requestFullscreen === "function") {
        try {
          await video.requestFullscreen();
          return;
        } catch {
          // If requestFullscreen fails or is rejected, fallback to webkitEnterFullscreen
          if (typeof video.webkitEnterFullscreen === "function") {
            try {
              video.webkitEnterFullscreen();
              return;
            } catch {}
          }
        }
      }

      // 3. Fallbacks for various WebKit/Blink browsers
      if (typeof video.webkitEnterFullscreen === "function") {
        try {
          video.webkitEnterFullscreen();
          return;
        } catch {}
      }

      if (typeof video.webkitRequestFullscreen === "function") {
        try {
          video.webkitRequestFullscreen();
          return;
        } catch {}
      }

      if (typeof video.mozRequestFullScreen === "function") {
        try {
          video.mozRequestFullScreen();
          return;
        } catch {}
      }

      if (typeof video.msRequestFullscreen === "function") {
        try {
          video.msRequestFullscreen();
          return;
        } catch {}
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-white selection:text-black flex flex-col justify-between p-3 sm:p-6 md:p-8 select-none">
      <CustomCursor />

      {/* ── 1. Top Header: VKHLAMOV + Menu Directly Underneath (IDENTICAL TO HOME) ── */}
      <header className="relative z-20 w-full hero-header-top flex flex-col items-center text-center">
        {/* Top Sound Toggle Floating in Top Right Corner */}
        <div className="w-full flex justify-end px-2 sm:px-8 mb-1">
          <button
            onClick={toggleSound}
            className="min-h-[40px] px-2 text-[11px] sm:text-xs font-mono tracking-widest text-white/60 hover:text-white hover:italic transition-all duration-300 transform hover:scale-105 cursor-pointer flex items-center"
          >
            {isMuted ? "[ sound on ]" : "[ sound off ]"}
          </button>
        </div>

        {/* VALERIY KHLAMOV Monumental Title - Clean static typography */}
        <Link
          href="/"
          className="cursor-pointer text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-title-custom uppercase text-white leading-none select-none text-center tracking-tight"
        >
          VALERIY KHLAMOV
        </Link>

        {/* Menu Directly Underneath the Title: projects, about, contact */}
        <nav className="mt-3.5 sm:mt-6 flex items-center justify-center gap-6 sm:gap-14 text-sm sm:text-base md:text-lg font-light lowercase tracking-wider text-white">
          <Link
            href="/#projects"
            className="italic font-medium underline underline-offset-8 opacity-100 transition-all duration-300 transform hover:-translate-y-0.5 scale-105 cursor-pointer min-h-[44px] flex items-center"
          >
            projects
          </Link>
          <Link
            href="/?tab=about"
            className="opacity-70 hover:opacity-100 hover:italic transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer min-h-[44px] flex items-center"
          >
            about
          </Link>
          <Link
            href="/?tab=contact"
            className="opacity-70 hover:opacity-100 hover:italic transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer min-h-[44px] flex items-center"
          >
            contact
          </Link>
        </nav>

        {/* Minimal Sub-navigation / Back link with Slide Motion */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-xs font-mono text-white/50 tracking-wider px-2">
          <Link
            href="/?tab=projects"
            className="min-h-[36px] flex items-center hover:text-white hover:italic transition-all duration-300 transform hover:-translate-x-1"
          >
            [ ← back to projects ]
          </Link>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="text-white/70 uppercase transition-colors duration-300 truncate max-w-full sm:max-w-none text-center">
            0{currentIndex + 1} // {project.title.en || project.title.it}
          </span>
        </div>
      </header>

      {/* ── 2. MAIN CONTENT: IN PRIMO PIANO IL VIDEO + SOTTO LE FOTO COLLEGATE ── */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-6 sm:py-12 space-y-12 sm:space-y-24">
        
        {/* ── SECTION 1: IN PRIMO PIANO IL VIDEO (Widescreen Cinema Player, No Boxes, No Heavy Borders) ── */}
        <section className="space-y-4 sm:space-y-6 animate-cinema-fade">
          <div className="relative w-full aspect-video bg-black overflow-hidden rounded-lg group">
            <video
              ref={videoRef}
              src={project.fullVideoUrl}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              className="w-full h-full object-cover cursor-pointer transition-transform duration-700 ease-out group-hover:scale-[1.005]"
            />

            {/* Subtle Pause Overlay indicator with Smooth Fade */}
            <div
              onClick={togglePlay}
              className={`absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-all duration-500 ease-out backdrop-blur-[2px] ${
                !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
            >
              <span className="text-xs font-mono tracking-widest uppercase text-white/90 italic transform hover:scale-105 transition-transform duration-300">
                [ paused — tap to play ]
              </span>
            </div>
          </div>

          {/* Minimal Controls Row in Monospace Text with Smooth Transitions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 text-xs font-mono text-white/60 pt-1 border-b border-white/10 pb-3 sm:pb-4">
            {/* On Mobile: Row 1 is the video timecode */}
            <div className="sm:hidden flex items-center justify-center">
              <span className="text-white/40 tracking-wider transition-colors duration-300">{currentTime}</span>
            </div>

            {/* Controls Buttons: on mobile Row 2 with pause, sound, fullscreen; on desktop left side */}
            <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 w-full sm:w-auto">
              <div className="flex items-center gap-3 sm:gap-6">
                <button
                  onClick={togglePlay}
                  className="min-h-[36px] px-1 flex items-center hover:text-white hover:italic transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                  {isPlaying ? "[ pause ]" : "[ play ]"}
                </button>
                <button
                  onClick={toggleSound}
                  className="min-h-[36px] px-1 flex items-center hover:text-white hover:italic transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                  {isMuted ? "[ sound on ]" : "[ sound off ]"}
                </button>
                {/* On Desktop: timecode is inline */}
                <span className="hidden sm:inline text-white/40 tracking-wider transition-colors duration-300">{currentTime}</span>
              </div>

              {/* Mobile Fullscreen Button (Row 2 right) */}
              <div className="flex items-center sm:hidden">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  className="min-h-[44px] px-2 flex items-center hover:text-white hover:italic transition-all duration-300 transform active:scale-95 cursor-pointer touch-manipulation select-none"
                >
                  {isFullscreen ? "[ exit fullscreen ]" : "[ fullscreen ]"}
                </button>
              </div>
            </div>

            {/* Desktop Fullscreen Button */}
            <div className="hidden sm:flex items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="min-h-[36px] px-1 flex items-center hover:text-white hover:italic transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isFullscreen ? "[ exit fullscreen ]" : "[ fullscreen ]"}
              </button>
            </div>
          </div>

          {/* Minimal Editorial Details (Zero Cards, Pure Typography) */}
          <div className="pt-2 sm:pt-4 max-w-4xl space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white transition-all duration-500">
              {project.title.en || project.title.it}
            </h2>
            <p className="text-xs sm:text-sm font-mono text-white/50 uppercase tracking-widest transition-colors duration-300">
              {project.year} &nbsp;•&nbsp; {project.categoryLabel.en || project.categoryLabel.it}
            </p>
          </div>
        </section>

        {/* ── SECTION 2: SOTTO TUTTE LE FOTO COLLEGATE CON IL VIDEO (Connected Stills) ── */}
        <section ref={stillsRef} className="space-y-4 sm:space-y-6 pt-6 sm:pt-8 border-t border-white/10">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl sm:text-2xl font-light text-white italic tracking-tight lowercase transition-all duration-300">
              stills & frames
            </h3>
          </div>

          {/* Stills Gallery - Griglia responsive, pure foto senza titoli né sottotitoli */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 w-full">
            {project.stills?.map((still, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedStill(still.url)}
                className="group cursor-pointer relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-[#0c0c0e] shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
              >
                <Image
                  src={still.url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-95 group-hover:opacity-100 group-hover:scale-[1.04]"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: SWITCHER FILM PRECEDENTE / SUCCESSIVO CON TRANSIZIONI (Responsive layout on mobile) ── */}
        <section ref={switcherRef} className="pt-8 sm:pt-12 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm font-mono tracking-wider text-white/60">
          <Link
            href={`/project/${prevProject.id}`}
            scroll={true}
            className="min-h-[44px] hover:text-white hover:italic transition-all duration-300 transform sm:hover:-translate-x-2 flex items-center gap-2 group cursor-pointer"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-1 shrink-0">[ ← prev:</span>
            <span className="truncate">{prevProject.title.en || prevProject.title.it} ]</span>
          </Link>

          <Link
            href={`/project/${nextProject.id}`}
            scroll={true}
            className="min-h-[44px] hover:text-white hover:italic transition-all duration-300 transform sm:hover:translate-x-2 flex items-center justify-end gap-2 group cursor-pointer self-end sm:self-auto text-right"
          >
            <span className="truncate">[ next: {nextProject.title.en || nextProject.title.it}</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1 shrink-0">→ ]</span>
          </Link>
        </section>
      </main>

      {/* ── 3. Lightbox Fullscreen per Immagine Singola con Dissolvenza Fluida ── */}
      {selectedStill && (
        <div
          onClick={() => setSelectedStill(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 safe-top safe-bottom cursor-pointer animate-cinema-fade"
        >
          <div className="w-full flex justify-end">
            <button
              onClick={() => setSelectedStill(null)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-end text-xs font-mono tracking-widest text-white/60 hover:text-white hover:italic transition-all duration-300 transform hover:scale-110 cursor-pointer"
            >
              [ close × ]
            </button>
          </div>

          <div className="relative w-full max-w-5xl max-h-[80vh] aspect-[16/10] mx-auto overflow-hidden">
            <Image
              src={selectedStill}
              alt="Fullscreen film still"
              fill
              className="object-contain transition-transform duration-500 ease-out transform scale-100 hover:scale-[1.01]"
            />
          </div>

          <div className="text-center text-xs font-mono text-white/40 tracking-wider transition-opacity duration-300 py-2">
            [ tap anywhere to exit ]
          </div>
        </div>
      )}

      {/* ── FLOATING RETURN TO TOP BUTTON (NEVER OVERLAPS SWITCHER OR FOOTER & SAFE AREA AWARE) ── */}
      <button
        onClick={scrollToTop}
        aria-label="Torna in cima"
        title="Torna all'inizio"
        style={{
          bottom: bottomOffset > 0 ? `calc(${bottomOffset + 18}px + env(safe-area-inset-bottom, 0px))` : undefined,
        }}
        className={`fixed right-4 sm:right-8 z-40 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-full bg-black/85 hover:bg-black text-white/70 hover:text-white border border-white/20 hover:border-white/50 backdrop-blur-md font-mono text-[10px] sm:text-xs tracking-widest uppercase transition-[opacity,transform,background-color,border-color,color] duration-300 shadow-2xl hover:scale-105 active:scale-95 cursor-pointer group ${
          bottomOffset === 0 ? "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-8" : ""
        } ${
          isScrolledToStills
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
        <span>top</span>
      </button>

      {/* ── 4. FOOTER: IDENTICO ALLA HOMEPAGE (Instagram al centro in basso con micro-transizioni) ── */}
      <footer ref={footerRef} className="relative z-20 w-full pt-10 sm:pt-12 pb-6 px-4 sm:px-8 safe-bottom flex flex-col items-center">
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 items-center gap-3 sm:gap-4 text-xs font-mono text-white/50 tracking-wider">
          <div className="text-center sm:text-left transition-colors duration-300">
            <Link
              href="/legal"
              className="hover:text-white hover:underline underline-offset-4 transition-all duration-300 cursor-pointer inline-block"
              title="Legal Notice, Privacy & Copyright"
            >
              © {new Date().getFullYear()} VALERIY KHLAMOV
            </Link>
          </div>
          <div className="text-center flex items-center justify-center flex-wrap gap-4 sm:gap-6">
            {(settings.footerLinks && settings.footerLinks.length > 0
              ? settings.footerLinks
              : [{ id: "instagram", label: "Instagram ↗", url: "https://instagram.com/vkhlamov" }]
            ).map((link) => {
              const isInstagram =
                link.id?.toLowerCase().includes("instagram") ||
                link.url?.toLowerCase().includes("instagram") ||
                link.label?.toLowerCase().includes("instagram");

              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={isInstagram ? "Instagram" : link.label}
                  title={isInstagram ? "Instagram" : link.label}
                  className="hover:text-white transition-all duration-300 transform hover:-translate-y-0.5 inline-flex items-center justify-center min-h-[44px] min-w-[44px]"
                >
                  {isInstagram ? (
                    <InstagramIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform duration-300 hover:scale-110" />
                  ) : (
                    <span className="hover:italic">{link.label}</span>
                  )}
                </a>
              );
            })}

            {/* Email Icon */}
            <a
              href={`mailto:${settings.contactEmail || "valerio@vkhlamov.com"}`}
              aria-label="Email"
              title={settings.contactEmail || "valerio@vkhlamov.com"}
              className="hover:text-white transition-all duration-300 transform hover:-translate-y-0.5 inline-flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              <Mail className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform duration-300 hover:scale-110" />
            </a>
          </div>
          <div className="text-center sm:text-right" />
        </div>
      </footer>
    </div>
  );
}
