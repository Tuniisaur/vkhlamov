"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { LocalizedProject } from "@/data/translations";
import { useSiteData } from "@/context/SiteDataContext";
import { resolveMediaUrl } from "@/utils/mediaUrl";

interface StoryItem {
  id: string;
  index: string;
  title: string;
  subtitle: string;
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
          {/* Subtitle skeleton */}
          <div className="h-3.5 w-1/2 rounded bg-white/[0.04] animate-pulse" />
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const playAttemptRef = useRef<boolean>(false);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsPlaying(true);
    playAttemptRef.current = true;

    // preload="auto" ensures browser has already buffered before hover.
    // readyState >= 2 (HAVE_CURRENT_DATA) is enough to start playing.
    if (video.readyState >= 2) {
      video.play().catch(() => {});
      return;
    }

    // Fallback: wait for canplay on slow connections
    const tryPlay = () => {
      if (!playAttemptRef.current) return;
      video.play().catch(() => {});
    };
    video.addEventListener("canplay", tryPlay, { once: true });
  };

  const handleMouseLeave = () => {
    playAttemptRef.current = false;
    setIsPlaying(false);
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

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isAudioMuted;
      videoRef.current.muted = nextMuted;
      setIsAudioMuted(nextMuted);
    }
  };

  return (
    <Link
      href={`/project/${item.project.id}`}
      scroll={true}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group flex flex-col cursor-pointer select-none"
    >
      {/* 16:9 Video Box with Rounded Corners (No border) */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {/* Skeleton while poster is loading */}
        {!isImageLoaded && (
          <div className="absolute inset-0 bg-[#0e0e11] overflow-hidden">
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
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] pointer-events-none"
        />

        {/* Poster Image: Always shows before hover and returns when mouse leaves */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            isPlaying ? "opacity-0" : isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {item.poster && (
            <Image
              src={resolveMediaUrl(item.poster)}
              alt={item.title}
              fill
              unoptimized
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setIsImageLoaded(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
          )}
        </div>

        {/* Progress Bar along bottom on hover */}
        <div
          style={{ width: `${progress}%` }}
          className={`progress absolute bottom-0 left-0 h-[3px] bg-white transition-opacity duration-200 pointer-events-none ${
            isPlaying ? "opacity-100" : "opacity-0"
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
          <p className="text-neutral-400 mt-1 text-xs font-light leading-relaxed line-clamp-2">
            {item.subtitle}
          </p>
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
      subtitle: p.title.en || p.subtitle.en || p.title.it || p.subtitle.it,
      video: p.videoPreviewUrl || "",
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
