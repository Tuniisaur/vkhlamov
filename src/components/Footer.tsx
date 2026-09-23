"use client";

import { sound } from "@/utils/audio";
import { ArrowUp } from "lucide-react";
import { TRANSLATIONS } from "@/data/translations";

export default function Footer() {
  const t = TRANSLATIONS.en.footer;

  const scrollToTop = () => {
    sound.playRev();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#050505] text-neutral-400 font-mono text-xs border-t border-white/[0.08] py-14">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/[0.08]">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-white text-base tracking-widest font-bold">
              VALERIO KHLAMOV
            </span>
            <div className="text-[11px] text-neutral-400 tracking-wider">
              {t.tagline}
            </div>
          </div>

          <div className="flex items-center gap-8 text-neutral-300">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => sound.playBlip(600, 0.03)}
              className="hover:text-[#e0fe10] transition-colors"
            >
              INSTAGRAM
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => sound.playBlip(600, 0.03)}
              className="hover:text-[#e0fe10] transition-colors"
            >
              YOUTUBE
            </a>
            <a
              href="https://vimeo.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => sound.playBlip(600, 0.03)}
              className="hover:text-[#e0fe10] transition-colors"
            >
              VIMEO
            </a>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors cursor-pointer glass-panel px-4 py-2 rounded-full"
          >
            <span>{t.backToTop}</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-[11px] text-neutral-500">
          <div>
            © {new Date().getFullYear()} {t.rights}
          </div>
          <div>
            {t.locations}
          </div>
        </div>
      </div>
    </footer>
  );
}


