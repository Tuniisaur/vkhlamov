"use client";

import { useState } from "react";
import CustomCursor from "@/components/CustomCursor";
import SoonHeroLayout from "@/components/SoonHeroLayout";
import ProjectModal from "@/components/ProjectModal";
import SmoothScroll from "@/components/SmoothScroll";
import LogoPreloader from "@/components/LogoPreloader";
import { LocalizedProject } from "@/data/translations";

function HomeContent() {
  const [activeProject, setActiveProject] = useState<LocalizedProject | null>(null);
  const [isHeroReady, setIsHeroReady] = useState(false);

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f5f5f7]">
      {/* Framer Logo Preloader on opening the site */}
      <LogoPreloader isReady={isHeroReady} minDuration={0.8} maxDuration={2.5} />

      {/* Minimal Luxury Custom Cursor */}
      <CustomCursor />

      {/* Ultra-Minimal Soon.global Cinema Layout */}
      <SoonHeroLayout
        onSelectProject={(p) => setActiveProject(p)}
        onHeroReady={() => setIsHeroReady(true)}
      />

      {/* Fullscreen 4K Cinema Modal */}
      <ProjectModal
        project={activeProject}
        onClose={() => setActiveProject(null)}
      />
    </main>
  );
}

export default function Home() {
  return (
    <SmoothScroll>
      <HomeContent />
    </SmoothScroll>
  );
}
