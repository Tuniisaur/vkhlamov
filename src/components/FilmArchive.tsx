"use client";

import { useState } from "react";
import { sound } from "@/utils/audio";
import { ArrowUpRight, Play, Film } from "lucide-react";
import {
  TRANSLATIONS,
  ARCHIVE_FILMS,
  ArchiveFilm,
  LOCALIZED_PROJECTS,
  LocalizedProject,
} from "@/data/translations";

interface FilmArchiveProps {
  onSelectProject: (p: LocalizedProject) => void;
}

export default function FilmArchive({ onSelectProject }: FilmArchiveProps) {
  const t = TRANSLATIONS.en.archive;

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [hoveredFilmId, setHoveredFilmId] = useState<string | null>(null);

  const filters = [
    { id: "all", label: t.filterAll },
    { id: "commercial", label: t.filterCommercial },
    { id: "motorsport", label: t.filterMotorsport },
    { id: "pursuit", label: t.filterPursuit },
    { id: "documentary", label: t.filterDoc },
  ];

  const filteredFilms =
    activeFilter === "all"
      ? ARCHIVE_FILMS
      : ARCHIVE_FILMS.filter((f) => f.category === activeFilter);

  const handleRowClick = (film: ArchiveFilm) => {
    sound.playRev();
    // Find matching project in LOCALIZED_PROJECTS or fall back to first
    const matched =
      LOCALIZED_PROJECTS.find((p) => p.id === film.id) ||
      LOCALIZED_PROJECTS[0];
    onSelectProject(matched);
  };

  return (
    <section
      id="archive"
      className="py-24 sm:py-32 bg-[#050505] border-t border-white/[0.08] relative select-none"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400 tracking-[0.25em] uppercase">
              <Film className="w-3.5 h-3.5 text-[#e0fe10]" />
              <span>{t.badge}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-none">
              {t.title}
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base font-light max-w-2xl leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {filters.map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    sound.playBlip(750, 0.02);
                    setActiveFilter(f.id);
                  }}
                  className={`px-3 py-1.5 rounded-full font-mono text-[10px] sm:text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-white text-black font-bold shadow-md"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filmography Table - Desktop & Tablet */}
        <div className="hidden md:block">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 pb-3 px-4 font-mono text-[10px] tracking-[0.2em] text-neutral-400 uppercase border-b border-white/[0.06]">
            <div className="col-span-1">{t.colYear}</div>
            <div className="col-span-4">{t.colTitle}</div>
            <div className="col-span-3">{t.colClient}</div>
            <div className="col-span-2">{t.colRole}</div>
            <div className="col-span-2 text-right">{t.colAction}</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.06]">
            {filteredFilms.map((film, idx) => {
              const isHovered = hoveredFilmId === film.id;
              return (
                <div
                  key={film.id}
                  onClick={() => handleRowClick(film)}
                  onMouseEnter={() => {
                    sound.playBlip(680, 0.015);
                    setHoveredFilmId(film.id);
                  }}
                  onMouseLeave={() => setHoveredFilmId(null)}
                  className="group grid grid-cols-12 gap-4 py-4 px-4 items-center transition-all duration-200 hover:bg-white/[0.04] cursor-pointer rounded-xl"
                >
                  {/* Year */}
                  <div className="col-span-1 font-mono text-xs text-neutral-400 group-hover:text-white transition-colors">
                    {film.year}
                  </div>

                  {/* Title & Category Badge */}
                  <div className="col-span-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white group-hover:text-[#e0fe10] transition-colors tracking-tight">
                        {film.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-400">
                      <span className="text-[#e0fe10]/80">[{film.categoryLabel.en || film.categoryLabel.it}]</span>
                      <span>•</span>
                      <span>{film.location}</span>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="col-span-3 font-mono text-xs text-neutral-300 group-hover:text-white transition-colors">
                    {film.client}
                  </div>

                  {/* Role & Format */}
                  <div className="col-span-2 space-y-0.5">
                    <div className="font-mono text-xs text-white">
                      {film.role}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-400 truncate">
                      {film.format}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="col-span-2 flex items-center justify-end gap-2 text-neutral-400 group-hover:text-white transition-colors">
                    <span className="font-mono text-[10px] tracking-wider uppercase hidden lg:inline">
                      {film.duration}
                    </span>
                    <div className="w-8 h-8 rounded-full border border-white/[0.1] group-hover:border-[#e0fe10] group-hover:bg-[#e0fe10] group-hover:text-black flex items-center justify-center transition-all duration-300">
                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile View: Clean Editorial Cards */}
        <div className="md:hidden space-y-3">
          {filteredFilms.map((film) => (
            <div
              key={film.id}
              onClick={() => handleRowClick(film)}
              className="p-4 rounded-xl border border-white/[0.08] bg-[#0c0c0e] active:scale-[0.98] transition-transform space-y-2 cursor-pointer"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400">
                <span className="text-[#e0fe10] font-semibold">
                  [{film.categoryLabel.en || film.categoryLabel.it}]
                </span>
                <span>{film.year} • {film.duration}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {film.title}
                </h3>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </div>

              <div className="font-mono text-xs text-neutral-300">
                {film.client}
              </div>

              <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between font-mono text-[10px] text-neutral-400">
                <span>{film.role}</span>
                <span className="truncate max-w-[160px]">{film.format}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Catalog Counter */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between font-mono text-[11px] text-neutral-400">
          <span>
            SHOWING {filteredFilms.length} OF {ARCHIVE_FILMS.length} CATALOGUED PRODUCTIONS
          </span>
          <span className="text-[#e0fe10]">4K RAW & ANAMORPHIC MASTERS</span>
        </div>
      </div>
    </section>
  );
}
