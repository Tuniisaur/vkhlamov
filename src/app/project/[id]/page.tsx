import fs from "fs";
import path from "path";
import { LOCALIZED_PROJECTS } from "@/data/translations";
import ProjectDetailClient from "@/components/ProjectDetailClient";

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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = await params;
  return <ProjectDetailClient key={resolvedParams.id} projectId={resolvedParams.id} />;
}
