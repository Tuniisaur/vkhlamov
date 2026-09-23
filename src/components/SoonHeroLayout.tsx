"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LocalizedProject } from "@/data/translations";
import { useSiteData, DEFAULT_ABOUT } from "@/context/SiteDataContext";
import MeanderGallery from "@/components/MeanderGallery";
import InstagramIcon from "@/components/InstagramIcon";
import { Mail, ArrowUp } from "lucide-react";

interface SoonHeroLayoutProps {
  onSelectProject: (project: LocalizedProject) => void;
}

export default function SoonHeroLayout({ onSelectProject }: SoonHeroLayoutProps) {
  const { settings } = useSiteData();
  const about = settings.about || DEFAULT_ABOUT;
  const [activeTab, setActiveTab] = useState<"projects" | "about" | "contact" | null>(null);
  const currentVideo = settings.heroVideo || "/videos/sfondo%20portfolio.mov";
  const [isMuted, setIsMuted] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(900);
  const [isScrolledToProjects, setIsScrolledToProjects] = useState(false);
  const [isSoundDismissedOnMobile, setIsSoundDismissedOnMobile] = useState(false);
  const [footerOffset, setFooterOffset] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  // Parallax scroll listener & footer overlap detector
  useEffect(() => {
    const checkFooterOffset = () => {
      if (footerRef.current) {
        const rect = footerRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.top < vh) {
          setFooterOffset(vh - rect.top);
        } else {
          setFooterOffset(0);
        }
      }
    };

    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      const inProjects = y > window.innerHeight * 0.45;
      setIsScrolledToProjects(inProjects);
      checkFooterOffset();

      if (inProjects || y > 80) {
        setIsSoundDismissedOnMobile(true);
      } else if (y <= 10) {
        setIsSoundDismissedOnMobile(false);
      }
    };

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
      checkFooterOffset();
    };

    handleResize();
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Listen to URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "projects" || tabParam === "work") {
        setTimeout(() => {
          document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else if (tabParam === "contact") {
        setTimeout(() => setActiveTab("contact"), 0);
      } else if (tabParam === "about") {
        setTimeout(() => setActiveTab("about"), 0);
      }
    }
  }, []);

  const toggleSound = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = nextMuted ? 0 : 1;
      setIsMuted(nextMuted);
    }
  };

  const scrollToTop = () => {
    setActiveTab(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToProjects = () => {
    setIsSoundDismissedOnMobile(true);
    setActiveTab(null);
    const el = document.getElementById("projects");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAboutToggle = () => {
    if (activeTab === "about") {
      setActiveTab(null);
    } else {
      setActiveTab("about");
      if (window.scrollY > 40) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleContactToggle = () => {
    if (activeTab === "contact") {
      setActiveTab(null);
    } else {
      setActiveTab("contact");
      if (window.scrollY > 40) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideo]);

  return (
    <div className="relative w-full bg-[#050505] text-white select-none">
      {/* ── 1. FIXED HEADER: VALERIY KHLAMOV + MENU DIRECTLY UNDERNEATH ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-3 sm:px-8 flex flex-col items-center text-center transition-all duration-500 ease-out pointer-events-auto select-none ${
          isScrolledToProjects
            ? "hero-header-scrolled pb-2 sm:pb-2.5 bg-black/75 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
            : scrollY > 40
            ? "hero-header-mid pb-2.5 sm:pb-3 bg-black/60 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
            : "hero-header-top pb-3 sm:pb-4 bg-transparent"
        }`}
      >
        {/* Top Sound Toggle Positioned on the Right without taking vertical flow */}
        <div
          className={`absolute right-3 sm:right-8 transition-all duration-500 ease-out z-10 ${
            isScrolledToProjects
              ? "top-1/2 -translate-y-1/2"
              : "top-2 sm:top-5"
          } ${
            isSoundDismissedOnMobile
              ? "hidden sm:flex sm:items-center"
              : "flex items-center"
          }`}
        >
          <button
            onClick={toggleSound}
            aria-label={isMuted ? "Sound on" : "Sound off"}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[10px] sm:text-xs font-mono tracking-widest text-white/60 hover:text-white hover:italic transition-all duration-300 transform active:scale-95 sm:hover:scale-105 cursor-pointer"
          >
            {isMuted ? "[ sound on ]" : "[ sound off ]"}
          </button>
        </div>

        {/* VALERIY KHLAMOV Title - Monumental in Hero, Compact in Projects */}
        <h1
          onClick={scrollToTop}
          className={`cursor-pointer font-title-custom uppercase text-white leading-none select-none text-center transform transition-all duration-500 ease-out hover:scale-[1.01] px-2 ${
            isScrolledToProjects
              ? "text-lg sm:text-xl md:text-2xl"
              : "text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
          }`}
        >
          VALERIY KHLAMOV
        </h1>

        {/* ── Menu Directly Underneath the Title: projects, about, contact ── */}
        <nav
          className={`flex items-center justify-center font-light lowercase tracking-wider text-white transition-all duration-500 ease-out ${
            isScrolledToProjects
              ? "mt-1 sm:mt-1.5 gap-4 sm:gap-10 text-[11px] sm:text-sm"
              : "mt-2.5 sm:mt-5 gap-5 sm:gap-14 text-xs sm:text-base md:text-lg"
          }`}
        >
          <button
            onClick={scrollToProjects}
            className={`py-1.5 px-2 transition-all duration-300 ease-out cursor-pointer transform hover:-translate-y-0.5 ${
              isScrolledToProjects && !activeTab
                ? "italic font-medium underline underline-offset-8 opacity-100 scale-105"
                : "opacity-70 hover:opacity-100 hover:italic"
            }`}
          >
            projects
          </button>

          <button
            onClick={handleAboutToggle}
            className={`py-1.5 px-2 transition-all duration-300 ease-out cursor-pointer transform hover:-translate-y-0.5 ${
              activeTab === "about"
                ? "italic font-medium underline underline-offset-8 opacity-100 scale-105"
                : "opacity-70 hover:opacity-100 hover:italic"
            }`}
          >
            about
          </button>

          <button
            onClick={handleContactToggle}
            className={`py-1.5 px-2 transition-all duration-300 ease-out cursor-pointer transform hover:-translate-y-0.5 ${
              activeTab === "contact"
                ? "italic font-medium underline underline-offset-8 opacity-100 scale-105"
                : "opacity-70 hover:opacity-100 hover:italic"
            }`}
          >
            contact
          </button>
        </nav>
      </header>

      {/* ── 2. HERO VIEWPORT: Fullscreen Cinema Video with Parallax Effect & On-Screen Contact ── */}
      <section className="relative w-full min-h-[100dvh] h-[100dvh] overflow-hidden bg-black flex flex-col justify-between items-center">
        {/* Parallax Background Video Layer */}
        <div
          className="absolute inset-0 w-full h-[120%] pointer-events-none z-0 overflow-hidden will-change-transform"
          style={{
            transform: `translate3d(0, ${scrollY * 0.35}px, 0)`,
            opacity: Math.max(0, 1 - scrollY / (windowHeight * 0.9)),
          }}
        >
          <video
            ref={videoRef}
            src={currentVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
          {/* Subtle uniform film shading - gently darkens when about or contact info is displayed */}
          <div
            className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${
              activeTab === "contact" || activeTab === "about" ? "bg-black/70 backdrop-blur-[2px]" : "bg-black/25"
            }`}
          />
          {/* Bottom vignette gradient merging seamlessly into the gallery */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent pointer-events-none" />
        </div>

        {/* ── Direct On-Screen Contact Information over the Main Video ── */}
        {activeTab === "contact" ? (
          <div className="relative z-20 w-full max-w-6xl px-5 sm:px-12 my-auto pt-24 sm:pt-32 pb-12 max-h-[calc(100dvh-110px)] overflow-y-auto mobile-touch-scroll overscroll-contain grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-12 text-white animate-cinema-fade">
            <div className="md:col-span-7 space-y-4 sm:space-y-6">
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 block">
                DIRECT INQUIRIES & COMMISSIONS
              </span>
              <a
                href={`mailto:${settings.contactEmail}`}
                className="block text-xl xs:text-2xl sm:text-4xl md:text-5xl font-light hover:italic transition-all duration-300 tracking-tight transform hover:translate-x-2 break-all sm:break-normal leading-snug"
              >
                {settings.contactEmail} ↗
              </a>
              <a
                href={`tel:${settings.contactPhone.replace(/\s+/g, "")}`}
                className="block text-xs sm:text-lg font-mono text-white/70 hover:text-white hover:italic transition-all duration-300 transform hover:translate-x-1"
              >
                {settings.contactPhone} (WhatsApp / Production Hotline)
              </a>
            </div>

            <div className="md:col-span-5 space-y-4 sm:space-y-6 font-mono text-xs sm:text-sm text-white/70 md:pl-8 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0">
              <div>
                <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                  REPRESENTATION
                </span>
                <p className="text-white font-light text-xs sm:text-sm">{settings.representation}</p>
              </div>

              <div>
                <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                  CHANNELS
                </span>
                <div className="flex flex-col space-y-2 text-white">
                  {(settings.channels && settings.channels.length > 0
                    ? settings.channels
                    : [
                        { id: "vimeo", name: "Vimeo Pro", url: settings.vimeoUrl || "https://vimeo.com" },
                        { id: "instagram", name: "Instagram Cinema", url: settings.instagramUrl || "https://instagram.com/vkhlamov" },
                      ]
                  ).map((channel) => (
                    <a
                      key={channel.id}
                      href={channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:italic hover:translate-x-1 transition-all duration-300 inline-block py-0.5 text-xs sm:text-sm"
                    >
                      {channel.name} ↗
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "about" ? (
          <div className="relative z-20 w-full max-w-6xl px-5 sm:px-12 my-auto pt-24 sm:pt-32 pb-14 max-h-[calc(100dvh-110px)] overflow-y-auto mobile-touch-scroll overscroll-contain grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-12 text-white animate-cinema-fade">
            <div className="md:col-span-7 space-y-4 sm:space-y-6">
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 block">
                {about.badge || "// PROFILE & DIRECTION"}
              </span>
              <p className="text-lg xs:text-xl sm:text-3xl md:text-4xl font-light leading-snug tracking-tight">
                {about.title}
              </p>
              <p className="text-xs sm:text-base text-white/70 leading-relaxed font-light max-w-2xl whitespace-pre-line">
                {about.bio}
              </p>
              {about.secondaryBio && (
                <p className="text-xs sm:text-base text-white/60 leading-relaxed font-light max-w-2xl whitespace-pre-line">
                  {about.secondaryBio}
                </p>
              )}
            </div>

            <div className="md:col-span-5 space-y-4 sm:space-y-6 font-mono text-xs sm:text-sm text-white/70 md:pl-8 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0">
              {about.disciplines && (
                <div>
                  <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                    {about.disciplinesTitle || "DISCIPLINES & FOCUS"}
                  </span>
                  <p className="text-white font-light text-xs sm:text-sm whitespace-pre-line">
                    {about.disciplines}
                  </p>
                </div>
              )}

              {about.accreditations && (
                <div>
                  <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                    {about.accreditationsTitle || "ACCREDITATIONS"}
                  </span>
                  <p className="text-white font-light text-xs sm:text-sm whitespace-pre-line">
                    {about.accreditations}
                  </p>
                </div>
              )}

              {about.base && (
                <div>
                  <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                    {about.baseTitle || "BASE & DEPLOYMENT"}
                  </span>
                  <p className="text-white font-light text-xs sm:text-sm whitespace-pre-line">
                    {about.base}
                  </p>
                </div>
              )}

              {about.customBlocks &&
                about.customBlocks.map((block) => (
                  <div key={block.id}>
                    <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                      {block.label}
                    </span>
                    <p className="text-white font-light text-xs sm:text-sm whitespace-pre-line">
                      {block.value}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* In basso: a sinistra copyright, in centro instagram, a destra email */}
        <div className="relative z-20 w-full px-4 sm:px-8 pb-4 sm:pb-8 flex flex-col sm:grid sm:grid-cols-3 gap-2.5 sm:gap-0 items-center justify-between text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/50 safe-bottom">
          {/* Left: Copyright */}
          <div className="text-center sm:text-left transition-colors duration-300">
            <Link
              href="/legal"
              className="hover:text-white hover:underline underline-offset-4 transition-all duration-300 cursor-pointer inline-block"
              title="Legal Notice, Privacy & Copyright"
            >
              © {new Date().getFullYear()} VALERIY KHLAMOV
            </Link>
          </div>

          {/* Center: Footer Links & Email */}
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
                  className="hover:text-white transition-all duration-300 transform hover:-translate-y-0.5 inline-flex items-center justify-center py-1 px-1.5"
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
              className="hover:text-white transition-all duration-300 transform hover:-translate-y-0.5 inline-flex items-center justify-center py-1 px-1.5"
            >
              <Mail className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform duration-300 hover:scale-110" />
            </a>
          </div>

          {/* Right */}
          <div className="hidden sm:block text-right" />
        </div>
      </section>

      {/* ── 3. PROJECTS SECTION: SIMPLE CLEAN IMAGE GALLERY ── */}
      <section
        id="projects"
        className="relative w-full min-h-screen bg-[#050505] py-14 sm:py-28 border-t border-white/[0.04]"
      >
        {/* Simple Clean Image Gallery with Hover Titles */}
        <MeanderGallery onSelectProject={onSelectProject} />
      </section>

      {/* ── FLOATING RETURN TO TOP BUTTON (NEVER OVERLAPS FOOTER & SAFE AREA AWARE) ── */}
      <button
        onClick={scrollToTop}
        aria-label="Torna in cima"
        title="Torna all'inizio"
        style={{
          bottom: footerOffset > 0 ? `calc(${footerOffset + 18}px + env(safe-area-inset-bottom, 0px))` : undefined,
        }}
        className={`fixed right-4 sm:right-8 z-40 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-full bg-black/85 hover:bg-black text-white/70 hover:text-white border border-white/20 hover:border-white/50 backdrop-blur-md font-mono text-[10px] sm:text-xs tracking-widest uppercase transition-[opacity,transform,background-color,border-color,color] duration-300 shadow-2xl hover:scale-105 active:scale-95 cursor-pointer group ${
          footerOffset === 0 ? "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-8" : ""
        } ${
          isScrolledToProjects
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
        <span>top</span>
      </button>

      {/* ── 4. MINIMAL CINEMA FOOTER (RESPONSIVE & SAFE AREA) ── */}
      <footer
        ref={footerRef}
        className="relative z-20 w-full py-6 px-4 sm:px-8 flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-0 items-center text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/50 bg-[#050505] border-t border-white/[0.06] safe-bottom"
      >
        {/* Left: Copyright */}
        <div className="text-center sm:text-left transition-colors duration-300">
          <Link
            href="/legal"
            className="hover:text-white hover:underline underline-offset-4 transition-all duration-300 cursor-pointer inline-block"
            title="Legal Notice, Privacy & Copyright"
          >
            © {new Date().getFullYear()} VALERIY KHLAMOV
          </Link>
        </div>

        {/* Center: Footer Links & Email */}
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
                className="hover:text-white transition-all duration-300 transform hover:-translate-y-0.5 inline-flex items-center justify-center py-1 px-1.5"
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
            className="hover:text-white transition-all duration-300 transform hover:-translate-y-0.5 inline-flex items-center justify-center py-1 px-1.5"
          >
            <Mail className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform duration-300 hover:scale-110" />
          </a>
        </div>

        {/* Right */}
        <div className="hidden sm:block text-right" />
      </footer>

    </div>
  );
}
