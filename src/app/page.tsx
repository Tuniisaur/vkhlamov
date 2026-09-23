"use client";

import { useState } from "react";
import CustomCursor from "@/components/CustomCursor";
import SoonHeroLayout from "@/components/SoonHeroLayout";
import ProjectModal from "@/components/ProjectModal";
import SmoothScroll from "@/components/SmoothScroll";
import { LocalizedProject } from "@/data/translations";

function HomeContent() {
  const [activeProject, setActiveProject] = useState<LocalizedProject | null>(null);

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f5f5f7]">
      {/* Minimal Luxury Custom Cursor */}
      <CustomCursor />

      {/* Ultra-Minimal Soon.global Cinema Layout */}
      <SoonHeroLayout onSelectProject={(p) => setActiveProject(p)} />

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
