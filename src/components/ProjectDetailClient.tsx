"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LOCALIZED_PROJECTS } from "@/data/translations";
import { useSiteData } from "@/context/SiteDataContext";
import CustomCursor from "@/components/CustomCursor";
import InstagramIcon from "@/components/InstagramIcon";
import { Mail, ArrowUp, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  onFullscreenChange?: (isFs: boolean) => void;
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
  onFullscreenChange,
  onReady,
  videoRefCallback,
}: SecondaryVideoBlockProps) {
  const posterUrl = vid.poster ? resolveMediaUrl(vid.poster) : undefined;
  const [isVertical, setIsVertical] = useState(false);

  return (
    <div className={`w-full flex flex-col gap-3 animate-cinema-fade transition-all duration-500 ${
      isVertical ? "items-center max-w-[420px] sm:max-w-[460px] mx-auto" : "items-start"
    }`}>
      {vid.title && (
        <div className="w-full flex items-center justify-start gap-2 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <h4 className="text-sm sm:text-base font-mono text-white/80 uppercase tracking-widest">
            {vid.title}
          </h4>
        </div>
      )}
      <div className={`w-full flex justify-center ${isVertical ? "max-w-[380px] sm:max-w-[420px] mx-auto" : "w-full"}`}>
        <FramerVideoPlayer
          ref={(el) => {
            videoRefCallback(el);
            if (el) {
              const onBegin = () => onFullscreenChange?.(true);
              const onEnd = () => onFullscreenChange?.(false);
              el.addEventListener("webkitbeginfullscreen", onBegin);
              el.addEventListener("webkitendfullscreen", onEnd);
            }
          }}
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
          onFullscreenChange={onFullscreenChange}
          onAspectRatioChange={(vert) => setIsVertical(vert)}
        />
      </div>
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
  const fullscreenIndexRef = useRef<number | null>(null);
  const applyAudioFadeRef = useRef<() => void>(() => {});

  const handleFullscreenChange = useCallback((index: number, isFs: boolean) => {
    if (isFs) {
      fullscreenIndexRef.current = index;
      currentActiveVideoRef.current = index;
      manuallyPausedIndexRef.current = null;

      if (index === 0) {
        // Main video in fullscreen: ensure all secondary videos are paused
        secondaryVideoRefs.current.forEach((v) => {
          if (v && !v.paused) v.pause();
        });
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      } else {
        const sIdx = index - 1;
        // Secondary video in fullscreen: ensure main video is paused
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        // Pause all other secondary videos
        secondaryVideoRefs.current.forEach((v, idx) => {
          if (idx !== sIdx && v && !v.paused) {
            v.pause();
          }
        });
        const activeSec = secondaryVideoRefs.current[sIdx];
        if (activeSec && activeSec.paused) {
          activeSec.play().catch(() => {});
        }
      }
      applyAudioFadeRef.current();
    } else {
      if (fullscreenIndexRef.current === index) {
        fullscreenIndexRef.current = null;
        applyAudioFadeRef.current();
      }
    }
  }, []);

  const handleMainPlay = useCallback(() => {
    // If a secondary video is in fullscreen, do not allow main video to play
    if (fullscreenIndexRef.current !== null && fullscreenIndexRef.current !== 0) {
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      return;
    }
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
    // If another video is in fullscreen, do not allow this secondary video to play
    if (fullscreenIndexRef.current !== null && fullscreenIndexRef.current !== sIdx + 1) {
      const v = secondaryVideoRefs.current[sIdx];
      if (v && !v.paused) v.pause();
      return;
    }
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
  const [selectedStillIndex, setSelectedStillIndex] = useState<number | null>(null);
  const [isScrolledToStills, setIsScrolledToStills] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [isProjectMediaReady, setIsProjectMediaReady] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  const projectStills = useMemo(() => project?.stills || [], [project?.stills]);
  const [loadedStills, setLoadedStills] = useState<Record<string, boolean>>({});

  // Gentle prefetching for stills: ONLY triggers after video is ready AND user is near the stills section
  useEffect(() => {
    if (!projectStills.length || typeof window === "undefined" || !isProjectMediaReady) return;
    const stillsEl = stillsRef.current;
    if (!stillsEl) return;

    let hasPrefetched = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !hasPrefetched) {
          hasPrefetched = true;
          // Prefetch in small sequential intervals so video streaming is NEVER starved
          projectStills.slice(0, 8).forEach((s, idx) => {
            if (!s.url) return;
            const src = resolveMediaUrl(s.url);
            if (src) {
              setTimeout(() => {
                const img = new window.Image();
                img.onload = () => {
                  setLoadedStills((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
                };
                img.src = src;
              }, idx * 250);
            }
          });
          observer.disconnect();
        }
      },
      { rootMargin: "150px" }
    );

    observer.observe(stillsEl);
    return () => observer.disconnect();
  }, [projectStills, isProjectMediaReady]);

  // Priority prefetching for adjacent stills when lightbox is open
  useEffect(() => {
    if (selectedStillIndex === null || !projectStills.length || typeof window === "undefined") return;

    const adjacentIndices = [
      (selectedStillIndex + 1) % projectStills.length,
      (selectedStillIndex - 1 + projectStills.length) % projectStills.length,
      (selectedStillIndex + 2) % projectStills.length,
    ];

    adjacentIndices.forEach((idx) => {
      const url = projectStills[idx]?.url;
      if (url) {
        const src = resolveMediaUrl(url);
        if (src) {
          const img = new window.Image();
          img.onload = () => {
            setLoadedStills((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
          };
          img.src = src;
        }
      }
    });
  }, [selectedStillIndex, projectStills]);

  const handlePrevStill = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedStillIndex((prev) => {
      if (prev === null || projectStills.length <= 1) return prev;
      return prev > 0 ? prev - 1 : projectStills.length - 1;
    });
  }, [projectStills.length]);

  const handleNextStill = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedStillIndex((prev) => {
      if (prev === null || projectStills.length <= 1) return prev;
      return prev < projectStills.length - 1 ? prev + 1 : 0;
    });
  }, [projectStills.length]);

  const handleCloseLightbox = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedStillIndex(null);
  }, []);

  // Keyboard navigation for photo lightbox
  useEffect(() => {
    if (selectedStillIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedStillIndex(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevStill();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextStill();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStillIndex, handlePrevStill, handleNextStill]);

  // Touch swipe support for smartphone photo navigation
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartXRef.current - endX;
    const diffY = touchStartYRef.current - endY;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      if (diffX > 0) {
        handleNextStill();
      } else {
        handlePrevStill();
      }
    }
  };

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

  // Listen for iOS Safari native fullscreen on primary video
  useEffect(() => {
    const mainVid = videoRef.current;
    if (!mainVid) return;

    const onMainBeginFs = () => handleFullscreenChange(0, true);
    const onMainEndFs = () => handleFullscreenChange(0, false);

    mainVid.addEventListener("webkitbeginfullscreen", onMainBeginFs);
    mainVid.addEventListener("webkitendfullscreen", onMainEndFs);

    return () => {
      mainVid.removeEventListener("webkitbeginfullscreen", onMainBeginFs);
      mainVid.removeEventListener("webkitendfullscreen", onMainEndFs);
    };
  }, [handleFullscreenChange]);

  // Reset states when navigating to another project
  useEffect(() => {
    setIsProjectMediaReady(false);
    setIsVertical(false);
    setVideoAspectRatio(null);
    secondaryVideoRefs.current = [];
    currentActiveVideoRef.current = null;
    manuallyPausedIndexRef.current = null;
    fullscreenIndexRef.current = null;
    setSelectedStillIndex(null);
  }, [projectId]);

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

    // In fullscreen, never fade audio based on background layout
    if (fullscreenIndexRef.current !== null) {
      return 1;
    }

    const doc = document as any;
    if (
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      (videoRef.current as any)?.webkitDisplayingFullscreen ||
      secondaryVideoRefs.current.some((v) => (v as any)?.webkitDisplayingFullscreen)
    ) {
      return 1;
    }

    const vh = window.innerHeight;

    if (stillsRef.current) {
      const stillsRect = stillsRef.current.getBoundingClientRect();
      // When stills section approaches the upper viewport area,
      // begin fading smoothly (starting at 75% of vh, fully silent by 25% of vh)
      const fadeStart = vh * 0.75;
      const fadeEnd = vh * 0.25;

      if (stillsRect.top <= fadeEnd) {
        return 0;
      } else if (stillsRect.top < fadeStart) {
        return Math.max(0, Math.min(1, (stillsRect.top - fadeEnd) / (fadeStart - fadeEnd)));
      }
    }

    return 1;
  }, []);

  const applyAudioFade = useCallback(() => {
    // 0. Fullscreen Mode: keep 100% volume for the fullscreen video and do not fade
    const doc = typeof document !== "undefined" ? (document as any) : null;
    const fsEl = doc
      ? doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        null
      : null;

    const isPrimaryFs =
      fullscreenIndexRef.current === 0 ||
      (videoRef.current &&
        ((fsEl && (fsEl === videoRef.current || fsEl.contains(videoRef.current))) ||
          (videoRef.current as any)?.webkitDisplayingFullscreen));

    const secFsIdx =
      fullscreenIndexRef.current !== null && fullscreenIndexRef.current > 0
        ? fullscreenIndexRef.current - 1
        : secondaryVideoRefs.current.findIndex(
            (secVid) =>
              secVid &&
              ((fsEl && (fsEl === secVid || fsEl.contains(secVid))) ||
                (secVid as any)?.webkitDisplayingFullscreen)
          );

    if (isPrimaryFs || secFsIdx !== -1 || fsEl) {
      if (isPrimaryFs && videoRef.current) {
        const shouldMute = isMutedRef.current;
        videoRef.current.muted = shouldMute;
        videoRef.current.volume = shouldMute ? 0 : 1;
        secondaryVideoRefs.current.forEach((secVid) => {
          if (secVid && !secVid.paused) secVid.pause();
        });
        return;
      }

      if (secFsIdx !== -1) {
        const activeSec = secondaryVideoRefs.current[secFsIdx];
        if (activeSec) {
          const shouldMute = isMutedRef.current;
          activeSec.muted = shouldMute;
          activeSec.volume = shouldMute ? 0 : 1;
        }
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        secondaryVideoRefs.current.forEach((secVid, idx) => {
          if (idx !== secFsIdx && secVid && !secVid.paused) secVid.pause();
        });
        return;
      }
      return;
    }

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

  useEffect(() => {
    applyAudioFadeRef.current = applyAudioFade;
  }, [applyAudioFade]);

  // Viewport autoplay: tracks which video has user viewpoint focus and automatically plays it
  const checkViewportAutoplay = useCallback(() => {
    if (typeof window === "undefined") return;

    // Fullscreen guard: if ANY video is fullscreen, do NOT touch autoplay or play any background video!
    if (fullscreenIndexRef.current !== null) {
      return;
    }

    const doc = typeof document !== "undefined" ? (document as any) : null;
    const fsEl = doc
      ? doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        null
      : null;

    const isPrimaryFs =
      videoRef.current &&
      ((fsEl && (fsEl === videoRef.current || fsEl.contains(videoRef.current))) ||
        (videoRef.current as any)?.webkitDisplayingFullscreen);

    const isSecFs = secondaryVideoRefs.current.some(
      (secVid) =>
        secVid &&
        ((fsEl && (fsEl === secVid || fsEl.contains(secVid))) ||
          (secVid as any)?.webkitDisplayingFullscreen)
    );

    if (isPrimaryFs || isSecFs || fsEl) {
      return;
    }

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
      // Sync fullscreenIndexRef if exited fullscreen
      const doc = document as any;
      const isFS = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        (videoRef.current as any)?.webkitDisplayingFullscreen ||
        secondaryVideoRefs.current.some((v) => (v as any)?.webkitDisplayingFullscreen)
      );
      if (!isFS && fullscreenIndexRef.current !== null) {
        fullscreenIndexRef.current = null;
      }

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
    window.addEventListener("orientationchange", onScrollOrResize);
    document.addEventListener("fullscreenchange", onScrollOrResize);
    document.addEventListener("webkitfullscreenchange", onScrollOrResize);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("orientationchange", onScrollOrResize);
      document.removeEventListener("fullscreenchange", onScrollOrResize);
      document.removeEventListener("webkitfullscreenchange", onScrollOrResize);
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
        {/* Prioritize Video: Browser Preload Hint */}
        {primaryVideo && (
          <link
            rel="preload"
            as="video"
            href={resolveMediaUrl(primaryVideo.url || project.fullVideoUrl || project.videoPreviewUrl)}
            type="video/mp4"
          />
        )}
        
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
          <div className={`w-full flex justify-center transition-all duration-500 ${
            isVertical ? "max-w-[380px] sm:max-w-[420px] mx-auto" : "w-full"
          }`}>
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
              onFullscreenChange={(fs) => handleFullscreenChange(0, fs)}
              onAspectRatioChange={(vert, ratio) => {
                setIsVertical(vert);
                setVideoAspectRatio(ratio);
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
                onFullscreenChange={(fs) => handleFullscreenChange(sIdx + 1, fs)}
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
            {projectStills.map((still, idx) => {
              const stillUrl = resolveMediaUrl(still.url);
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedStillIndex(idx)}
                  className="group cursor-pointer relative w-full aspect-[16/10] overflow-hidden rounded-lg sm:rounded-xl bg-[#0c0c0e] shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
                >
                  {/* Prioritize video first: only mount image requests once video is ready or user scrolled to stills */}
                  {(isProjectMediaReady || isScrolledToStills) ? (
                    <Image
                      src={stillUrl}
                      alt=""
                      fill
                      unoptimized
                      loading="lazy"
                      fetchPriority="low"
                      decoding="async"
                      onLoad={() => {
                        if (stillUrl) {
                          setLoadedStills((prev) => (prev[stillUrl] ? prev : { ...prev, [stillUrl]: true }));
                        }
                      }}
                      className="object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-95 group-hover:opacity-100 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#0e0e11] animate-pulse" />
                  )}
                </div>
              );
            })}
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

      {/* ── 3. Lightbox Fullscreen per Immagini con Navigazione Avanti / Indietro ── */}
      {selectedStillIndex !== null && projectStills[selectedStillIndex] && (
        <div
          onClick={handleCloseLightbox}
          onTouchStart={handleLightboxTouchStart}
          onTouchEnd={handleLightboxTouchEnd}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-6 md:p-8 safe-top safe-bottom cursor-pointer animate-cinema-fade select-none"
        >
          {/* Top Bar: Counter & Close Button */}
          <div className="w-full flex items-center justify-between z-30">
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 font-mono text-xs text-white/80 tracking-widest bg-white/[0.08] border border-white/15 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>
                {String(selectedStillIndex + 1).padStart(2, "0")} / {String(projectStills.length).padStart(2, "0")}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCloseLightbox}
              className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/15 hover:border-white/35 text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 shadow-lg group backdrop-blur-md"
              title="Chiudi (Esc)"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            </button>
          </div>

          {/* Central Image Viewport with Floating Navigation Buttons */}
          <div className="relative w-full flex-1 flex items-center justify-center my-2 sm:my-4 min-h-0">
            {/* Previous Button */}
            {projectStills.length > 1 && (
              <button
                type="button"
                onClick={handlePrevStill}
                aria-label="Foto precedente"
                title="Precedente (Freccia sinistra)"
                className="absolute left-1 sm:left-3 md:left-6 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 hover:border-white/50 text-white/80 hover:text-white backdrop-blur-xl transition-all duration-300 flex items-center justify-center cursor-pointer shadow-[0_4px_24px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95 group"
              >
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:-translate-x-0.5" />
              </button>
            )}

            {/* The Image */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl h-[70vh] sm:h-[75vh] md:h-[80vh] mx-auto overflow-hidden flex items-center justify-center pointer-events-auto"
            >
              {(() => {
                const currentUrl = resolveMediaUrl(projectStills[selectedStillIndex].url);
                const isLoaded = Boolean(loadedStills[currentUrl]);
                return (
                  <>
                    {/* Sleek Minimal Cinema Spinner while image is loading */}
                    {!isLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/80 animate-spin" />
                      </div>
                    )}

                    <Image
                      key={projectStills[selectedStillIndex].url}
                      src={currentUrl}
                      alt={`Film still ${selectedStillIndex + 1}`}
                      fill
                      unoptimized
                      priority
                      onLoad={() => {
                        if (currentUrl) {
                          setLoadedStills((prev) => (prev[currentUrl] ? prev : { ...prev, [currentUrl]: true }));
                        }
                      }}
                      className={`object-contain transition-all duration-300 ease-out ${
                        isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[0.99]"
                      }`}
                    />
                  </>
                );
              })()}
            </div>

            {/* Next Button */}
            {projectStills.length > 1 && (
              <button
                type="button"
                onClick={handleNextStill}
                aria-label="Foto successiva"
                title="Successiva (Freccia destra)"
                className="absolute right-1 sm:right-3 md:right-6 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 hover:border-white/50 text-white/80 hover:text-white backdrop-blur-xl transition-all duration-300 flex items-center justify-center cursor-pointer shadow-[0_4px_24px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95 group"
              >
                <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Bottom Navigation Hints */}
          <div className="w-full flex items-center justify-center gap-4 text-center py-1 text-xs font-mono text-white/40 tracking-wider z-30">
            <span className="hidden sm:inline">[ ← / → per navigare • esc o tocca fuori per uscire ]</span>
            <span className="sm:hidden">[ tocca le frecce o scorri ]</span>
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
            <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
              <span>P.IVA {settings.vatNumber || "18341681007"}</span>
            </div>
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
          {/* Right: Credits */}
          <div className="text-center sm:text-right text-white/40 lowercase tracking-widest text-[10px] sm:text-xs">
            <a
              href="https://tuni-tawny.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200"
            >
              made by tuni.
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
