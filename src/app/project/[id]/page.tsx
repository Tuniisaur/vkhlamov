import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { LOCALIZED_PROJECTS, LocalizedProject } from "@/data/translations";
import ProjectDetailClient from "@/components/ProjectDetailClient";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vkhlamov.com").replace(/\/+$/, "");

function getProjectById(id: string): LocalizedProject | undefined {
  try {
    const dataFilePath = path.join(process.cwd(), "src", "data", "site-content.json");
    if (fs.existsSync(dataFilePath)) {
      const content = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
      if (Array.isArray(content.projects)) {
        const found = content.projects.find((p: LocalizedProject) => p.id === id);
        if (found) return found;
      }
    }
  } catch {
    // Fallback below
  }
  return LOCALIZED_PROJECTS.find((p) => p.id === id);
}

export function generateStaticParams() {
  try {
    const dataFilePath = path.join(process.cwd(), "src", "data", "site-content.json");
    if (fs.existsSync(dataFilePath)) {
      const content = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
      if (Array.isArray(content.projects) && content.projects.length > 0) {
        return content.projects.map((project: { id: string }) => ({
          id: project.id,
        }));
      }
    }
  } catch {
    // Fallback to active projects
  }

  return LOCALIZED_PROJECTS.map((project) => ({
    id: project.id,
  }));
}

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);

  if (!project) {
    return {
      title: "Project Not Found // Valeriy Khlamov",
      description: "Automotive & motorsport cinematography by Valeriy Khlamov.",
      robots: { index: false, follow: false },
    };
  }

  const rawTitle =
    (typeof project.title === "object"
      ? project.title.en || project.title.it
      : project.title) || "Motorsport Cinema";
  const cleanTitle = rawTitle.replace(/^\/\/\s*/, "").trim();

  // Title tag (max 60 caratteri)
  const title = `${cleanTitle} // Valeriy Khlamov`.slice(0, 60);

  // Meta Description (150-160 caratteri)
  const rawDesc =
    typeof project.description === "object"
      ? project.description.en || project.description.it || ""
      : project.description || "";

  const locationPart = project.location ? ` at ${project.location}` : "";
  const categoryPart = project.category ? ` [${project.category.toUpperCase()}]` : "";
  const fallbackDesc = `Explore ${cleanTitle}${categoryPart}${locationPart} directed by Valeriy Khlamov. High-speed racing visual cinematography, onboard pursuit and 4K cinema frames.`;

  const baseDesc = (rawDesc.trim() || fallbackDesc).replace(/\s+/g, " ");
  const description =
    baseDesc.length > 158
      ? `${baseDesc.slice(0, 155)}...`
      : baseDesc.padEnd(150, " ").trim();

  const ogImage = project.posterImage || project.stills?.[0]?.url || "/images/gt-night-race.jpg";
  const absoluteOgImage = ogImage.startsWith("http")
    ? ogImage
    : `${SITE_URL}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`;

  const canonicalUrl = `${SITE_URL}/project/${project.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "video.other",
      url: canonicalUrl,
      title,
      description,
      siteName: "Valeriy Khlamov Cinematography",
      images: [
        {
          url: absoluteOgImage,
          width: 1920,
          height: 1080,
          alt: `${cleanTitle} — Directed by Valeriy Khlamov`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteOgImage],
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params;
  return <ProjectDetailClient key={resolvedParams.id} projectId={resolvedParams.id} />;
}
