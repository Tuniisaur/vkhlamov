"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LocalizedProject } from "@/data/translations";
import { useSiteData } from "@/context/SiteDataContext";
import { resolveMediaUrl } from "@/utils/mediaUrl";

interface StoryItem {
  id: string;
  index: string;
  title: string;

  video: string;
  poster: string;
  project: LocalizedProject;
}

interface MeanderGalleryProps {
  className?: string;
  onSelectProject?: (project: LocalizedProject) => void;
}

function StorySkeletonCard({ index }: { index: string }) {
  return (
    <div className="flex flex-col select-none animate-cinema-fade">
      {/* 16:9 Skeleton Video Box */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#0e0e11] border border-white/[0.04]">
        {/* Shimmer Wave */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-skeleton-shimmer" />

        {/* Minimal cinema watermark viewfinder */}
        <div className="absolute inset-0 flex items-center justify-center opacity-25">
          <div className="w-10 h-10 border border-white/10 rounded flex items-center justify-center">
            <div className="w-2 h-2 border-t border-l border-white/40" />
          </div>
        </div>

        {/* Top-right subtle badge skeleton */}
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/[0.04]" />
      </div>

      {/* Metadata Skeleton */}
      <div className="mt-4 grid grid-cols-8 gap-2">
        <div className="mt-0.5">
          <span className="text-xs font-mono text-white/30">{index}</span>
        </div>
        <div className="col-span-7 space-y-2">
          {/* Title skeleton */}
          <div className="h-5 w-3/4 rounded bg-white/[0.08] animate-pulse" />

        </div>
      </div>
    </div>
  );
}

function StoryCard({
  item,
}: {
  item: StoryItem;
  onSelect?: (project: LocalizedProject) => void;
}) {
  const containerRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFramePlaying, setIsFramePlaying] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(!item.poster);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isVertical, setIsVertical] = useState(false);

  // Initialize video settings for mobile inline playback
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
    }
    // Safety fallback: ensure skeleton is dismissed if poster/video loading stalls
    const timer = setTimeout(() => {
      setIsImageLoaded(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Viewport intersection observer: autoplay video preview on smartphone when scrolled into view
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isTouch =
      typeof window !== "undefined" &&
      (window.matchMedia("(hover: none), (pointer: coarse)").matches ||
        window.innerWidth < 1024);

    if (!isTouch) {
      // Desktop: mouse hover triggers playback; pause when scrolled out of view
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting && !video.paused) {
              video.pause();
              setIsFramePlaying(false);
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(container);
      return () => observer.disconnect();
    }

    // Smartphone / Touch devices: automatically play preview when in view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.preload = "auto";
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          } else {
            if (!video.paused) {
              video.pause();
            }
            setIsFramePlaying(false);
          }
        });
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -5% 0px",
      }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    const video = videoRef.current;
    if (!video) return;

    if (video.preload !== "auto") {
      video.preload = "auto";
    }

    const p = video.play();
    if (p !== undefined) {
      p.catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (isTouch) return;

    setIsFramePlaying(false);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.videoHeight && videoRef.current.videoWidth) {
      if (videoRef.current.videoHeight > videoRef.current.videoWidth) {
        setIsVertical(true);
      }
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsImageLoaded(true);
    const img = e.currentTarget;
    if (img.naturalHeight && img.naturalWidth && img.naturalHeight > img.naturalWidth) {
      setIsVertical(true);
    }
  };

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isAudioMuted;
      videoRef.current.muted = nextMuted;
      setIsAudioMuted(nextMuted);
    }
  };

  const showSkeleton = !isImageLoaded && !isVideoReady && !isFramePlaying;

  return (
    <Link
      ref={containerRef}
      href={`/project/${item.project.id}`}
      scroll={true}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group flex flex-col cursor-pointer select-none"
    >
      {/* Video Box with Rounded Corners (Harmonious aspect-video frame with ambient cinema backlight for vertical films) */}
      <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-[#0a0a0d] border border-white/[0.04] flex items-center justify-center">
        {/* Ambient blurred backdrop for vertical videos to fill the letterbox seamlessly with matching film colors */}
        {isVertical && item.poster && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 select-none">
            <Image
              src={resolveMediaUrl(item.poster)}
              alt=""
              fill
              unoptimized
              className="object-cover blur-2xl scale-125"
            />
          </div>
        )}

        {/* Skeleton while poster is loading */}
        {showSkeleton && (
          <div className="absolute inset-0 bg-[#0e0e11] overflow-hidden pointer-events-none z-[1]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-skeleton-shimmer" />
          </div>
        )}

        <video
          ref={videoRef}
          src={resolveMediaUrl(item.video)}
          poster={resolveMediaUrl(item.poster)}
          muted={isAudioMuted}
          loop
          playsInline
          {...({ "webkit-playsinline": "true" } as any)}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={() => {
            setIsVideoReady(true);
            setIsImageLoaded(true);
          }}
          onCanPlay={() => {
            setIsVideoReady(true);
            setIsImageLoaded(true);
          }}
          onPlaying={() => {
            setIsFramePlaying(true);
            setIsVideoReady(true);
            setIsImageLoaded(true);
          }}
          className={`h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.02] pointer-events-none ${
            isVertical ? "object-contain relative z-[1]" : "object-cover"
          }`}
        />

        {/* Poster Image: Stays visible until the video actually renders moving frames */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 pointer-events-none z-[2] ${
            isFramePlaying ? "opacity-0" : "opacity-100"
          }`}
        >
          {item.poster && (
            <Image
              src={resolveMediaUrl(item.poster)}
              alt={item.title}
              fill
              unoptimized
              priority={true}
              onLoad={handleImageLoad}
              onError={() => setIsImageLoaded(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.02] ${
                isVertical ? "object-contain" : "object-cover"
              }`}
            />
          )}
        </div>

        {/* Progress Bar along bottom on hover */}
        <div
          style={{ width: `${progress}%` }}
          className={`progress absolute bottom-0 left-0 h-[3px] bg-white transition-opacity duration-200 pointer-events-none ${
            isFramePlaying ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Floating Audio Toggle Button (Appears on Hover) */}
        <button
          type="button"
          onClick={handleAudioToggle}
          aria-label={isAudioMuted ? "Unmute audio" : "Mute audio"}
          className="absolute top-3 right-3 z-10 size-8 sm:size-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 cursor-pointer shadow-lg"
        >
          {isAudioMuted ? (
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>

      {/* Story Metadata Directly Underneath: [01] Index on Left + Title & Subtitle on Right */}
      <div className="mt-3.5 sm:mt-4 flex items-start gap-3 min-w-0">
        <p className="mt-0.5 text-xs font-mono text-white/40 shrink-0">
          [{item.index}]
        </p>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-white transition-colors leading-snug truncate">
              {item.title}
            </h3>
          </div>

        </div>
      </div>
    </Link>
  );
}

export default function MeanderGallery({
  className = "",
  onSelectProject,
}: MeanderGalleryProps) {
  const { projects, isLoading } = useSiteData();

  const stories: StoryItem[] = useMemo(() => {
    return projects.map((p, idx) => ({
      id: p.id,
      index: String(idx + 1).padStart(2, "0"),
      title: p.title.en || p.title.it || "Cinema Project",

      video: p.videoPreviewUrl || p.videos?.[0]?.url || p.fullVideoUrl || "",
      poster: p.posterImage || p.stills?.[0]?.url || "",
      project: p,
    }));
  }, [projects]);

  // If data is loading and no stories are cached yet, show modern cinema skeleton grid
  if (isLoading && stories.length === 0) {
    return (
      <div className={`w-full px-4 sm:px-6 md:px-8 lg:px-10 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12 md:gap-y-16 w-full">
          {Array.from({ length: 6 }).map((_, idx) => (
            <StorySkeletonCard
              key={idx}
              index={String(idx + 1).padStart(2, "0")}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full px-4 sm:px-6 md:px-8 lg:px-10 ${className}`}>
      {/* 3 cards per row on desktop covering the full width of the page */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12 md:gap-y-16 w-full">
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            item={story}
            onSelect={(p) => onSelectProject?.(p)}
          />
        ))}
      </div>
    </div>
  );
}
