"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { sound } from "@/utils/audio";
import { ArrowUpRight, Play } from "lucide-react";
import {
  TRANSLATIONS,
  LOCALIZED_PROJECTS,
  LocalizedProject,
} from "@/data/translations";

interface ProjectGridProps {
  onSelectProject: (p: LocalizedProject) => void;
}

// Individual Modern Minimal Cinema Card
function ModernFilmCard({
  project,
  index,
  onSelect,
}: {
  project: LocalizedProject;
  index: number;
  onSelect: (p: LocalizedProject) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    sound.playBlip(680, 0.02);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <div
      onClick={() => {
        sound.playRev();
        onSelect(project);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-cursor="PLAY"
      className="group cursor-pointer flex flex-col space-y-4 select-none"
    >
      {/* 16:10 Expansive Modern Cinema Window */}
      <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#0c0c0e] border border-white/[0.08] group-hover:border-white/30 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.6)] group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
        {/* Poster Image */}
        <Image
          src={project.posterImage}
          alt={project.title.en || project.title.it}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`object-cover object-center transition-all duration-700 ${
            isHovered ? "scale-105 opacity-0" : "scale-100 opacity-100"
          }`}
        />

        {/* Video Preview on Hover */}
        <video
          ref={videoRef}
          src={project.videoPreviewUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isHovered ? "opacity-100 scale-102" : "opacity-0 scale-100"
          }`}
        />

        {/* Soft Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Top Left Floating Tag */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="font-mono text-[10px] text-white/90 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider">
            {project.categoryLabel.en || project.categoryLabel.it}
          </span>
        </div>

        {/* Top Right Duration Tag */}
        <div className="absolute top-4 right-4 z-10">
          <span className="font-mono text-[10px] text-neutral-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 tracking-widest">
            {project.duration}
          </span>
        </div>

        {/* Bottom Right Live Telemetry on Hover */}
        <div
          className={`absolute bottom-4 right-4 z-10 transition-all duration-300 pointer-events-none ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <span className="font-mono text-[10px] text-[#e0fe10] bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-[#e0fe10]/30 font-bold tracking-wider">
            {project.telemetry.speed}
          </span>
        </div>

        {/* Center Minimal Play Icon on Hover */}
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center transition-all duration-500 pointer-events-none ${
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-black shadow-2xl group-hover:scale-105 transition-transform">
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Modern Editorial Caption */}
      <div className="space-y-1.5 px-0.5">
        {/* Meta Bar */}
        <div className="flex items-center justify-between font-mono text-[11px] text-neutral-400">
          <span className="uppercase tracking-widest">
            {project.year} // {project.categoryLabel.en || project.categoryLabel.it}
          </span>
        </div>

        {/* Project Title with Slide Arrow */}
        <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform duration-300">
          <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#e0fe10] transition-colors tracking-tight">
            {project.title.en || project.title.it}
          </h3>
          <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default function ProjectGrid({ onSelectProject }: ProjectGridProps) {
  const t = TRANSLATIONS.en.works;

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: t.catAll },
    { id: "gt", label: t.catGt },
    { id: "pursuit", label: t.catPursuit },
    { id: "rally", label: t.catRally },
    { id: "commercial", label: t.catCommercial },
  ];

  const filteredProjects =
    selectedCategory === "all"
      ? LOCALIZED_PROJECTS
      : LOCALIZED_PROJECTS.filter((p) => p.category === selectedCategory);

  return (
    <section
      id="works"
      className="py-20 sm:py-28 relative bg-[#050505] border-t border-white/[0.06] select-none"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        {/* Section Header: Pure & Monumental */}
        <div className="mb-12 sm:mb-16 pb-6 border-b border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <span className="font-mono text-[11px] text-neutral-400 tracking-[0.25em] uppercase block">
              {t.badge}
            </span>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-none">
              {t.title}
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base font-light max-w-xl leading-relaxed pt-1">
              {t.subtitle}
            </p>
          </div>

          {/* Minimal Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 font-mono text-xs tracking-widest uppercase self-start md:self-end">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    sound.playBlip(600, 0.02);
                    setSelectedCategory(cat.id);
                  }}
                  className={`py-1 relative transition-colors cursor-pointer ${
                    isActive
                      ? "text-white font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>{cat.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#e0fe10] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modern 2-Column Cinema Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-12 lg:gap-16">
          {filteredProjects.map((project, idx) => (
            <ModernFilmCard
              key={project.id}
              project={project}
              index={idx}
              onSelect={onSelectProject}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
