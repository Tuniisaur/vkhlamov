import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";
import { LOCALIZED_PROJECTS, LocalizedProject } from "@/data/translations";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vkhlamov.com").replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // 1. Pagine principali statiche
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // 2. Pagine dinamiche dei singoli progetti
  let projectsList: { id: string; year?: string }[] = [];

  try {
    const dataFilePath = path.join(process.cwd(), "src", "data", "site-content.json");
    if (fs.existsSync(dataFilePath)) {
      const content = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
      if (Array.isArray(content.projects) && content.projects.length > 0) {
        projectsList = content.projects.map((p: LocalizedProject) => ({
          id: p.id,
          year: p.year,
        }));
      }
    }
  } catch (err) {
    console.warn("Could not load dynamic projects for sitemap, using fallback:", err);
  }

  if (projectsList.length === 0) {
    projectsList = LOCALIZED_PROJECTS.map((p) => ({
      id: p.id,
      year: p.year,
    }));
  }

  const projectRoutes: MetadataRoute.Sitemap = projectsList.map((project) => ({
    url: `${SITE_URL}/project/${project.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...projectRoutes];
}
