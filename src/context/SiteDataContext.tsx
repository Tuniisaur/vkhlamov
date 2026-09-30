"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LOCALIZED_PROJECTS, LocalizedProject } from "@/data/translations";
import { setDynamicMediaBase } from "@/utils/mediaUrl";

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
  image?: string;
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
  image: "/images/still-2026-09-23-130212_1-2-1-5306.jpg",
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
  vatNumber?: string;
  about?: AboutSettings;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  heroVideo: "/videos/sfondo%20portfolio.mov",
  contactEmail: "valerio@vkhlamov.com",
  contactPhone: "+39 348 000 0000",
  representation: "Milan // London // Worldwide Direct Booking",
  vatNumber: "18341681007",
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

const LOCAL_STORAGE_KEY = "valerio_studio_site_data_v2";
const LEGACY_STORAGE_KEY = "valerio_studio_site_data_v1";

export interface SaveResult {
  ok: boolean;
  error?: string;
}

interface SiteDataContextType {
  projects: LocalizedProject[];
  settings: SiteSettings;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveAll: (projects: LocalizedProject[], settings: SiteSettings) => Promise<SaveResult>;
  updateProject: (project: LocalizedProject) => Promise<SaveResult>;
  addProject: (project: LocalizedProject) => Promise<SaveResult>;
  deleteProject: (id: string) => Promise<SaveResult>;
  reorderProjects: (fromIndex: number, toIndex: number) => Promise<SaveResult>;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<SaveResult>;
  resetToDefaults: () => Promise<SaveResult>;
  refreshData: () => Promise<void>;
}

const SiteDataContext = createContext<SiteDataContextType | undefined>(undefined);

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<LocalizedProject[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load data on mount: API is the single source of truth, avoiding stale or deleted project flashes
  const loadData = useCallback(async () => {
    try {
      // Clean legacy cache that could contain deleted projects
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          // Ignore
        }
      }

      // Fetch from backend API
      const res = await fetch("/api/content", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            about: {
              ...DEFAULT_ABOUT,
              ...(data.settings.about || {}),
            },
          }));
        }

        if (data.mediaBaseUrl) {
          setDynamicMediaBase(data.mediaBaseUrl);
        } else if (data.r2Status?.publicBase) {
          setDynamicMediaBase(data.r2Status.publicBase);
        }

        // Keep local cache synced
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        }
      } else {
        // Fallback to local storage if API is unreachable
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.projects)) {
              setProjects(parsed.projects);
            }
            if (parsed.settings) {
              setSettings((prev) => ({
                ...prev,
                ...parsed.settings,
                about: {
                  ...DEFAULT_ABOUT,
                  ...(parsed.settings.about || {}),
                },
              }));
            }
            if (parsed.mediaBaseUrl) {
              setDynamicMediaBase(parsed.mediaBaseUrl);
            } else if (parsed.r2Status?.publicBase) {
              setDynamicMediaBase(parsed.r2Status.publicBase);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not sync with /api/content, checking local cache", err);
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.projects)) {
              setProjects(parsed.projects);
            }
            if (parsed.settings) {
              setSettings((prev) => ({ ...prev, ...parsed.settings }));
            }
          }
        } catch {
          // Ignore parse error
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await loadData();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Persist both to state, localStorage and API
  const saveAll = async (
    newProjects: LocalizedProject[],
    newSettings: SiteSettings
  ): Promise<SaveResult> => {
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      setProjects(newProjects);
      setSettings(newSettings);

      const payload = {
        projects: newProjects,
        settings: newSettings,
        lastUpdated: new Date().toISOString(),
      };

      // 1. Instant local storage cache
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      }

      // 2. Persist to server disk via API
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error || `Server responded with status ${res.status}`;
        throw new Error(errMsg);
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return { ok: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Errore durante il salvataggio";
      console.error("Failed to save changes:", errMsg);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
      return { ok: false, error: errMsg };
    } finally {
      setIsSaving(false);
    }
  };

  const updateProject = async (project: LocalizedProject): Promise<SaveResult> => {
    const updated = projects.map((p) => (p.id === project.id ? project : p));
    return saveAll(updated, settings);
  };

  const addProject = async (project: LocalizedProject): Promise<SaveResult> => {
    const updated = [project, ...projects];
    return saveAll(updated, settings);
  };

  const deleteProject = async (id: string): Promise<SaveResult> => {
    const updated = projects.filter((p) => p.id !== id);
    return saveAll(updated, settings);
  };

  const reorderProjects = async (fromIndex: number, toIndex: number): Promise<SaveResult> => {
    if (
      fromIndex < 0 ||
      fromIndex >= projects.length ||
      toIndex < 0 ||
      toIndex >= projects.length
    ) {
      return { ok: false, error: "Indice non valido" };
    }
    const updated = [...projects];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    return saveAll(updated, settings);
  };

  const updateSettings = async (newSettings: Partial<SiteSettings>): Promise<SaveResult> => {
    const merged = { ...settings, ...newSettings };
    return saveAll(projects, merged);
  };

  const resetToDefaults = async (): Promise<SaveResult> => {
    const defaultData = {
      projects: LOCALIZED_PROJECTS,
      settings: DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return saveAll(defaultData.projects, defaultData.settings);
  };

  return (
    <SiteDataContext.Provider
      value={{
        projects,
        settings,
        isLoading,
        isSaving,
        saveStatus,
        saveAll,
        updateProject,
        addProject,
        deleteProject,
        reorderProjects,
        updateSettings,
        resetToDefaults,
        refreshData: loadData,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData() {
  const context = useContext(SiteDataContext);
  if (!context) {
    throw new Error("useSiteData must be used within a SiteDataProvider");
  }
  return context;
}
