import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vkhlamov.com").replace(/\/+$/, "");

function generateSitemap() {
  const dataFilePath = path.join(rootDir, "src", "data", "site-content.json");
  let projects = [];

  try {
    if (fs.existsSync(dataFilePath)) {
      const data = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
      if (Array.isArray(data.projects)) {
        projects = data.projects;
      }
    }
  } catch (err) {
    console.warn("Could not read site-content.json:", err);
  }

  // Fallback se il file JSON non ha progetti
  if (projects.length === 0) {
    projects = [{ id: "formula-apex-hunter" }];
  }

  const today = new Date().toISOString().split("T")[0];

  const urls = [
    {
      loc: `${SITE_URL}/`,
      lastmod: today,
      changefreq: "weekly",
      priority: "1.0",
    },
    ...projects.map((p) => ({
      loc: `${SITE_URL}/project/${p.id}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.8",
    })),
    {
      loc: `${SITE_URL}/legal`,
      lastmod: today,
      changefreq: "yearly",
      priority: "0.3",
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  const publicDir = path.join(rootDir, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapDest = path.join(publicDir, "sitemap.xml");
  fs.writeFileSync(sitemapDest, xml, "utf-8");
  console.log(`✓ Sitemap XML generata con successo in: ${sitemapDest}`);

  // Genera anche robots.txt statico di fallback in public/robots.txt
  const robotsTxt = `# Valeriy Khlamov Official Portfolio
# https://vkhlamov.com

User-agent: *
Allow: /
Allow: /project/
Allow: /legal

Disallow: /admin
Disallow: /admin/
Disallow: /manage
Disallow: /manage/
Disallow: /api/
Disallow: /_next/

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${SITE_URL}
`;

  const robotsDest = path.join(publicDir, "robots.txt");
  fs.writeFileSync(robotsDest, robotsTxt, "utf-8");
  console.log(`✓ Robots.txt generato con successo in: ${robotsDest}`);
}

generateSitemap();
