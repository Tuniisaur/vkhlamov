"use client";

import { useEffect, useRef, useState } from "react";
import { sound } from "@/utils/audio";
import { X, Volume2, VolumeX, Gauge, MapPin, Calendar } from "lucide-react";
import { TRANSLATIONS, LocalizedProject } from "@/data/translations";
import { resolveMediaUrl } from "@/utils/mediaUrl";

interface ProjectModalProps {
  project: LocalizedProject | null;
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const t = TRANSLATIONS.en.modal;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVertical, setIsVertical] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        sound.playBlip(380, 0.04);
        onClose();
      }
    };

    if (project) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [project, onClose]);

  const toggleModalMute = () => {
    sound.playBlip(620, 0.03);
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    if (!next && videoRef.current.volume === 0) {
      videoRef.current.volume = 1;
    }
    setIsMuted(next);
  };

  if (!project) return null;

  const rawVideoUrl = (project.fullVideoUrl || project.videoPreviewUrl || project.videos?.[0]?.url || "").trim();
  const hasVideo = Boolean(rawVideoUrl);

  const modalDescription =
    typeof project.description === "string"
      ? project.description.trim()
      : (project.description?.it?.trim() || project.description?.en?.trim() || (project as any)?.desc?.trim() || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 safe-top safe-bottom bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Click outside to close */}
      <div
        className="absolute inset-0"
        onClick={() => {
          sound.playBlip(380, 0.04);
          onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl max-h-[92dvh] sm:max-h-[94vh] bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.08] flex items-center justify-between font-mono text-xs bg-black/40">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <span className="text-white font-bold tracking-wider uppercase truncate max-w-[200px] sm:max-w-none">
              {project.title.en || project.title.it}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {hasVideo && (
              <button
                type="button"
                onClick={toggleModalMute}
                className="w-10 h-10 rounded-full glass-panel text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title={isMuted ? t.unmute : t.mute}
                aria-label={isMuted ? t.unmute : t.mute}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                sound.playBlip(380, 0.04);
                onClose();
              }}
              className="w-10 h-10 rounded-full glass-panel text-neutral-400 hover:text-white hover:border-white/30 transition-colors cursor-pointer flex items-center justify-center"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto mobile-touch-scroll p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Main Video Viewport (only if video exists) */}
          {hasVideo && (
            <div className={`relative rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl mx-auto transition-all duration-300 flex items-center justify-center ${
              isVertical ? "aspect-[9/16] max-h-[60vh] w-full max-w-[320px]" : "aspect-video w-full"
            }`}>
              <video
                ref={videoRef}
                src={resolveMediaUrl(rawVideoUrl)}
                poster={resolveMediaUrl(project.posterImage)}
                controls
                autoPlay
                playsInline
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (el.videoHeight && el.videoWidth && el.videoHeight > el.videoWidth) {
                    setIsVertical(true);
                  }
                }}
                className={`w-full h-full ${isVertical ? "object-contain" : "object-cover"}`}
              />
            </div>
          )}

          {/* Cover/Poster Image if no video exists */}
          {!hasVideo && project.posterImage && (
            <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl mx-auto w-full aspect-video max-h-[60vh] flex items-center justify-center">
              <img
                src={resolveMediaUrl(project.posterImage)}
                alt={project.title.en || project.title.it || "Project"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Project Description (always centered) */}
          {modalDescription && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex justify-center w-full">
              <p className="text-sm sm:text-base text-neutral-200 font-light leading-relaxed whitespace-pre-line text-center mx-auto max-w-2xl">
                {modalDescription}
              </p>
            </div>
          )}

          {/* Telemetry Strip */}
          {project.telemetry && (project.telemetry.speed || project.telemetry.gForce || project.telemetry.track) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 py-3 border-y border-white/[0.08] font-mono text-xs">
              <div className="p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-neutral-500 block text-[9px] uppercase tracking-wider">{t.maxSpeed}</span>
                <span className="text-white font-bold text-sm flex items-center gap-1.5 mt-0.5">
                  <Gauge className="w-3.5 h-3.5 text-neutral-400" />
                  {project.telemetry.speed}
                </span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-neutral-500 block text-[9px] uppercase tracking-wider">{t.corneringForce}</span>
                <span className="text-white font-bold text-sm mt-0.5 block">{project.telemetry.gForce}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-neutral-500 block text-[9px] uppercase tracking-wider">TIMECODE</span>
                <span className="text-white font-bold text-sm mt-0.5 block">{project.telemetry?.timecode || "--:--"}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-neutral-500 block text-[9px] uppercase tracking-wider">{t.trackSector}</span>
                <span className="text-white font-bold text-sm mt-0.5 block truncate">{project.telemetry.track}</span>
              </div>
            </div>
          )}

          {/* Metadata Breakdown */}
          <div className="pt-1 sm:pt-2">
            <div className="flex flex-wrap gap-3 sm:gap-4 font-mono text-xs text-neutral-400">
              {project.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                  {project.location}
                </span>
              )}
              {project.year && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  {project.year}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


