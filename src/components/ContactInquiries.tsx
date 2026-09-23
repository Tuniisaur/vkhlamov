"use client";

import { useState } from "react";
import { sound } from "@/utils/audio";
import { Mail, Phone, MapPin, Globe, Send, CheckCircle2, ArrowUpRight } from "lucide-react";
import { TRANSLATIONS } from "@/data/translations";

export default function ContactInquiries() {
  const t = TRANSLATIONS.en.contact;

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "commercial",
    brief: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playRev();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="py-24 sm:py-32 bg-[#050505] border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left Column: Direct Info & Representation (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs text-neutral-400 tracking-[0.25em] uppercase">
                <Send className="w-3.5 h-3.5 text-[#e0fe10]" />
                <span>{t.badge}</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase leading-[0.95]">
                {t.title}<span className="text-[#e0fe10]">.</span>
              </h2>
            </div>

            <p className="text-neutral-400 text-sm sm:text-base font-light leading-relaxed">
              {t.subtitle}
            </p>

            {/* Contact Cards */}
            <div className="space-y-3.5 pt-4 font-mono text-xs">
              {/* Direct Production Email */}
              <div className="p-4 rounded-xl glass-panel space-y-1">
                <span className="text-neutral-400 block text-[10px] uppercase flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#e0fe10]" />
                  {t.directEmailLabel}
                </span>
                <a
                  href={`mailto:${t.directEmail}`}
                  onClick={() => sound.playBlip(750, 0.02)}
                  className="text-white hover:text-[#e0fe10] transition-colors text-sm sm:text-base font-sans font-bold block"
                >
                  {t.directEmail}
                </a>
              </div>

              {/* Trackside Hotline */}
              <div className="p-4 rounded-xl glass-panel space-y-1">
                <span className="text-neutral-400 block text-[10px] uppercase flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#e0fe10]" />
                  {t.hotlineLabel}
                </span>
                <a
                  href={`tel:${t.hotline.replace(/\s+/g, "")}`}
                  onClick={() => sound.playBlip(750, 0.02)}
                  className="text-white hover:text-[#e0fe10] transition-colors text-sm font-semibold block"
                >
                  {t.hotline}
                </a>
              </div>

              {/* Headquarters & Representation */}
              <div className="p-4 rounded-xl glass-panel space-y-2">
                <div className="space-y-0.5">
                  <span className="text-neutral-400 block text-[10px] uppercase flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#e0fe10]" />
                    {t.hqLabel}
                  </span>
                  <div className="text-neutral-200 text-xs font-semibold">{t.hq}</div>
                  <div className="text-neutral-400 text-[11px] font-sans font-light">{t.hqDetails}</div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] space-y-0.5">
                  <span className="text-neutral-400 block text-[10px] uppercase flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#e0fe10]" />
                    {t.representationLabel}
                  </span>
                  <div className="text-neutral-300 text-[11px] font-sans font-light">
                    {t.representation}
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="pt-2 flex items-center gap-4 text-[11px] text-neutral-400">
                <a
                  href="https://vimeo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>{t.vimeoLabel}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                <span>•</span>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>{t.instagramLabel}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                <span>•</span>
                <a
                  href="https://imdb.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>{t.imdbLabel}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Production Inquiry Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-10 rounded-2xl glass-panel border border-white/[0.08] relative">
              {submitted ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#e0fe10]/10 border border-[#e0fe10]/30 flex items-center justify-center mx-auto text-[#e0fe10]">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white uppercase tracking-tight">
                    {t.successTitle}
                  </h3>
                  <p className="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">
                    {t.successMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-6 py-2.5 rounded-full border border-white/20 text-neutral-300 hover:text-white hover:border-white font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
                  >
                    {t.sendAnother}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs text-neutral-300 tracking-wider uppercase">
                      {t.formName}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.formNamePl}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-[#e0fe10] transition-colors text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs text-neutral-300 tracking-wider uppercase">
                      {t.formEmail}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder={t.formEmailPl}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-[#e0fe10] transition-colors text-sm"
                    />
                  </div>

                  {/* Production Type */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs text-neutral-300 tracking-wider uppercase">
                      {t.formType}
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-sm cursor-pointer"
                    >
                      <option value="commercial" className="bg-[#121214] text-white">
                        {t.formType1}
                      </option>
                      <option value="raceweekend" className="bg-[#121214] text-white">
                        {t.formType2}
                      </option>
                      <option value="pursuit" className="bg-[#121214] text-white">
                        {t.formType3}
                      </option>
                      <option value="documentary" className="bg-[#121214] text-white">
                        {t.formType4}
                      </option>
                    </select>
                  </div>

                  {/* Project Brief */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs text-neutral-300 tracking-wider uppercase">
                      {t.formBrief}
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder={t.formBriefPl}
                      value={formData.brief}
                      onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:border-[#e0fe10] transition-colors text-sm resize-none"
                    />
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-[#e0fe10] text-black font-mono text-xs font-bold tracking-widest uppercase hover:bg-[#cbf105] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#e0fe10]/15"
                  >
                    <span>{t.formSubmit}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
