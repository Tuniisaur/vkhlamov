import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { LOCALIZED_PROJECTS, LocalizedProject } from "@/data/translations";
import { isRequestAuthenticated } from "@/utils/serverAuth";
import { isR2Configured, getR2Content, putR2Content, getR2Status, getR2BucketName } from "@/utils/r2";

export interface SocialChannel {
  id: string;
  name: string;
  url: string;
}

export interface FooterLink {
  id: string;
  label: string;
  url: string;
}

export interface AboutInfoBlock {
  id: string;
  label: string;
  value: string;
}

export interface AboutSettings {
  badge: string;
  title: string;
  bio: string;
  secondaryBio?: string;
  disciplinesTitle: string;
  disciplines: string;
  accreditationsTitle: string;
  accreditations: string;
  baseTitle: string;
  base: string;
  customBlocks?: AboutInfoBlock[];
}

export const DEFAULT_ABOUT: AboutSettings = {
  badge: "// PROFILE & DIRECTION",
  title: "Valerio Khlamov is a Director of Photography and High-Speed Pursuit Cinematographer based in Milan.",
  bio: "Specialized in high-speed pursuit cinematography and visceral automotive storytelling. Directing commercial campaigns and trackside cinema for Formula, GT, WEC, and premier automotive manufacturers worldwide.",
  secondaryBio: "",
  disciplinesTitle: "DISCIPLINES & FOCUS",
  disciplines: "Automotive Commercials • Trackside Racing Cinema • High-Speed Pursuit Direction",
  accreditationsTitle: "ACCREDITATIONS",
  accreditations: "FIA Formula & WEC Trackside Paddock Access • Hot Pit Lane Certified",
  baseTitle: "BASE & DEPLOYMENT",
  base: "Milan, Italy • Available Worldwide for Commercial & Trackside Projects",
  customBlocks: [],
};

export interface SiteSettings {
  heroVideo: string;
  contactEmail: string;
  contactPhone: string;
  representation: string;
  channels: SocialChannel[];
  footerLinks: FooterLink[];
  instagramUrl?: string;
  vimeoUrl?: string;
  about?: AboutSettings;
}

export interface SiteDataPayload {
  projects: LocalizedProject[];
  settings: SiteSettings;
  lastUpdated?: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  heroVideo: "/videos/sfondo%20portfolio.mov",
  contactEmail: "valerio@vkhlamov.com",
  contactPhone: "+39 348 000 0000",
  representation: "Milan // London // Worldwide Direct Booking",
  channels: [
    { id: "vimeo", name: "Vimeo Pro", url: "https://vimeo.com" },
    { id: "instagram", name: "Instagram Cinema", url: "https://instagram.com/vkhlamov" },
    { id: "youtube", name: "YouTube 4K", url: "https://youtube.com" },
  ],
  footerLinks: [
    { id: "instagram", label: "Instagram ↗", url: "https://instagram.com/vkhlamov" },
  ],
  instagramUrl: "https://instagram.com/vkhlamov",
  vimeoUrl: "https://vimeo.com",
  about: DEFAULT_ABOUT,
};

const DATA_FILE_PATH = path.join(process.cwd(), "src", "data", "site-content.json");

export async function GET() {
  const r2Status = getR2Status();

  try {
    // 1. If Cloudflare R2 is configured, load content from R2
    if (isR2Configured()) {
      try {
        const r2Data = await getR2Content<SiteDataPayload>("site-content.json");
        if (r2Data && Array.isArray(r2Data.projects)) {
          return NextResponse.json({ ...r2Data, r2Status });
        }
      } catch (r2Err) {
        console.warn("Could not read site-content from R2, falling back to local:", r2Err);
      }
    }

    // 2. Read local disk file
    const fileExists = await fs
      .access(DATA_FILE_PATH)
      .then(() => true)
      .catch(() => false);

    if (fileExists) {
      const raw = await fs.readFile(DATA_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return NextResponse.json({ ...parsed, r2Status });
    }

    // Fallback: return default data
    const initialData: SiteDataPayload = {
      projects: LOCALIZED_PROJECTS,
      settings: DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({ ...initialData, r2Status });
  } catch (err: unknown) {
    console.error("Error reading site content:", err);
    return NextResponse.json(
      {
        projects: LOCALIZED_PROJECTS,
        settings: DEFAULT_SETTINGS,
        lastUpdated: new Date().toISOString(),
        r2Status,
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SiteDataPayload;

    if (!body || !Array.isArray(body.projects)) {
      return NextResponse.json(
        { error: "Invalid data format: projects must be an array" },
        { status: 400 }
      );
    }

    const payloadToSave: SiteDataPayload = {
      projects: body.projects,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(body.settings || {}),
        about: {
          ...DEFAULT_ABOUT,
          ...(body.settings?.about || {}),
        },
      },
      lastUpdated: new Date().toISOString(),
    };

    let savedToR2 = false;
    let savedToDisk = false;
    let r2ErrorMsg: string | null = null;

    // 1. If Cloudflare R2 is configured, persist directly to R2 bucket (works on Vercel without filesystem limits)
    if (isR2Configured()) {
      try {
        await putR2Content("site-content.json", payloadToSave);
        savedToR2 = true;
      } catch (r2Err) {
        console.error("Cloudflare R2 put error:", r2Err);
        r2ErrorMsg = r2Err instanceof Error ? r2Err.message : String(r2Err);
      }
    }

    // 2. Also try writing to local disk (for offline local development)
    try {
      await fs.writeFile(DATA_FILE_PATH, JSON.stringify(payloadToSave, null, 2), "utf-8");
      savedToDisk = true;
    } catch (fsErr) {
      // In serverless environments with read-only root filesystems (e.g. Vercel), this is expected
      console.warn("Local disk write skipped in serverless environment:", fsErr);
    }

    if (!savedToR2 && !savedToDisk) {
      const missingVars = getR2Status().missing;
      const details = r2ErrorMsg
        ? `Errore Cloudflare R2: ${r2ErrorMsg} [Bucket: "${getR2BucketName()}"]`
        : missingVars.length > 0
        ? `Cloudflare R2 non configurato su Vercel (mancano: ${missingVars.join(", ")})`
        : "Impossibile scrivere sia su R2 che su disco.";

      return NextResponse.json(
        {
          error: `Salvataggio non riuscito: ${details}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contenuti aggiornati e salvati con successo.",
      data: payloadToSave,
    });
  } catch (err: unknown) {
    console.error("Error saving site content:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to persist changes", details: message },
      { status: 500 }
    );
  }
}
