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
import FramerVideoPlayer from "@/components/FramerVideoPlayer";
import LogoPreloader from "@/components/LogoPreloader";

interface SecondaryVideoBlockProps {
  vid: { url: string; title: string; duration?: string; poster?: string; description?: string };
  sIdx: number;
  isMuted: boolean;
  onMuteChange: (m: boolean) => void;
  onPlay: () => void;
  onPause: () => void;
  onReady?: () => void;
  videoRefCallback: (node: HTMLVideoElement | null) => void;
}

function SecondaryVideoBlock({
  vid,
  sIdx,
  isMuted,
  onMuteChange,
  onPlay,
  onPause,
  onReady,
  videoRefCallback,
}: SecondaryVideoBlockProps) {
  const posterUrl = vid.poster ? resolveMediaUrl(vid.poster) : undefined;

  return (
    <div className="w-full flex flex-col items-start gap-3 animate-cinema-fade">
      {vid.title && (
        <div className="w-full flex items-center justify-start gap-2 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <h4 className="text-sm sm:text-base font-mono text-white/80 uppercase tracking-widest">
            {vid.title}
          </h4>
        </div>
      )}
      <FramerVideoPlayer
        ref={videoRefCallback}
        src={vid.url}
        poster={posterUrl}
        autoPlay={false}
        muted={isMuted}
        loop={true}
        cornerRadius={14}
        progressColor="#ffffff"
        onReady={onReady}
        onPlayStateChange={(playing) => {
          if (playing) {
            onPlay();
          } else {
            onPause();
          }
        }}
        onMuteStateChange={onMuteChange}
      />
      {vid.description && (
        <p className="w-full text-sm sm:text-base text-white/55 font-light leading-relaxed tracking-wide text-left px-1">
          {vid.description}
        </p>
      )}
    </div>
  );
}

/** Resolve a title field that can be either a plain string or a localized { en, it } object */
function getTitle(title: string | { en?: string; it?: string } | undefined): string {
  if (!title) return "";
  if (typeof title === "string") return title;
  return title.en || title.it || "";
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
    const list: { url: string; title: string; duration?: string; poster?: string; description?: string }[] = [];
    if (Array.isArray(project?.videos) && project.videos.length > 0) {
      project.videos.forEach((v, idx) => {
        if (typeof v === "string" && (v as string).trim()) {
          list.push({
            url: (v as string).trim(),
            title: `Film 0${idx + 1}`,
            poster: undefined, // Automatically captures a frame of the video
          });
        } else if (v && typeof v === "object" && v.url?.trim()) {
          const explicitPoster =
            (v as any).posterImage ||
            (v as any).coverImage ||
            (v as any).poster ||
            (v as any).cover;

          list.push({
            url: v.url.trim(),
            title: v.title?.trim() || `Film 0${idx + 1}`,
            duration: v.duration?.trim(),
            poster: explicitPoster?.trim() || undefined, // Extracted frame if no explicit cover
            description: v.description?.trim() || undefined,
          });
        }
      });
    }
    if (list.length === 0 && project && (project.fullVideoUrl || project.videoPreviewUrl)) {
      list.push({
        url: project.fullVideoUrl || project.videoPreviewUrl,
        title: "Main Film",
        duration: project.duration,
        poster: project.posterImage,
      });
    }
    return list;
  }, [project]);

  const primaryVideo = allVideos[0];
  const secondaryVideos = useMemo(() => allVideos.slice(1), [allVideos]);

  const secondaryVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const currentActiveVideoRef = useRef<number | null>(null);
  const manuallyPausedIndexRef = useRef<number | null>(null);

  const handleMainPlay = useCallback(() => {
    manuallyPausedIndexRef.current = null;
    currentActiveVideoRef.current = 0;
    // Pause all secondary videos so there is no simultaneous playback
    secondaryVideoRefs.current.forEach((v) => {
      if (v && !v.paused) v.pause();
    });
  }, []);

  const handleMainPause = useCallback(() => {
    if (currentActiveVideoRef.current === 0) {
      manuallyPausedIndexRef.current = 0;
    }
  }, []);

  const handleSecondaryPlay = useCallback((sIdx: number) => {
    manuallyPausedIndexRef.current = null;
    currentActiveVideoRef.current = sIdx + 1;
    // Pause main top video
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    // Pause any other secondary video
    secondaryVideoRefs.current.forEach((v, idx) => {
      if (idx !== sIdx && v && !v.paused) {
        v.pause();
      }
    });
  }, []);

  const handleSecondaryPause = useCallback((sIdx: number) => {
    if (currentActiveVideoRef.current === sIdx + 1) {
      manuallyPausedIndexRef.current = sIdx + 1;
    }
  }, []);

  const activeVideoPoster = primaryVideo?.poster || project?.posterImage;

  const [isMuted, setIsMuted] = useState(false);
  const [selectedStill, setSelectedStill] = useState<string | null>(null);
  const [isScrolledToStills, setIsScrolledToStills] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
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
  }, [projectId]);

  // Reset states when navigating to another project
  useEffect(() => {
    setIsProjectMediaReady(false);
    setIsVertical(false);
    setVideoAspectRatio(null);
    secondaryVideoRefs.current = [];
    currentActiveVideoRef.current = null;
    manuallyPausedIndexRef.current = null;
  }, [projectId]);

  // Detect duration for main video
  useEffect(() => {
    let isCancelled = false;
    if (primaryVideo?.duration) {
      setDetectedDuration(primaryVideo.duration);
    } else if (primaryVideo?.url) {
      detectVideoDuration(primaryVideo.url).then((dur) => {
        if (!isCancelled && dur) setDetectedDuration(dur);
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [primaryVideo]);

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

  // Volume factor based purely on distance to "stills & frames"
  const getStillsFadeVolume = useCallback((): number => {
    if (typeof window === "undefined") return 1;
    const vh = window.innerHeight;

    if (stillsRef.current) {
      const stillsRect = stillsRef.current.getBoundingClientRect();
      // When stills section approaches the bottom of the viewport (110% of vh),
      // begin fading out smoothly until it reaches 35% of vh (where stills title and top frames are in view)
      const fadeStart = vh * 1.1;
      const fadeEnd = vh * 0.35;

      if (stillsRect.top <= fadeEnd) {
        return 0;
      } else if (stillsRect.top < fadeStart) {
        return Math.max(0, Math.min(1, (stillsRect.top - fadeEnd) / (fadeStart - fadeEnd)));
      }
    }

    return 1;
  }, []);

  const applyAudioFade = useCallback(() => {
    const stillsVol = isMutedRef.current ? 0 : getStillsFadeVolume();

    // 1. Primary video: fades when scrolling down towards stills & frames, or if it scrolls off the top
    if (videoRef.current) {
      if (isMutedRef.current) {
        if (!videoRef.current.muted) videoRef.current.muted = true;
        if (videoRef.current.volume !== 0) videoRef.current.volume = 0;
      } else {
        const vh = typeof window !== "undefined" ? window.innerHeight : 800;
        let mainVol = stillsVol;
        const videoRect = videoRef.current.getBoundingClientRect();
        if (videoRect.bottom <= 0) {
          mainVol = 0;
        } else if (videoRect.bottom < vh * 0.45) {
          mainVol = Math.min(mainVol, Math.max(0, videoRect.bottom / (vh * 0.45)));
        }

        const muted = mainVol <= 0.01;
        videoRef.current.muted = muted;
        videoRef.current.volume = muted ? 0 : Math.round(mainVol * 100) / 100;
      }
    }

    // 2. Secondary videos: volume is NOT affected by the primary video position or scrolling up.
    // It reduces ONLY when scrolling towards the "stills & frames" section or scrolling off top.
    secondaryVideoRefs.current.forEach((secVid) => {
      if (!secVid || secVid.paused) return;
      if (isMutedRef.current) {
        if (!secVid.muted) secVid.muted = true;
        if (secVid.volume !== 0) secVid.volume = 0;
        return;
      }

      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      let secVol = stillsVol;
      const secRect = secVid.getBoundingClientRect();
      if (secRect.bottom <= 0) {
        secVol = 0;
      } else if (secRect.bottom < vh * 0.45) {
        secVol = Math.min(secVol, Math.max(0, secRect.bottom / (vh * 0.45)));
      }

      const secMuted = secVol <= 0.01;
      secVid.muted = secMuted;
      secVid.volume = secMuted ? 0 : Math.round(secVol * 100) / 100;
    });
  }, [getStillsFadeVolume]);

  // Viewport autoplay: tracks which video has user viewpoint focus and automatically plays it
  const checkViewportAutoplay = useCallback(() => {
    if (typeof window === "undefined") return;

    const vh = window.innerHeight;
    const viewportCenter = vh / 2;
    // Focal zone in viewport: central 60% of the screen
    const zoneTop = vh * 0.2;
    const zoneBottom = vh * 0.8;
    const minOverlap = Math.min(80, vh * 0.15);

    // Collect all existing video elements with their indexes (0 = primary, 1..N = secondary)
    const videos: { index: number; el: HTMLVideoElement }[] = [];
    if (videoRef.current) {
      videos.push({ index: 0, el: videoRef.current });
    }
    secondaryVideoRefs.current.forEach((el, sIdx) => {
      if (el) {
        videos.push({ index: sIdx + 1, el });
      }
    });

    if (videos.length === 0) return;

    let bestIndex = -1;
    let bestScore = -Infinity;

    videos.forEach(({ index, el }) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= vh) return;

      const overlapTop = Math.max(rect.top, zoneTop);
      const overlapBottom = Math.min(rect.bottom, zoneBottom);
      const overlap = Math.max(0, overlapBottom - overlapTop);

      if (overlap >= minOverlap) {
        const videoCenter = (rect.top + rect.bottom) / 2;
        const distFromCenter = Math.abs(videoCenter - viewportCenter);
        const score = overlap - distFromCenter * 0.3;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
    });

    // If active video focus changed
    if (bestIndex !== currentActiveVideoRef.current) {
      currentActiveVideoRef.current = bestIndex;
      manuallyPausedIndexRef.current = null;

      videos.forEach(({ index, el }) => {
        if (index === bestIndex) {
          // Play the video that moved into focal viewpoint
          if (el.paused) {
            const playPromise = el.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                if (err?.name === "NotAllowedError") {
                  el.muted = true;
                  el.play().catch(() => {});
                }
              });
            }
          }
        } else {
          // Pause any other video not in viewpoint
          if (!el.paused) {
            el.pause();
          }
        }
      });

      applyAudioFade();
    } else if (bestIndex !== -1 && manuallyPausedIndexRef.current !== bestIndex) {
      // Active video should be playing if not manually paused (e.g. after user scroll unlocks playback)
      const activeVid = videos.find((v) => v.index === bestIndex);
      if (activeVid && activeVid.el.paused) {
        const playPromise = activeVid.el.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err?.name === "NotAllowedError") {
              activeVid.el.muted = true;
              activeVid.el.play().catch(() => {});
            }
          });
        }
      }
    }
  }, [applyAudioFade]);

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

    let ticking = false;
    const handleScroll = () => {
      checkBottomOffset();
      checkViewportAutoplay();
      applyAudioFade();
      if (stillsRef.current) {
        const rect = stillsRef.current.getBoundingClientRect();
        setIsScrolledToStills(rect.top < window.innerHeight * 0.75);
      } else {
        setIsScrolledToStills(window.scrollY > 400);
      }
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [applyAudioFade, checkViewportAutoplay]);

  // Pause playback when switching tab or minimizing browser, resume when returning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
        secondaryVideoRefs.current.forEach((v) => {
          if (v && !v.paused) v.pause();
        });
      } else {
        checkViewportAutoplay();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [checkViewportAutoplay]);

  // Cleanup playback on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      secondaryVideoRefs.current.forEach((v) => {
        if (v && !v.paused) v.pause();
      });
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      applyAudioFade();
    }
  }, [projectId, applyAudioFade]);



  if (!project) {
    if (isLoading) {
      return <LogoPreloader minDuration={0.6} maxDuration={1.8} />;
    }
    notFound();
  }

  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-white selection:text-black flex flex-col justify-between select-none">
      <CustomCursor />

      {/* ── 1. Top Cinema Header: Exact same dimensions, padding, typography and layout as homepage projects section ── */}
      <header className="sticky top-0 left-0 right-0 z-50 w-full px-3 sm:px-8 flex flex-col items-center text-center pointer-events-auto select-none hero-header-scrolled pb-2 sm:pb-2.5 bg-black/75 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition-all duration-500 ease-out">
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

        {/* ── SECTION 1: IN PRIMO PIANO IL TITOLO E IL VIDEO ── */}
        <section className="space-y-4 sm:space-y-6 animate-cinema-fade">
          {/* Project Title & Metadata at the top */}
          <div className="w-full transition-all duration-500 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-white/70 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="uppercase font-medium">
                0{currentIndex + 1}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white transition-all duration-500">
              {getTitle(project.title)}
            </h1>

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
          </div>

          {/* Primary video title (version label) — shown at the top of the video player when explicitly set */}
          {primaryVideo?.title && primaryVideo.title !== "Main Film" && (
            <div className="w-full flex items-center justify-start gap-2 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
              <h4 className="text-sm sm:text-base font-mono text-white/80 uppercase tracking-widest">
                {primaryVideo.title}
              </h4>
            </div>
          )}

          {/* Framer Video Player */}
          <div className="w-full flex justify-center">
            <FramerVideoPlayer
              key={primaryVideo?.url || "main-player-video"}
              ref={videoRef}
              src={primaryVideo?.url || project.fullVideoUrl || project.videoPreviewUrl}
              poster={activeVideoPoster}
              autoPlay={true}
              muted={isMuted}
              loop={true}
              cornerRadius={14}
              progressColor="#ffffff"
              onReady={() => {
                setIsProjectMediaReady(true);
                checkViewportAutoplay();
              }}
              onPlayStateChange={(playing) => {
                if (playing) {
                  manuallyPausedIndexRef.current = null;
                  handleMainPlay();
                } else {
                  handleMainPause();
                }
              }}
              onMuteStateChange={(m) => setIsMuted(m)}
              onAspectRatioChange={(vert, ratio) => {
                setIsVertical(vert);
                setVideoAspectRatio(ratio);
              }}
              onTimeUpdate={(_, dur) => {
                if (!detectedDuration && dur && !isNaN(dur) && isFinite(dur)) {
                  const durStr = formatVideoDuration(dur);
                  if (durStr && durStr !== "00:00") {
                    setDetectedDuration(durStr);
                  }
                }
              }}
            />
          </div>

          {/* Primary video description */}
          {primaryVideo?.description && (
            <p className="w-full text-sm sm:text-base text-white/55 font-light leading-relaxed tracking-wide text-left px-1">
              {primaryVideo.description}
            </p>
          )}
        </section>

        {/* ── SECTION 2: VIDEO SECONDARI (Disposti uno sotto l'altro senza scritte né titoli) ── */}
        {secondaryVideos.length > 0 && (
          <section className="space-y-6 sm:space-y-12 pt-6 sm:pt-10 border-t border-white/10 flex flex-col items-start w-full">
            {secondaryVideos.map((vid, sIdx) => (
              <SecondaryVideoBlock
                key={vid.url || sIdx}
                vid={vid}
                sIdx={sIdx}
                isMuted={isMuted}
                onMuteChange={(m) => setIsMuted(m)}
                onPlay={() => handleSecondaryPlay(sIdx)}
                onPause={() => handleSecondaryPause(sIdx)}
                onReady={checkViewportAutoplay}
                videoRefCallback={(el) => {
                  secondaryVideoRefs.current[sIdx] = el;
                }}
              />
            ))}
          </section>
        )}

        {/* ── SECTION 3: SOTTO TUTTE LE FOTO COLLEGATE CON IL VIDEO (Connected Stills) ── */}
        <section ref={stillsRef} className="space-y-4 sm:space-y-6 pt-6 sm:pt-8 border-t border-white/10">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl sm:text-2xl font-light text-white italic tracking-tight lowercase transition-all duration-300">
              stills & frames
            </h3>
          </div>

          {/* Stills Gallery - Due per riga su mobile (grid-cols-2), 3 su desktop (lg:grid-cols-3) */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 w-full">
            {project.stills?.map((still, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedStill(still.url)}
                className="group cursor-pointer relative w-full aspect-[16/10] overflow-hidden rounded-lg sm:rounded-xl bg-[#0c0c0e] shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
              >
                <Image
                  src={resolveMediaUrl(still.url)}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(max-width: 1024px) 50vw, 33vw"
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
            <span className="truncate">{getTitle(prevProject.title)} ]</span>
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
            <span className="truncate">[ next: {getTitle(nextProject.title)}</span>
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
          <div className="text-center sm:text-right text-white/40 uppercase tracking-widest text-[10px] sm:text-xs">
            <span>P.IVA {settings.vatNumber || "18341681007"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
