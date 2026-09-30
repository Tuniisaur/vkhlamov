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
      className="relative w-full min-h-screen bg-[#050505] border-t border-white/[0.04] scroll-mt-16 select-none overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen items-stretch">
        {/* ── LEFT COLUMN: ALL PROFILE & CAREER INFORMATION (CLEAN BACKGROUND, NO VIDEO TEXTURE) ── */}
        <div className="lg:col-span-7 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-14 xl:px-20 2xl:px-24 py-16 sm:py-24 lg:py-28 text-white order-1">
          <div className="max-w-2xl w-full mx-auto lg:mr-0 lg:ml-auto space-y-8 sm:space-y-10">
            {/* 1. Badge & Title */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                <span>{about.badge || "// ABOUT ME"}</span>
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

        {/* ── RIGHT COLUMN: FULL-HEIGHT DIRECTOR PHOTO (ALTA COME LA PAGINA) ── */}
        <div className="lg:col-span-5 relative w-full self-stretch order-2 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#0c0c0e]">
          <div className="relative w-full h-[70vh] sm:h-[85vh] lg:h-full lg:min-h-screen lg:sticky lg:top-0 overflow-hidden group">
            <Image
              src={resolveMediaUrl(photoSrc)}
              alt="Valeriy Khlamov - Director of Photography"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center w-full h-full brightness-95 contrast-[1.02] transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
              priority={false}
            />
            {/* Subtle atmospheric vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
