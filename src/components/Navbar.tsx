"use client";

import { useState, useEffect } from "react";
import { sound } from "@/utils/audio";
import { Volume2, VolumeX, Menu, X } from "lucide-react";
import { TRANSLATIONS } from "@/data/translations";

export default function Navbar() {
  const t = TRANSLATIONS.en.nav;

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSoundToggle = () => {
    const newState = sound.toggle();
    setSoundEnabled(newState);
  };

  const navLinks = [
    { name: t.works, href: "#works" },
    { name: t.archive, href: "#archive" },
    { name: t.about, href: "#about" },
    { name: t.contact, href: "#contact" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          scrolled
            ? "bg-[#050505]/85 backdrop-blur-xl border-b border-white/[0.08] py-4 shadow-2xl"
            : "bg-transparent py-6 sm:py-8"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="flex items-center justify-between">
            {/* Minimal Brandmark */}
            <a
              href="#"
              onClick={() => sound.playRev()}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-white group-hover:bg-[#e0fe10] flex items-center justify-center text-black font-black text-[11px] tracking-tight transition-all duration-300 group-hover:scale-105 shadow-sm">
                VK
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm tracking-widest text-white font-bold group-hover:text-[#e0fe10] transition-colors duration-300">
                  VALERIO KHLAMOV
                </span>
                <span className="text-[9px] font-mono text-neutral-400 tracking-wider">
                  {t.tagline}
                </span>
              </div>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-7">
              <nav className="flex items-center gap-7 font-mono text-xs tracking-widest">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => sound.playBlip(600, 0.03)}
                    className="text-neutral-300 hover:text-white transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#e0fe10] hover:after:w-full after:transition-all"
                  >
                    {link.name}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                {/* Minimal Sound Feedback Toggle */}
                <button
                  type="button"
                  onClick={handleSoundToggle}
                  title={soundEnabled ? t.soundOn : t.soundOff}
                  className={`p-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
                    soundEnabled
                      ? "text-black bg-[#e0fe10] shadow-[0_0_15px_rgba(224,254,16,0.4)]"
                      : "text-neutral-400 hover:text-white glass-panel"
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Direct CTA */}
                <a
                  href="#contact"
                  onClick={() => sound.playRev()}
                  className="font-mono text-xs px-5 py-2.5 bg-white text-black hover:bg-neutral-200 font-bold rounded-full transition-all duration-300 tracking-wider shadow-md hover:shadow-lg"
                >
                  {t.bookBtn}
                </a>
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={handleSoundToggle}
                className="p-2 text-neutral-300"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[#e0fe10]" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white glass-panel rounded-full"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#050505]/98 backdrop-blur-2xl flex flex-col justify-center px-10 md:hidden">
          <div className="space-y-6 font-mono text-lg">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => {
                  sound.playBlip(550, 0.04);
                  setMobileMenuOpen(false);
                }}
                className="block text-neutral-300 hover:text-white transition-colors border-b border-white/[0.08] pb-4"
              >
                {link.name}
              </a>
            ))}

            <div className="pt-4">
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-4 bg-white text-black font-mono text-xs tracking-widest uppercase rounded-full font-bold"
              >
                {t.bookBtn}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


