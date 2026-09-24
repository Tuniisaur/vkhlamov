"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LOCALIZED_PROJECTS } from "@/data/translations";
import { useSiteData } from "@/context/SiteDataContext";
import CustomCursor from "@/components/CustomCursor";
import InstagramIcon from "@/components/InstagramIcon";
import { Mail, ArrowUp } from "lucide-react";
import { formatVideoDuration, detectVideoDuration } from "@/utils/videoDuration";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import LogoPreloader from "@/components/LogoPreloader";

interface FullscreenDoc extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenVideo extends HTMLVideoElement {
  webkitDisplayingFullscreen?: boolean;
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { projects, settings, isLoading } = useSiteData();
  const currentProjects = projects.length > 0 ? projects : LOCALIZED_PROJECTS;
  const project = currentProjects.find((p) => p.id === projectId);

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

  // Multi-video support: parse all main videos of the project
  const allVideos = useMemo(() => {
    const list: { url: string; title: string; duration?: string }[] = [];
    if (Array.isArray(project?.videos) && project.videos.length > 0) {
      project.videos.forEach((v, idx) => {
        if (typeof v === "string" && (v as string).trim()) {
          list.push({ url: (v as string).trim(), title: `Film 0${idx + 1}` });
        } else if (v && typeof v === "object" && v.url?.trim()) {
          list.push({
            url: v.url.trim(),
            title: v.title?.trim() || `Film 0${idx + 1}`,
            duration: v.duration?.trim(),
          });
        }
      });
    }
    if (list.length === 0 && project && (project.fullVideoUrl || project.videoPreviewUrl)) {
      list.push({
        url: project.fullVideoUrl || project.videoPreviewUrl,
        title: "Main Film",
        duration: project.duration,
      });
    }
    return list;
  }, [project]);

  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const activeVideo = allVideos[selectedVideoIndex] || allVideos[0];

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00:00:00");
  const [selectedStill, setSelectedStill] = useState<string | null>(null);
  const [isScrolledToStills, setIsScrolledToStills] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<string | null>(null);
  const [isProjectMediaReady, setIsProjectMediaReady] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  // Check if video is already ready/cached
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 1) {
      setIsProjectMediaReady(true);
      if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
        setIsVertical(videoRef.current.videoHeight > videoRef.current.videoWidth);
        setVideoAspectRatio(videoRef.current.videoWidth / videoRef.current.videoHeight);
      }
    }
  }, [projectId, selectedVideoIndex]);

  // Reset selected video index and vertical state when navigating to another project
  useEffect(() => {
    setSelectedVideoIndex(0);
    setIsProjectMediaReady(false);
    setIsVertical(false);
    setVideoAspectRatio(null);
  }, [projectId]);

  useEffect(() => {
    setIsVertical(false);
    setVideoAspectRatio(null);
  }, [selectedVideoIndex]);

  // Detect duration for current active video
  useEffect(() => {
    let isCancelled = false;
    if (activeVideo?.duration) {
      setDetectedDuration(activeVideo.duration);
    } else if (activeVideo?.url) {
      detectVideoDuration(activeVideo.url).then((dur) => {
        if (!isCancelled && dur) setDetectedDuration(dur);
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [activeVideo]);

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
  // + Progressive audio fading when scrolling down towards "stills & frames"
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const calculateScrollVolume = useCallback((): number => {
    if (typeof window === "undefined") return 1;
    const vh = window.innerHeight;
    let volume = 1;

    // 1. Calculate proximity to "stills & frames" section
    if (stillsRef.current) {
      const stillsRect = stillsRef.current.getBoundingClientRect();
      // When stills section approaches the bottom of the viewport (110% of vh),
      // begin fading out smoothly until it reaches 35% of vh (where stills title and top frames are in view)
      const fadeStart = vh * 1.1;
      const fadeEnd = vh * 0.35;

      if (stillsRect.top <= fadeEnd) {
        volume = 0;
      } else if (stillsRect.top < fadeStart) {
        const factor = (stillsRect.top - fadeEnd) / (fadeStart - fadeEnd);
        volume = Math.min(volume, factor);
      }
    }

    // 2. Also ensure volume fades out if the video player scrolls off the top of the viewport
    if (videoRef.current) {
      const videoRect = videoRef.current.getBoundingClientRect();
      if (videoRect.bottom <= 0) {
        volume = 0;
      } else if (videoRect.bottom < vh * 0.45) {
        const factor = Math.max(0, videoRect.bottom / (vh * 0.45));
        volume = Math.min(volume, factor);
      }
    }

    return Math.max(0, Math.min(1, volume));
  }, []);

  const applyAudioFade = useCallback(() => {
    if (!videoRef.current) return;
    if (isMutedRef.current) {
      if (!videoRef.current.muted) videoRef.current.muted = true;
      if (videoRef.current.volume !== 0) videoRef.current.volume = 0;
      return;
    }

    const vol = calculateScrollVolume();
    if (vol <= 0.01) {
      videoRef.current.volume = 0;
      videoRef.current.muted = true;
    } else {
      videoRef.current.muted = false;
      videoRef.current.volume = Math.round(vol * 100) / 100;
    }
  }, [calculateScrollVolume]);

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
      applyAudioFade();
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
  }, [applyAudioFade]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          applyAudioFade();
        })
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
                isMutedRef.current = true;
              })
              .catch(() => setIsPlaying(false));
          }
        });
    }
  }, [projectId, selectedVideoIndex, applyAudioFade]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      applyAudioFade();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleSound = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;

    if (nextMuted) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
    } else {
      const vol = calculateScrollVolume();
      if (vol <= 0.01) {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      } else {
        videoRef.current.muted = false;
        videoRef.current.volume = Math.round(vol * 100) / 100;
      }
    }
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

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight, duration } = videoRef.current;
      if (videoWidth && videoHeight) {
        const vertical = videoHeight > videoWidth;
        setIsVertical(vertical);
        setVideoAspectRatio(videoWidth / videoHeight);
      }
      if (duration && !isNaN(duration) && isFinite(duration)) {
        const durStr = formatVideoDuration(duration);
        if (durStr && durStr !== "00:00") {
          setDetectedDuration(durStr);
        }
      }
    }
  };

  const isDocFullscreen = () => {
    if (typeof document === "undefined") return false;
    const doc = document as FullscreenDoc;
    const vid = videoRef.current as FullscreenVideo | null;
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

    const videoEl = videoRef.current as (HTMLVideoElement & {
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    }) | null;

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
    const video = videoRef.current as FullscreenVideo | null;
    if (!video) return;

    if (isDocFullscreen()) {
      // Exit fullscreen
      const doc = document as FullscreenDoc;
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

  if (!project) {
    if (isLoading) {
      return <LogoPreloader minDuration={0.8} maxDuration={2.5} />;
    }
    notFound();
  }

  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-white selection:text-black flex flex-col justify-between select-none">
      {/* Framer Logo Preloader on entering project */}
      <LogoPreloader key={projectId} isReady={isProjectMediaReady} minDuration={0.8} maxDuration={2.5} />

      <CustomCursor />

      {/* ── 1. Top Cinema Header: Exact same dimensions, padding, typography and layout as homepage projects section ── */}
      <header className="sticky top-0 left-0 right-0 z-50 w-full px-3 sm:px-8 flex flex-col items-center text-center pointer-events-auto select-none hero-header-scrolled pb-2 sm:pb-2.5 bg-black/75 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition-all duration-500 ease-out">
        {/* Top Sound Toggle Positioned on the Right without taking vertical flow */}
        <div className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-10 flex items-center">
          <button
            onClick={toggleSound}
            aria-label={isMuted ? "Sound on" : "Sound off"}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[10px] sm:text-xs font-mono tracking-widest text-white/60 hover:text-white hover:italic transition-all duration-300 transform active:scale-95 sm:hover:scale-105 cursor-pointer"
          >
            {isMuted ? "[ sound on ]" : "[ sound off ]"}
          </button>
        </div>

        {/* VALERIY KHLAMOV Title - Identical size to projects section header */}
        <Link
          href="/"
          className="cursor-pointer font-title-custom uppercase text-white leading-none select-none text-center transform transition-all duration-500 ease-out hover:scale-[1.01] px-2 text-lg sm:text-xl md:text-2xl"
        >
          VALERIY KHLAMOV
        </Link>

        {/* ── Menu Directly Underneath the Title: projects, about, contact ── */}
        <nav className="flex items-center justify-center font-light lowercase tracking-wider text-white transition-all duration-500 ease-out mt-1 sm:mt-1.5 gap-4 sm:gap-10 text-[11px] sm:text-sm">
          <Link
            href="/#projects"
            className="py-1.5 px-2 transition-all duration-300 ease-out cursor-pointer transform hover:-translate-y-0.5 italic font-medium underline underline-offset-8 opacity-100 scale-105"
          >
            projects
          </Link>
          <Link
            href="/?tab=about"
            className="py-1.5 px-2 transition-all duration-300 ease-out cursor-pointer transform hover:-translate-y-0.5 opacity-70 hover:opacity-100 hover:italic"
          >
            about
          </Link>
          <Link
            href="/?tab=contact"
            className="py-1.5 px-2 transition-all duration-300 ease-out cursor-pointer transform hover:-translate-y-0.5 opacity-70 hover:opacity-100 hover:italic"
          >
            contact
          </Link>
        </nav>
      </header>

      {/* ── 2. MAIN CONTENT: IN PRIMO PIANO IL VIDEO + SOTTO LE FOTO COLLEGATE ── */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-3 sm:px-6 md:px-8 pt-3 sm:pt-6 pb-12 sm:pb-24 space-y-6 sm:space-y-12">
        
        {/* Back to Projects Navigation Button (outside header) */}
        <div className="flex items-center justify-start pt-1 sm:pt-2">
          <Link
            href="/?tab=projects"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/20 hover:border-white/40 text-white font-mono text-xs tracking-wider transition-all duration-300 transform hover:-translate-x-1 active:scale-95 shadow-sm backdrop-blur-md cursor-pointer group"
            title="Back to projects"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-1 text-sm font-sans leading-none">←</span>
            <span className="font-medium tracking-wide">back to projects</span>
          </Link>
        </div>

        {/* ── SECTION 1: IN PRIMO PIANO IL VIDEO (Widescreen Cinema Player, No Boxes, No Heavy Borders) ── */}
        <section className="space-y-3 sm:space-y-4 animate-cinema-fade">
          {/* Top Bar above Video: Project Index/Title on Left + Multi-video Switcher on Right */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tracking-wider pt-1">
            <div className="flex items-center gap-2 text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="uppercase font-medium">
                0{currentIndex + 1} {"//"} {project.title.en || project.title.it}
              </span>
            </div>

            {/* Multi-video Switcher Tabs (when more than 1 main video exists) */}
            {allVideos.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-white/40 uppercase tracking-widest text-[10px] hidden sm:inline mr-1">
                  {"//"} video ({allVideos.length}):
                </span>
                {allVideos.map((vid, vIdx) => {
                  const isSelected = selectedVideoIndex === vIdx;
                  return (
                    <button
                      key={vIdx}
                      type="button"
                      onClick={() => {
                        setSelectedVideoIndex(vIdx);
                        setIsPlaying(true);
                      }}
                      className={`px-2.5 py-1 rounded-md border font-mono text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "border-white text-white bg-white/10 font-bold shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                          : "border-white/10 text-white/60 hover:text-white hover:border-white/30 bg-black/40"
                      }`}
                    >
                      <span>0{vIdx + 1} // {vid.title}</span>
                      {vid.duration && (
                        <span className="text-[10px] opacity-60 font-normal hidden md:inline">{vid.duration}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`relative mx-auto bg-black overflow-hidden rounded-lg group shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/[0.04] transition-all duration-500 ease-out flex items-center justify-center ${
              isVertical
                ? "aspect-[9/16] w-auto max-h-[calc(100dvh-200px)] sm:max-h-[calc(100dvh-220px)] max-w-[min(100%,480px)]"
                : "w-full aspect-video max-h-[calc(100dvh-200px)] sm:max-h-[calc(100dvh-220px)]"
            }`}
            style={
              isVertical && videoAspectRatio
                ? { aspectRatio: `${videoAspectRatio}` }
                : undefined
            }
          >
            <video
              key={activeVideo?.url || "main-player-video"}
              ref={videoRef}
              src={resolveMediaUrl(activeVideo?.url || project.fullVideoUrl || project.videoPreviewUrl)}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={() => {
                setIsProjectMediaReady(true);
                if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
                  const { videoWidth, videoHeight } = videoRef.current;
                  setIsVertical(videoHeight > videoWidth);
                  setVideoAspectRatio(videoWidth / videoHeight);
                }
              }}
              onCanPlay={() => setIsProjectMediaReady(true)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              className={`w-full h-full cursor-pointer transition-transform duration-700 ease-out group-hover:scale-[1.005] ${
                isVertical ? "object-contain" : "object-cover"
              }`}
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
          <div className={`mx-auto transition-all duration-500 space-y-4 ${isVertical ? "max-w-2xl" : "w-full"}`}>
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm font-mono text-white/50 uppercase tracking-widest transition-colors duration-300">
                <span>{project.year}</span>
                {project.location && (
                  <>
                    <span>•</span>
                    <span className="text-white/80">{project.location}</span>
                  </>
                )}
                {(detectedDuration || project.duration) && (
                  <>
                    <span>•</span>
                    <span>{detectedDuration || project.duration}</span>
                  </>
                )}
              </div>
              {project.subtitle && (project.subtitle.en || project.subtitle.it) && (
                <p className="text-sm sm:text-base text-white/70 font-light tracking-wide pt-1">
                  {project.subtitle.en || project.subtitle.it}
                </p>
              )}

              {/* Multi-video Visual Grid (when more than 1 main video exists) */}
              {allVideos.length > 1 && (
                <div className="pt-6 sm:pt-8 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-white/50">
                    <span>{"//"} tutti i video del film ({allVideos.length})</span>
                    <span className="text-[10px] text-white/30 lowercase hidden sm:inline">
                      seleziona per riprodurre nel player
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {allVideos.map((vid, vIdx) => {
                      const isSelected = selectedVideoIndex === vIdx;
                      return (
                        <div
                          key={vIdx}
                          onClick={() => {
                            setSelectedVideoIndex(vIdx);
                            setIsPlaying(true);
                            videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className={`group cursor-pointer rounded-xl overflow-hidden border p-2.5 bg-[#0c0c0e] transition-all space-y-2 ${
                            isSelected
                              ? "border-white/70 bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                              : "border-white/10 hover:border-white/30 hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
                            <video
                              src={resolveMediaUrl(vid.url)}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-contain pointer-events-none"
                            />
                            <div className="absolute top-1.5 left-1.5 font-mono text-[10px] bg-black/80 px-1.5 py-0.5 rounded text-white/80 border border-white/10">
                              0{vIdx + 1}
                            </div>
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center font-mono text-xs text-white font-bold">
                                [ in riproduzione ]
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono px-0.5">
                            <span className={`truncate font-medium ${isSelected ? "text-white" : "text-white/60 group-hover:text-white"}`}>
                              {vid.title}
                            </span>
                            {vid.duration && (
                              <span className="text-white/40 text-[10px] shrink-0 ml-2">{vid.duration}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
                  src={resolveMediaUrl(still.url)}
                  alt=""
                  fill
                  unoptimized
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
            href="/?tab=projects"
            className="min-h-[44px] px-3 hover:text-white hover:italic transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 text-center text-white/80 hover:text-white font-medium cursor-pointer"
          >
            [ all projects ]
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
              src={resolveMediaUrl(selectedStill)}
              alt="Fullscreen film still"
              fill
              unoptimized
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
