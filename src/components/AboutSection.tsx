"use client";

import React from "react";
import Image from "next/image";
import { AboutSettings, SiteSettings } from "@/context/SiteDataContext";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import InstagramIcon from "@/components/InstagramIcon";
import { Mail, Phone, ExternalLink } from "lucide-react";

interface AboutSectionProps {
  about: AboutSettings;
  settings: SiteSettings;
}

export default function AboutSection({ about, settings }: AboutSectionProps) {
  const photoSrc = about.image?.trim()
    ? about.image
    : "/images/still-2026-09-23-130212_1-2-1-5306.jpg";

  const channels =
    settings.channels && settings.channels.length > 0
      ? settings.channels
      : [
          { id: "vimeo", name: "Vimeo Pro", url: settings.vimeoUrl || "https://vimeo.com" },
          { id: "instagram", name: "Instagram Cinema", url: settings.instagramUrl || "https://instagram.com/vkhlamov" },
        ];

  return (
    <section
      id="about"
      className="relative w-full min-h-screen bg-[#050505] py-20 sm:py-32 border-t border-white/[0.04] scroll-mt-16 select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 lg:gap-16 items-start">
          {/* ── LEFT COLUMN: DIRECTOR / CINEMA PHOTO ── */}
          <div className="lg:col-span-5 w-full flex flex-col items-center lg:items-start lg:sticky lg:top-28">
            <div className="relative w-full max-w-[440px] aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] rounded-2xl overflow-hidden bg-[#0c0c0e] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.85)] group">
              {/* Subtle cinema viewfinder corner brackets */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-white/30 z-10 pointer-events-none" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-white/30 z-10 pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-white/30 z-10 pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-white/30 z-10 pointer-events-none" />

              {/* Main Photo with smooth hover zoom & ambient film tone */}
              <Image
                src={resolveMediaUrl(photoSrc)}
                alt="Valeriy Khlamov - Director of Photography"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
                priority={false}
              />

              {/* Ambient film grain & subtle bottom gradient vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

              {/* In-Frame Bottom Cinema Meta */}
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-white/70 z-10 pointer-events-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  VALERIY KHLAMOV
                </span>
                <span className="text-white/40">// DIR / DOP</span>
              </div>
            </div>

            {/* Subtle technical caption directly below photo */}
            <div className="w-full max-w-[440px] mt-3 px-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-white/30">
              <span>[ MILAN // WORLDWIDE ]</span>
              <span>HIGH-SPEED CINEMATOGRAPHY</span>
            </div>
          </div>

          {/* ── RIGHT COLUMN: ALL PROFILE & CAREER INFORMATION ── */}
          <div className="lg:col-span-7 flex flex-col space-y-8 sm:space-y-10 text-white lg:pl-4">
            {/* 1. Badge & Title */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                <span>{about.badge || "// PROFILE & DIRECTION"}</span>
              </div>

              <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light leading-snug tracking-tight text-white font-sans">
                {about.title}
              </h2>
            </div>

            {/* 2. Narrative Bio & Secondary Bio */}
            <div className="space-y-4 text-white/75 leading-relaxed font-light text-sm sm:text-base md:text-lg">
              <p className="whitespace-pre-line">
                {about.bio}
              </p>

              {Boolean(about.secondaryBio && about.secondaryBio.trim()) && (
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-light whitespace-pre-line pt-3 border-t border-white/[0.06]">
                  {about.secondaryBio}
                </p>
              )}
            </div>

            {/* 3. Structured Cinema Specifications Grid */}
            <div className="pt-6 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 font-mono text-xs">
              {/* Disciplines */}
              {Boolean(about.disciplines && about.disciplines.trim()) && (
                <div className="space-y-1.5">
                  <span className="text-white/40 block text-[10px] tracking-widest uppercase">
                    {about.disciplinesTitle || "DISCIPLINES & FOCUS"}
                  </span>
                  <p className="text-white/90 font-light leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {about.disciplines}
                  </p>
                </div>
              )}

              {/* Accreditations */}
              {Boolean(about.accreditations && about.accreditations.trim()) && (
                <div className="space-y-1.5">
                  <span className="text-white/40 block text-[10px] tracking-widest uppercase">
                    {about.accreditationsTitle || "ACCREDITATIONS"}
                  </span>
                  <p className="text-white/90 font-light leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {about.accreditations}
                  </p>
                </div>
              )}

              {/* Base & Deployment */}
              {Boolean(about.base && about.base.trim()) && (
                <div className="space-y-1.5">
                  <span className="text-white/40 block text-[10px] tracking-widest uppercase">
                    {about.baseTitle || "BASE & DEPLOYMENT"}
                  </span>
                  <p className="text-white/90 font-light leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {about.base}
                  </p>
                </div>
              )}

              {/* Representation */}
              {Boolean(settings.representation && settings.representation.trim()) && (
                <div className="space-y-1.5">
                  <span className="text-white/40 block text-[10px] tracking-widest uppercase">
                    REPRESENTATION
                  </span>
                  <p className="text-white/90 font-light leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {settings.representation}
                  </p>
                </div>
              )}

              {/* Custom Extra Blocks */}
              {about.customBlocks &&
                about.customBlocks.map((block) => (
                  <div key={block.id} className="space-y-1.5">
                    <span className="text-white/40 block text-[10px] tracking-widest uppercase">
                      {block.label}
                    </span>
                    <p className="text-white/90 font-light leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                      {block.value}
                    </p>
                  </div>
                ))}
            </div>

            {/* 4. Direct Connect & Channel Links */}
            <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-5 font-mono text-xs">
              {/* Direct email / booking */}
              <div className="flex flex-wrap items-center gap-4">
                {settings.contactEmail && (
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/40 text-white transition-all duration-300 hover:scale-105 active:scale-95 tracking-wider uppercase text-[11px]"
                  >
                    <Mail className="w-3.5 h-3.5 text-white/70" />
                    <span>Inquire / Booking ↗</span>
                  </a>
                )}

                {Boolean(settings.contactPhone && settings.contactPhone.trim()) && (
                  <a
                    href={`tel:${settings.contactPhone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-200 tracking-wider text-[11px]"
                  >
                    <Phone className="w-3 h-3 text-white/40" />
                    <span>{settings.contactPhone}</span>
                  </a>
                )}
              </div>

              {/* Social Channels */}
              <div className="flex items-center gap-4 text-white/50 text-[11px]">
                {channels.map((channel) => (
                  <a
                    key={channel.id}
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white hover:italic transition-colors duration-200 inline-flex items-center gap-1"
                  >
                    {channel.id?.toLowerCase().includes("instagram") ? (
                      <InstagramIcon className="w-3.5 h-3.5 inline mr-0.5" />
                    ) : null}
                    <span>{channel.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
