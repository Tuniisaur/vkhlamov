"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useSiteData,
  SocialChannel,
  FooterLink,
  AboutSettings,
  AboutInfoBlock,
  DEFAULT_ABOUT,
} from "@/context/SiteDataContext";
import { LocalizedProject, ProjectStill } from "@/data/translations";
import { detectVideoDuration } from "@/utils/videoDuration";
import { resolveMediaUrl } from "@/utils/mediaUrl";

export default function ManagePage() {
  const {
    projects,
    settings,
    saveAll,
    updateProject,
    addProject,
    deleteProject,
    reorderProjects,
    updateSettings,
    resetToDefaults,
    isSaving,
    saveStatus,
  } = useSiteData();

  // Authentication State (Server-backed & Cryptographic)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Change PIN State
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [pinSuccessMsg, setPinSuccessMsg] = useState("");
  const [pinChangeErrorMsg, setPinChangeErrorMsg] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    "projects" | "hero" | "about" | "contact" | "media" | "backup"
  >("projects");

  // Dynamic media files list from server (/public/videos and /public/images)
  const [mediaFiles, setMediaFiles] = useState<{
    videos: { name: string; path: string; size: string; key?: string }[];
    images: { name: string; path: string; size: string; key?: string }[];
  }>({ videos: [], images: [] });
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [r2Info, setR2Info] = useState<{
    configured: boolean;
    missing: string[];
    publicUrlConfigured?: boolean;
    publicBase?: string;
  } | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setMediaFiles(data);
      }
    } catch (err) {
      console.warn("Could not fetch media list:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch("/api/media");
        if (res.ok && !ignore) {
          const data = await res.json();
          setMediaFiles(data);
        }
      } catch (err) {
        console.warn("Could not fetch media list:", err);
      }

      // Check R2 status from content endpoint
      try {
        const contentRes = await fetch("/api/content");
        if (contentRes.ok && !ignore) {
          const contentData = await contentRes.json();
          if (contentData.r2Status) {
            setR2Info(contentData.r2Status);
          }
        }
      } catch {}
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleUploadFile = async (
    file: File,
    category?: "video" | "image"
  ): Promise<string | null> => {
    // 1. Direct upload to Cloudflare R2 via Presigned S3 URL (bypasses server payload limits for large videos)
    try {
      const presignedRes = await fetch("/api/media/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: category === "video" ? "videos" : (category === "image" ? "images" : undefined),
        }),
      });

      if (presignedRes.ok) {
        const presignedData = await presignedRes.json();
        if (presignedData.r2 && presignedData.uploadUrl) {
          const headers: Record<string, string> = {};
          if (file.type) {
            headers["Content-Type"] = file.type;
          }
          const uploadRes = await fetch(presignedData.uploadUrl, {
            method: "PUT",
            body: file,
            headers,
          });

          if (uploadRes.ok) {
            await fetchMedia();
            return presignedData.publicUrl;
          }
          console.warn(`Presigned R2 PUT returned status ${uploadRes.status}, falling back to server upload.`);
        }
      }
    } catch (presignedErr: unknown) {
      console.warn("Upload diretto R2 via presigned URL non riuscito (es. policy bucket o CORS):", presignedErr);
    }

    // 2. Server Upload Fallback (uploads directly to R2 bucket via server-side S3 client)
    const fd = new FormData();
    fd.append("file", file);
    if (category) fd.append("type", category);
    const res = await fetch("/api/media", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Upload fallito");
    }
    const data = await res.json();
    await fetchMedia();
    return data.path;
  };

  const handleDeleteMedia = async (filePath: string, key?: string) => {
    const name = decodeURIComponent(filePath).split("/").pop();
    if (!confirm(`Eliminare definitivamente "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, key }),
      });
      if (res.ok) {
        await fetchMedia();
      } else {
        const data = await res.json();
        alert(data.error || "Errore durante l'eliminazione");
      }
    } catch {
      alert("Errore di rete durante l'eliminazione");
    }
  };

  // Dynamic media files list (direct from Cloudflare R2 / server)
  const activeVideos = mediaFiles.videos || [];
  const activeImages = mediaFiles.images || [];

  // Project Editing Modal State
  const [editingProject, setEditingProject] = useState<LocalizedProject | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isCalculatingDuration, setIsCalculatingDuration] = useState(false);
  const [isBatchCalculating, setIsBatchCalculating] = useState(false);

  // Hero Video Form State
  const [heroVideoUrl, setHeroVideoUrl] = useState(settings.heroVideo);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    representation: settings.representation,
    instagramUrl: settings.instagramUrl,
    vimeoUrl: settings.vimeoUrl,
  });

  const [channels, setChannels] = useState<SocialChannel[]>(
    settings.channels || [
      { id: "vimeo", name: "Vimeo Pro", url: "https://vimeo.com" },
      { id: "instagram", name: "Instagram Cinema", url: "https://instagram.com/vkhlamov" },
      { id: "youtube", name: "YouTube 4K", url: "https://youtube.com" },
    ]
  );
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelUrl, setNewChannelUrl] = useState("");

  // Footer Center Links State
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>(
    settings.footerLinks || [
      { id: "instagram", label: "Instagram ↗", url: "https://instagram.com/vkhlamov" },
    ]
  );
  const [newFooterLabel, setNewFooterLabel] = useState("");
  const [newFooterUrl, setNewFooterUrl] = useState("");

  // About Form State
  const [aboutForm, setAboutForm] = useState<AboutSettings>(
    settings.about || DEFAULT_ABOUT
  );
  const [newBlockLabel, setNewBlockLabel] = useState("");
  const [newBlockValue, setNewBlockValue] = useState("");

  // Copied path notification
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // New Still input in project editor
  const [newStillUrl, setNewStillUrl] = useState("");

  // Sync state when context settings load
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroVideoUrl(settings.heroVideo);
      setContactForm({
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        representation: settings.representation,
        instagramUrl: settings.instagramUrl,
        vimeoUrl: settings.vimeoUrl,
      });
      if (settings.channels && settings.channels.length > 0) {
        setChannels(settings.channels);
      }
      if (settings.footerLinks && settings.footerLinks.length > 0) {
        setFooterLinks(settings.footerLinks);
      }
      if (settings.about) {
        setAboutForm({
          ...DEFAULT_ABOUT,
          ...settings.about,
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [settings]);

  // Check active server session on mount
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsAuthenticated(Boolean(data.authenticated));
          }
        }
      } catch (err) {
        console.warn("Session check failed:", err);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Countdown timer if locked out
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setPinError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim() || isSubmittingPin || lockoutSeconds > 0) return;

    setIsSubmittingPin(true);
    setPinError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPinInput("");
        setPinError("");
        fetchMedia();
      } else {
        if (res.status === 429 && data.lockoutRemainingSeconds) {
          setLockoutSeconds(data.lockoutRemainingSeconds);
          setPinError(data.error || "Troppi tentativi falliti. Riprova più tardi.");
        } else {
          let errText = data.error || "PIN non corretto";
          if (typeof data.remainingAttempts === "number") {
            errText += ` (${data.remainingAttempts} tentativi rimasti)`;
          }
          setPinError(errText);
        }
      }
    } catch {
      setPinError("Errore di connessione con il server");
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setIsAuthenticated(false);
    setPinInput("");
    setPinError("");
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPinInput || !newPinInput || isChangingPin) return;

    if (newPinInput.length < 6) {
      setPinChangeErrorMsg("Il nuovo PIN deve contenere almeno 6 caratteri");
      return;
    }

    setIsChangingPin(true);
    setPinChangeErrorMsg("");
    setPinSuccessMsg("");

    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: currentPinInput,
          newPin: newPinInput,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPinSuccessMsg("PIN aggiornato con successo sul server.");
        setCurrentPinInput("");
        setNewPinInput("");
        setTimeout(() => setPinSuccessMsg(""), 4000);
      } else {
        setPinChangeErrorMsg(data.error || "Impossibile aggiornare il PIN");
      }
    } catch {
      setPinChangeErrorMsg("Errore di rete durante l'aggiornamento del PIN");
    } finally {
      setIsChangingPin(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2500);
  };

  // Open Project Editor
  const handleOpenEdit = (project: LocalizedProject) => {
    const cloned = JSON.parse(JSON.stringify(project));
    setEditingProject(cloned);
    setIsCreatingNew(false);

    // If duration is empty or missing, detect it automatically in background
    if (!cloned.duration && (cloned.fullVideoUrl || cloned.videoPreviewUrl)) {
      detectVideoDuration(cloned.fullVideoUrl || cloned.videoPreviewUrl).then((dur) => {
        if (dur) {
          setEditingProject((prev) => (prev && prev.id === cloned.id ? { ...prev, duration: dur } : prev));
        }
      });
    }
  };

  const handleOpenCreateNew = () => {
    const newId = `project-${Date.now().toString().slice(-4)}`;
    const blankProject: LocalizedProject = {
      id: newId,
      title: {
        en: "NEW CINEMA PROJECT",
        it: "NEW CINEMA PROJECT",
      },
      subtitle: {
        en: "High-speed trackside pursuit cinema",
        it: "High-speed trackside pursuit cinema",
      },
      category: "gt",
      categoryLabel: {
        en: "FORMULA & GT",
        it: "FORMULA & GT",
      },
      year: new Date().getFullYear().toString(),
      client: "Brand Name / Team",
      location: "Autodromo Nazionale Monza, Italy",
      duration: "",
      posterImage: "/images/gt-night-race.jpg",
      videoPreviewUrl: "/videos/formula.webm",
      fullVideoUrl: "/videos/formula.webm",
      telemetry: {
        speed: "310 KM/H",
        gForce: "4.0 G",
        track: "CIRCUITO MONZA",
        timecode: "00:02:30:00",
      },
      description: {
        en: "Film description...",
        it: "Film description...",
      },
      featured: true,
      stills: [
        {
          url: "/images/gt-night-race.jpg",
          caption: { it: "", en: "" },
        },
        {
          url: "/images/filmmaker-paddock.jpg",
          caption: { it: "", en: "" },
        },
      ],
    };
    setEditingProject(blankProject);
    setIsCreatingNew(true);
  };

  // Save Project from Editor
  const handleSaveProjectModal = async () => {
    if (!editingProject) return;

    const projectToSave = { ...editingProject };
    // If duration is not set, calculate automatically from video before saving
    if (!projectToSave.duration && (projectToSave.fullVideoUrl || projectToSave.videoPreviewUrl)) {
      const autoDur = await detectVideoDuration(projectToSave.fullVideoUrl || projectToSave.videoPreviewUrl);
      if (autoDur) {
        projectToSave.duration = autoDur;
      }
    }

    const res = isCreatingNew
      ? await addProject(projectToSave)
      : await updateProject(projectToSave);

    if (res.ok) {
      setEditingProject(null);
    } else {
      alert(`Impossibile salvare il progetto:\n${res.error || "Errore sconosciuto"}`);
    }
  };

  // Batch calculate durations for all existing projects
  const handleBatchRecalculateDurations = async () => {
    if (projects.length === 0) return;
    setIsBatchCalculating(true);
    let updatedCount = 0;
    try {
      const updated = await Promise.all(
        projects.map(async (p) => {
          const videoUrl = p.fullVideoUrl || p.videoPreviewUrl;
          if (!videoUrl) return p;
          const dur = await detectVideoDuration(videoUrl);
          if (dur && dur !== p.duration) {
            updatedCount++;
            return { ...p, duration: dur };
          }
          return p;
        })
      );
      if (updatedCount > 0) {
        const res = await saveAll(updated, settings);
        if (res.ok) {
          alert(`Durata calcolata e aggiornata con successo per ${updatedCount} progetti.`);
        } else {
          alert(`Impossibile aggiornare le durate:\n${res.error || "Errore sconosciuto"}`);
        }
      } else {
        alert("Tutte le durate dei progetti sono già aggiornate.");
      }
    } catch (e) {
      console.error("Batch duration calculation error:", e);
      alert("Si è verificato un errore durante il calcolo automatico delle durate.");
    } finally {
      setIsBatchCalculating(false);
    }
  };

  // Add Still to currently editing project
  const handleAddStill = (urlToAdd?: string) => {
    if (!editingProject) return;
    const url = urlToAdd || newStillUrl.trim();
    if (!url) return;

    const newStill: ProjectStill = {
      url,
      caption: { it: "", en: "" },
    };

    setEditingProject({
      ...editingProject,
      stills: [...(editingProject.stills || []), newStill],
    });
    setNewStillUrl("");
  };

  // Remove Still
  const handleRemoveStill = (indexToRemove: number) => {
    if (!editingProject || !editingProject.stills) return;
    const updated = editingProject.stills.filter((_, idx) => idx !== indexToRemove);
    setEditingProject({
      ...editingProject,
      stills: updated,
    });
  };

  // Save Hero Video
  const handleSaveHeroVideo = async () => {
    await updateSettings({ heroVideo: heroVideoUrl });
  };

  const handleAddChannel = () => {
    if (!newChannelName.trim() || !newChannelUrl.trim()) return;
    const newChan: SocialChannel = {
      id: `channel-${Date.now()}`,
      name: newChannelName.trim(),
      url: newChannelUrl.trim(),
    };
    setChannels((prev) => [...prev, newChan]);
    setNewChannelName("");
    setNewChannelUrl("");
  };

  const handleRemoveChannel = (idToRemove: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== idToRemove));
  };

  const handleUpdateChannel = (id: string, updated: Partial<SocialChannel>) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  };

  // Footer Links Handlers
  const handleAddFooterLink = () => {
    if (!newFooterLabel.trim() || !newFooterUrl.trim()) return;
    const newLink: FooterLink = {
      id: `footer-link-${Date.now()}`,
      label: newFooterLabel.trim(),
      url: newFooterUrl.trim(),
    };
    setFooterLinks((prev) => [...prev, newLink]);
    setNewFooterLabel("");
    setNewFooterUrl("");
  };

  const handleRemoveFooterLink = (idToRemove: string) => {
    setFooterLinks((prev) => prev.filter((l) => l.id !== idToRemove));
  };

  const handleUpdateFooterLink = (id: string, updated: Partial<FooterLink>) => {
    setFooterLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updated } : l))
    );
  };

  // Save Contact & Footer Info
  const handleSaveContact = async () => {
    await updateSettings({
      ...contactForm,
      channels,
      footerLinks,
      instagramUrl:
        channels.find((c) => c.name.toLowerCase().includes("instagram"))?.url ||
        contactForm.instagramUrl,
      vimeoUrl:
        channels.find((c) => c.name.toLowerCase().includes("vimeo"))?.url ||
        contactForm.vimeoUrl,
    });
  };

  // Save About Info
  const handleSaveAbout = async () => {
    await updateSettings({
      about: aboutForm,
    });
  };

  const handleAddCustomBlock = () => {
    if (!newBlockLabel.trim() || !newBlockValue.trim()) return;
    const block: AboutInfoBlock = {
      id: `block-${Date.now()}`,
      label: newBlockLabel.trim().toUpperCase(),
      value: newBlockValue.trim(),
    };
    setAboutForm((prev) => ({
      ...prev,
      customBlocks: [...(prev.customBlocks || []), block],
    }));
    setNewBlockLabel("");
    setNewBlockValue("");
  };

  const handleRemoveCustomBlock = (id: string) => {
    setAboutForm((prev) => ({
      ...prev,
      customBlocks: (prev.customBlocks || []).filter((b) => b.id !== id),
    }));
  };

  const handleUpdateCustomBlock = (id: string, updated: Partial<AboutInfoBlock>) => {
    setAboutForm((prev) => ({
      ...prev,
      customBlocks: (prev.customBlocks || []).map((b) =>
        b.id === id ? { ...b, ...updated } : b
      ),
    }));
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      projects,
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `valerio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.projects)) {
          const newSettings = parsed.settings || settings;
          await saveAll(parsed.projects, newSettings);
          alert("Backup ripristinato con successo.");
        } else {
          alert("File JSON non valido.");
        }
      } catch {
        alert("Errore nella lettura del file JSON.");
      }
    };
    reader.readAsText(file);
  };

  // ── 1. LOADING SCREEN MENTRE SI VERIFICA LA SESSIONE SICURA ──
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#ececec] flex flex-col items-center justify-center p-6 font-mono">
        <div className="flex items-center gap-3 text-xs text-white/50 tracking-widest">
          <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
          <span>[ VERIFICA SESSIONE SICURA... ]</span>
        </div>
      </div>
    );
  }

  // ── 2. FORTIFIED LOCK SCREEN ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#ececec] flex flex-col justify-between p-6 sm:p-12 font-mono selection:bg-white selection:text-black">
        {/* Top security header */}
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/40">
          <span>[ valeriy khlamov {"//"} studio gateway ]</span>
          <span className="hidden sm:inline text-white/20">SHA-512 • PBKDF2 PROTECTED</span>
        </div>

        {/* Center Minimal PIN Prompt */}
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[10px] tracking-widest text-white/60 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>fortified access control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight lowercase italic">
              studio console
            </h1>
            <p className="text-xs text-white/40 tracking-wider">
              autenticazione crittografica per la gestione contenuti
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <input
                type="password"
                value={pinInput}
                disabled={isSubmittingPin || lockoutSeconds > 0}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder={lockoutSeconds > 0 ? `blocco attivo (${lockoutSeconds}s)` : "inserisci pin di sicurezza"}
                autoFocus
                className="w-full bg-transparent border-b border-white/20 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white transition-colors font-mono disabled:opacity-40"
              />

              {lockoutSeconds > 0 ? (
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded text-xs text-red-300 tracking-wider space-y-1">
                  <div className="font-semibold text-red-400 uppercase">[ ⛔ ACCESSO BLOCCATO ]</div>
                  <div>Troppi tentativi falliti. Riprova tra <span className="font-bold">{lockoutSeconds}</span> secondi.</div>
                </div>
              ) : pinError ? (
                <p className="text-xs text-red-400/90 pt-1 tracking-wider">
                  [ {pinError} ]
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmittingPin || lockoutSeconds > 0}
              className="text-xs text-white/70 hover:text-white hover:italic transition-all cursor-pointer tracking-widest pt-2 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmittingPin ? (
                <>
                  <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                  <span>[ verifica credenziali... ]</span>
                </>
              ) : (
                <span>[ accedi alla console → ]</span>
              )}
            </button>
          </form>
        </div>

        {/* Bottom security status bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-white/30 tracking-wider pt-8">
          <div>© {new Date().getFullYear()} valeriy khlamov — private workspace</div>
          <div className="flex items-center gap-3">
            <span>HTTPONLY COOKIE</span>
            <span>•</span>
            <span>ANTI-BRUTE-FORCE SHIELD</span>
            <span>•</span>
            <span>SAME-SITE STRICT</span>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. MINIMALIST DASHBOARD ──
  return (
    <div className="min-h-screen bg-[#050505] text-[#ececec] flex flex-col selection:bg-white selection:text-black safe-bottom">
      {/* ── TOP HEADER: ULTRA-MINIMAL ── */}
      <header className="w-full border-b border-white/10 px-3 sm:px-8 py-3.5 sm:py-5 safe-top flex flex-wrap items-center justify-between gap-2 font-mono text-xs tracking-wider">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <span className="text-white font-medium">[ VALERIY KHLAMOV ]</span>
          <span className="text-white/40 hidden sm:inline">{"//"} STUDIO CMS</span>
          <span className="text-white/30 text-[10px] sm:text-[11px]">
            {saveStatus === "saving" ? "[ salvataggio... ]" : "[ online & synced ]"}
          </span>
          {r2Info && (
            <button
              type="button"
              onClick={() => {
                if (!r2Info.configured) {
                  alert(
                    `Stato Cloudflare R2: NON CONFIGURATO\n\nVariabili d'ambiente mancanti su Vercel:\n• ${r2Info.missing.join(
                      "\n• "
                    )}\n\nCome risolvere:\n1. Vai su Vercel -> Project Settings -> Environment Variables\n2. Inserisci le variabili mancanti\n3. Esegui un Redeploy del progetto.`
                  );
                } else if (r2Info.publicUrlConfigured) {
                  alert(
                    `Stato Cloudflare R2: CONNESSO E OPERATIVO ✓\n\nDominio pubblico R2:\n${r2Info.publicBase}\n\nIMPORTANTE:\nAssicurati che su Cloudflare (Dashboard -> R2 -> [Tuo Bucket] -> Settings -> Public Access) il sottodominio r2.dev sia impostato su "Allowed" (clicca "Allow Access" e digita "allow").\nSe non è abilitato, Cloudflare bloccherà le immagini con 403 Forbidden.`
                  );
                } else {
                  alert(
                    `Stato Cloudflare R2: CONNESSO E OPERATIVO ✓\n\nStreaming Proxy: ATTIVO (/api/media/stream/)\nI video e le immagini vengono serviti direttamente da Next.js tramite stream autenticato S3.\n\nConsiglio facoltativo per CDN ultra-veloce:\n1. Nel pannello Cloudflare -> R2 -> [Bucket] -> Settings -> Public Access -> "Allow Access" sul sottodominio r2.dev.\n2. Inserisci la variabile R2_PUBLIC_URL su Vercel con https://pub-xxxxxx.r2.dev`
                  );
                }
              }}
              className={`cursor-pointer transition-colors text-[10px] sm:text-[11px] ${
                r2Info.configured
                  ? "text-emerald-400/90 hover:text-emerald-300 hover:italic"
                  : "text-amber-400/90 hover:text-amber-300 hover:italic"
              }`}
            >
              {r2Info.configured
                ? r2Info.publicUrlConfigured
                  ? "[ R2: CDN connesso ✓ ]"
                  : "[ R2: proxy attivo ✓ ]"
                : "[ R2: mancante ⚠ ]"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            target="_blank"
            className="text-white/60 hover:text-white hover:italic transition-colors min-h-[36px] flex items-center"
          >
            [ vedi sito ↗ ]
          </Link>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white hover:italic transition-colors cursor-pointer min-h-[36px] flex items-center"
          >
            [ esci ]
          </button>
        </div>
      </header>

      {/* ── MINIMAL TABS ── */}
      <nav className="w-full border-b border-white/10 px-3 sm:px-8 flex items-center gap-4 sm:gap-8 overflow-x-auto mobile-touch-scroll font-mono text-xs tracking-wider py-3">
        <button
          onClick={() => setActiveTab("projects")}
          className={`cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === "projects"
              ? "text-white italic underline underline-offset-8"
              : "text-white/40 hover:text-white"
          }`}
        >
          [ 01 {"//"} film & progetti ({projects.length}) ]
        </button>

        <button
          onClick={() => setActiveTab("hero")}
          className={`cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === "hero"
              ? "text-white italic underline underline-offset-8"
              : "text-white/40 hover:text-white"
          }`}
        >
          [ 02 {"//"} video home ]
        </button>

        <button
          onClick={() => setActiveTab("about")}
          className={`cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === "about"
              ? "text-white italic underline underline-offset-8"
              : "text-white/40 hover:text-white"
          }`}
        >
          [ 03 {"//"} bio & about ]
        </button>

        <button
          onClick={() => setActiveTab("contact")}
          className={`cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === "contact"
              ? "text-white italic underline underline-offset-8"
              : "text-white/40 hover:text-white"
          }`}
        >
          [ 04 {"//"} contatti ]
        </button>

        <button
          onClick={() => setActiveTab("media")}
          className={`cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === "media"
              ? "text-white italic underline underline-offset-8"
              : "text-white/40 hover:text-white"
          }`}
        >
          [ 05 {"//"} libreria media ]
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === "backup"
              ? "text-white italic underline underline-offset-8"
              : "text-white/40 hover:text-white"
          }`}
        >
          [ 06 {"//"} backup & pin ]
        </button>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* ── TAB 1: PROGETTI & FILM ── */}
        {activeTab === "projects" && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                  film & progetti
                </h2>
                <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                  gestisci l&apos;ordine, i video e le foto per ciascun progetto
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleBatchRecalculateDurations}
                  disabled={isBatchCalculating || projects.length === 0}
                  className="text-xs font-mono text-white/60 hover:text-white hover:italic transition-colors cursor-pointer disabled:opacity-30"
                  title="Rileva e aggiorna automaticamente la durata effettiva di tutti i video"
                >
                  {isBatchCalculating ? "[ calcolo durate in corso... ]" : "[ ⟳ calcola durate video ]"}
                </button>
                <button
                  onClick={handleOpenCreateNew}
                  className="text-xs font-mono text-white/80 hover:text-white hover:italic transition-colors cursor-pointer"
                >
                  [ + nuovo progetto ]
                </button>
              </div>
            </div>

            {/* Editorial Projects List */}
            <div className="space-y-6">
              {projects.length === 0 ? (
                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center font-mono text-xs text-white/40">
                  Nessun progetto presente. Clicca su &quot;[ + nuovo progetto ]&quot; in alto per iniziare.
                </div>
              ) : (
                projects.map((proj, idx) => (
                <div
                  key={proj.id}
                  className="group border-b border-white/10 pb-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                >
                  {/* Visual preview */}
                  <div className="md:col-span-3">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60">
                      <Image
                        src={resolveMediaUrl(proj.posterImage || proj.stills?.[0]?.url || "/images/gt-night-race.jpg")}
                        alt={proj.title.en || proj.title.it}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      />
                      <span className="absolute bottom-1 right-2 font-mono text-[10px] text-white/60">
                        {proj.duration}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="md:col-span-6 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono text-white/40">
                      <span>[{String(idx + 1).padStart(2, "0")}]</span>
                      <span>{proj.year}</span>
                      <span>•</span>
                      <span>{proj.categoryLabel.en || proj.categoryLabel.it}</span>
                      {proj.location && (
                        <>
                          <span>•</span>
                          <span className="text-white/60">{proj.location}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-light tracking-tight text-white">
                      {proj.title.en || proj.title.it}
                    </h3>
                    <p className="text-xs text-white/50 font-light line-clamp-1">
                      {proj.subtitle.en || proj.subtitle.it}
                    </p>
                    <p className="text-xs font-mono text-white/30 pt-1">
                      stills collegate: {proj.stills?.length || 0}
                    </p>
                  </div>

                  {/* Minimal Text Actions */}
                  <div className="md:col-span-3 flex flex-wrap md:flex-col items-start md:items-end gap-2 font-mono text-xs text-white/60">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => reorderProjects(idx, idx - 1)}
                        disabled={idx === 0}
                        className="hover:text-white hover:italic disabled:opacity-20 cursor-pointer"
                        title="Sposta in alto"
                      >
                        [ ↑ ]
                      </button>
                      <button
                        onClick={() => reorderProjects(idx, idx + 1)}
                        disabled={idx === projects.length - 1}
                        className="hover:text-white hover:italic disabled:opacity-20 cursor-pointer"
                        title="Sposta in basso"
                      >
                        [ ↓ ]
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(proj)}
                      className="hover:text-white hover:italic transition-colors cursor-pointer"
                    >
                      [ modifica ]
                    </button>

                    <Link
                      href={`/project/${proj.id}`}
                      target="_blank"
                      className="hover:text-white hover:italic transition-colors"
                    >
                      [ anteprima ↗ ]
                    </Link>

                    <button
                      onClick={async () => {
                        const title = proj.title.en || proj.title.it;
                        if (confirm(`Eliminare definitivamente il progetto "${title}"?`)) {
                          const res = await deleteProject(proj.id);
                          if (!res.ok) {
                            alert(
                              `Impossibile eliminare il progetto:\n${res.error || "Errore sconosciuto"}`
                            );
                          }
                        }
                      }}
                      className="text-red-400/80 hover:text-red-400 hover:italic transition-colors cursor-pointer"
                    >
                      [ elimina ]
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        )}

        {/* ── TAB 2: VIDEO HOME ── */}
        {activeTab === "hero" && (
          <div className="space-y-8 max-w-4xl">
            <div className="pb-4 border-b border-white/10">
              <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                video di sfondo home
              </h2>
              <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                video riprodotto a tutto schermo all&apos;apertura del sito
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-white/50 tracking-wider block">
                  percorso o url del video
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <input
                    type="text"
                    value={heroVideoUrl}
                    onChange={(e) => setHeroVideoUrl(e.target.value)}
                    className="flex-1 w-full bg-transparent border-b border-white/20 py-2 text-xs font-mono text-white focus:outline-none focus:border-white transition-colors"
                  />
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-mono text-white/80 hover:text-white hover:italic transition-colors cursor-pointer whitespace-nowrap">
                      <span>{isUploading === "hero" ? "[ caricamento... ]" : "[ + carica video dal pc ]"}</span>
                      <input
                        type="file"
                        accept="video/*,.mp4,.webm,.mov"
                        disabled={isUploading === "hero"}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setIsUploading("hero");
                            try {
                              const path = await handleUploadFile(f, "video");
                              if (path) {
                                setHeroVideoUrl(path);
                                await updateSettings({ heroVideo: path });
                              }
                            } catch (err) {
                              alert("Errore caricamento: " + (err instanceof Error ? err.message : ""));
                            } finally {
                              setIsUploading(null);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleSaveHeroVideo}
                      className="text-xs font-mono text-white hover:italic transition-colors cursor-pointer whitespace-nowrap font-bold"
                    >
                      [ salva video ]
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-2 pt-4">
                <span className="text-[11px] font-mono text-white/30 tracking-wider uppercase block">
                  anteprima in tempo reale
                </span>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    src={heroVideoUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Quick Select */}
              <div className="space-y-3 pt-6 border-t border-white/10 font-mono text-xs">
                <span className="text-white/40 block">
                  oppure seleziona tra i video del server:
                </span>
                {activeVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeVideos.map((vid) => (
                      <button
                        key={vid.path}
                        onClick={() => setHeroVideoUrl(vid.path)}
                        className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                          heroVideoUrl === vid.path
                            ? "border-white text-white italic"
                            : "border-white/10 text-white/50 hover:text-white hover:border-white/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{vid.name}</span>
                          {vid.size && <span className="text-[10px] text-white/30">{vid.size}</span>}
                        </div>
                        <div className="text-[10px] text-white/30 pt-0.5 truncate">{vid.path}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-white/10 rounded-lg text-white/30 text-[11px]">
                    Nessun video caricato su Cloudflare R2 / server. Carica un video nella scheda &quot;File&quot; o inserisci l&apos;URL sopra.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: BIO & ABOUT ── */}
        {activeTab === "about" && (
          <div className="space-y-10 max-w-5xl">
            <div className="pb-4 border-b border-white/10 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                  sezione about & bio
                </h2>
                <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                  testi e informazioni mostrati all&apos;apertura della voce &quot;about&quot; nella homepage
                </p>
              </div>
              <button
                onClick={handleSaveAbout}
                disabled={isSaving}
                className="text-xs font-mono text-white hover:italic transition-colors cursor-pointer font-bold disabled:opacity-50"
              >
                {isSaving ? "[ salvataggio... ]" : "[ salva sezione about ]"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
              {/* Colonna Sinistra: Profilo Principale */}
              <div className="lg:col-span-6 space-y-6 font-mono text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                    {"//"} colonna sinistra: direzione & biografia
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-white/50 uppercase tracking-wider block">
                    badge superiore
                  </label>
                  <input
                    type="text"
                    value={aboutForm.badge}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, badge: e.target.value })
                    }
                    placeholder="// PROFILE & DIRECTION"
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                  <p className="text-[10px] text-white/30">
                    Etichetta sopra al titolo (es. // PROFILE & DIRECTION)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-white/50 uppercase tracking-wider block">
                    titolo / headline principale
                  </label>
                  <textarea
                    rows={3}
                    value={aboutForm.title}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, title: e.target.value })
                    }
                    placeholder="Valerio Khlamov is a Director of Photography..."
                    className="w-full bg-transparent border border-white/20 p-2.5 text-white focus:outline-none focus:border-white transition-colors resize-y leading-relaxed font-sans text-sm"
                  />
                  <p className="text-[10px] text-white/30">
                    Testo in evidenza ad alto impatto visivo
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-white/50 uppercase tracking-wider block">
                    descrizione / biografia primaria
                  </label>
                  <textarea
                    rows={4}
                    value={aboutForm.bio}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, bio: e.target.value })
                    }
                    placeholder="Specialized in high-speed pursuit cinematography..."
                    className="w-full bg-transparent border border-white/20 p-2.5 text-white/90 focus:outline-none focus:border-white transition-colors resize-y leading-relaxed font-sans text-sm"
                  />
                  <p className="text-[10px] text-white/30">
                    Testo narrativo sulla specializzazione e il lavoro commerciale/trackside
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-white/50 uppercase tracking-wider block">
                    paragrafo secondario / nota (opzionale)
                  </label>
                  <textarea
                    rows={3}
                    value={aboutForm.secondaryBio || ""}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, secondaryBio: e.target.value })
                    }
                    placeholder="Ulteriori dettagli, collaborazioni speciali o note di produzione..."
                    className="w-full bg-transparent border border-white/20 p-2.5 text-white/80 focus:outline-none focus:border-white transition-colors resize-y leading-relaxed font-sans text-sm"
                  />
                </div>
              </div>

              {/* Colonna Destra: Specifiche Tecniche & Accreditamenti */}
              <div className="lg:col-span-6 space-y-6 font-mono text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                    {"//"} colonna destra: specifiche tecniche & accreditamenti
                  </span>
                </div>

                {/* Disciplines */}
                <div className="space-y-2">
                  <label className="text-white/50 uppercase tracking-wider block">
                    etichetta discipline
                  </label>
                  <input
                    type="text"
                    value={aboutForm.disciplinesTitle}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, disciplinesTitle: e.target.value })
                    }
                    placeholder="DISCIPLINES & FOCUS"
                    className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                  />
                  <textarea
                    rows={2}
                    value={aboutForm.disciplines}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, disciplines: e.target.value })
                    }
                    placeholder="Automotive Commercials • Trackside Racing Cinema • High-Speed Pursuit Direction"
                    className="w-full bg-transparent border border-white/20 p-2.5 text-white/90 focus:outline-none focus:border-white transition-colors resize-y mt-2"
                  />
                </div>

                {/* Accreditations */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="text-white/50 uppercase tracking-wider block">
                    etichetta accreditamenti
                  </label>
                  <input
                    type="text"
                    value={aboutForm.accreditationsTitle}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, accreditationsTitle: e.target.value })
                    }
                    placeholder="ACCREDITATIONS"
                    className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                  />
                  <textarea
                    rows={2}
                    value={aboutForm.accreditations}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, accreditations: e.target.value })
                    }
                    placeholder="FIA Formula & WEC Trackside Paddock Access • Hot Pit Lane Certified"
                    className="w-full bg-transparent border border-white/20 p-2.5 text-white/90 focus:outline-none focus:border-white transition-colors resize-y mt-2"
                  />
                </div>

                {/* Base & Deployment */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="text-white/50 uppercase tracking-wider block">
                    etichetta sede / base
                  </label>
                  <input
                    type="text"
                    value={aboutForm.baseTitle}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, baseTitle: e.target.value })
                    }
                    placeholder="BASE & DEPLOYMENT"
                    className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                  />
                  <textarea
                    rows={2}
                    value={aboutForm.base}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, base: e.target.value })
                    }
                    placeholder="Milan, Italy • Available Worldwide for Commercial & Trackside Projects"
                    className="w-full bg-transparent border border-white/20 p-2.5 text-white/90 focus:outline-none focus:border-white transition-colors resize-y mt-2"
                  />
                </div>

                {/* Blocchi Personalizzati Dinamici */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 uppercase tracking-wider block">
                      blocchi informativi extra ({aboutForm.customBlocks?.length || 0})
                    </span>
                  </div>

                  {aboutForm.customBlocks && aboutForm.customBlocks.length > 0 && (
                    <div className="space-y-3">
                      {aboutForm.customBlocks.map((block) => (
                        <div
                          key={block.id}
                          className="flex flex-col gap-2 border-b border-white/5 pb-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <input
                              type="text"
                              value={block.label}
                              onChange={(e) =>
                                handleUpdateCustomBlock(block.id, {
                                  label: e.target.value.toUpperCase(),
                                })
                              }
                              placeholder="TITOLO DEL BLOCCO"
                              className="w-2/3 bg-transparent border-b border-white/20 py-1 text-white focus:outline-none focus:border-white transition-colors uppercase text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomBlock(block.id)}
                              className="text-red-400/80 hover:text-red-400 hover:italic transition-colors cursor-pointer text-[11px]"
                            >
                              [ rimuovi ]
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={block.value}
                            onChange={(e) =>
                              handleUpdateCustomBlock(block.id, { value: e.target.value })
                            }
                            placeholder="Contenuto informativo del blocco..."
                            className="w-full bg-transparent border border-white/10 p-2 text-white/90 focus:outline-none focus:border-white transition-colors text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new custom block */}
                  <div className="pt-2 space-y-2">
                    <span className="text-[11px] text-white/40 block">
                      {"//"} aggiungi nuovo blocco informativo
                    </span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newBlockLabel}
                        onChange={(e) => setNewBlockLabel(e.target.value)}
                        placeholder="titolo blocco (es. CINEMA GEAR / OTTICHE)"
                        className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors uppercase text-xs"
                      />
                      <textarea
                        rows={2}
                        value={newBlockValue}
                        onChange={(e) => setNewBlockValue(e.target.value)}
                        placeholder="testo del blocco (es. ARRI Alexa 35, Red V-Raptor XL, Cooke Anamorphic...)"
                        className="w-full bg-transparent border border-white/20 p-2 text-white focus:outline-none focus:border-white transition-colors text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomBlock}
                        className="text-white/80 hover:text-white hover:italic transition-colors cursor-pointer text-xs whitespace-nowrap pt-1"
                      >
                        [ + aggiungi blocco ]
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pulsante Salva Principale */}
            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={handleSaveAbout}
                disabled={isSaving}
                className="text-sm font-mono text-white hover:italic transition-colors cursor-pointer font-bold disabled:opacity-50"
              >
                {isSaving ? "[ salvataggio in corso... ]" : "[ salva sezione about ]"}
              </button>
            </div>

            {/* Anteprima Live in stile Cinema Overlay */}
            <div className="pt-8 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                  {"//"} anteprima in tempo reale (come appare in homepage all&apos;apertura di &quot;about&quot;)
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  ● live preview
                </span>
              </div>
              <div className="relative rounded-2xl border border-white/15 bg-black/80 backdrop-blur-md p-6 sm:p-10 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-white">
                  <div className="md:col-span-7 space-y-6">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 block">
                      {aboutForm.badge || "// PROFILE & DIRECTION"}
                    </span>
                    <p className="text-xl sm:text-2xl md:text-3xl font-light leading-snug tracking-tight">
                      {aboutForm.title || "Valerio Khlamov"}
                    </p>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-light whitespace-pre-line">
                      {aboutForm.bio}
                    </p>
                    {aboutForm.secondaryBio && (
                      <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-light whitespace-pre-line">
                        {aboutForm.secondaryBio}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-5 space-y-5 font-mono text-xs text-white/70 md:pl-8 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0">
                    {aboutForm.disciplines && (
                      <div>
                        <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                          {aboutForm.disciplinesTitle || "DISCIPLINES & FOCUS"}
                        </span>
                        <p className="text-white font-light text-xs whitespace-pre-line">
                          {aboutForm.disciplines}
                        </p>
                      </div>
                    )}

                    {aboutForm.accreditations && (
                      <div>
                        <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                          {aboutForm.accreditationsTitle || "ACCREDITATIONS"}
                        </span>
                        <p className="text-white font-light text-xs whitespace-pre-line">
                          {aboutForm.accreditations}
                        </p>
                      </div>
                    )}

                    {aboutForm.base && (
                      <div>
                        <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                          {aboutForm.baseTitle || "BASE & DEPLOYMENT"}
                        </span>
                        <p className="text-white font-light text-xs whitespace-pre-line">
                          {aboutForm.base}
                        </p>
                      </div>
                    )}

                    {aboutForm.customBlocks &&
                      aboutForm.customBlocks.map((block) => (
                        <div key={block.id}>
                          <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                            {block.label}
                          </span>
                          <p className="text-white font-light text-xs whitespace-pre-line">
                            {block.value}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: CONTATTI ── */}
        {activeTab === "contact" && (
          <div className="space-y-8 max-w-3xl">
            <div className="pb-4 border-b border-white/10">
              <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                contatti & canali
              </h2>
              <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                informazioni mostrate nell&apos;overlay contatti e nel footer del sito
              </p>
            </div>

            <div className="space-y-6 font-mono text-xs">
              <div className="space-y-2">
                <label className="text-white/50 uppercase tracking-wider block">
                  email di contatto
                </label>
                <input
                  type="email"
                  value={contactForm.contactEmail}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, contactEmail: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-white/50 uppercase tracking-wider block">
                  telefono / whatsapp hotline
                </label>
                <input
                  type="text"
                  value={contactForm.contactPhone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, contactPhone: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-white/50 uppercase tracking-wider block">
                  rappresentanza & sede
                </label>
                <input
                  type="text"
                  value={contactForm.representation}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, representation: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Dynamic Channels Section */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 uppercase tracking-wider block">
                    canali & social ({channels.length})
                  </span>
                </div>

                {/* List of existing channels */}
                <div className="space-y-3">
                  {channels.map((chan) => (
                    <div
                      key={chan.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-white/5 pb-3"
                    >
                      <div className="w-full sm:w-1/3">
                        <label className="text-[10px] text-white/30 block mb-0.5">
                          nome canale
                        </label>
                        <input
                          type="text"
                          value={chan.name}
                          onChange={(e) =>
                            handleUpdateChannel(chan.id, { name: e.target.value })
                          }
                          placeholder="es. Instagram Cinema"
                          className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-white/30 block mb-0.5">
                          link / url canale
                        </label>
                        <input
                          type="text"
                          value={chan.url}
                          onChange={(e) =>
                            handleUpdateChannel(chan.id, { url: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(chan.id)}
                        className="text-red-400/80 hover:text-red-400 hover:italic transition-colors cursor-pointer self-start sm:self-end sm:mb-1.5 text-[11px]"
                      >
                        [ rimuovi ]
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new channel */}
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] text-white/40 block">{"//"} aggiungi nuovo canale</span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="nome canale (es. YouTube 4K)"
                      className="w-full sm:w-1/3 bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                    />
                    <input
                      type="text"
                      value={newChannelUrl}
                      onChange={(e) => setNewChannelUrl(e.target.value)}
                      placeholder="url (es. https://youtube.com/@valerio)"
                      className="flex-1 bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddChannel}
                      className="text-white/80 hover:text-white hover:italic transition-colors cursor-pointer self-start sm:self-center text-xs whitespace-nowrap"
                    >
                      [ + aggiungi canale ]
                    </button>
                  </div>
                </div>
              </div>

              {/* ── FOOTER CENTER LINKS (LINK IN BASSO AL CENTRO NEL FOOTER) ── */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 uppercase tracking-wider block">
                    link in basso al centro nel footer ({footerLinks.length})
                  </span>
                </div>
                <p className="text-[11px] text-white/40">
                  questi link compaiono in basso al centro sia nella homepage che nel footer delle pagine dedicate
                </p>

                {/* List of existing footer links */}
                <div className="space-y-3">
                  {footerLinks.map((flink) => (
                    <div
                      key={flink.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-white/5 pb-3"
                    >
                      <div className="w-full sm:w-1/3">
                        <label className="text-[10px] text-white/30 block mb-0.5">
                          testo del link
                        </label>
                        <input
                          type="text"
                          value={flink.label}
                          onChange={(e) =>
                            handleUpdateFooterLink(flink.id, { label: e.target.value })
                          }
                          placeholder="es. Instagram ↗"
                          className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-white/30 block mb-0.5">
                          url di destinazione
                        </label>
                        <input
                          type="text"
                          value={flink.url}
                          onChange={(e) =>
                            handleUpdateFooterLink(flink.id, { url: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFooterLink(flink.id)}
                        className="text-red-400/80 hover:text-red-400 hover:italic transition-colors cursor-pointer self-start sm:self-end sm:mb-1.5 text-[11px]"
                      >
                        [ rimuovi ]
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new footer link */}
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] text-white/40 block">{"//"} aggiungi nuovo link al footer</span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newFooterLabel}
                      onChange={(e) => setNewFooterLabel(e.target.value)}
                      placeholder="testo link (es. Vimeo ↗)"
                      className="w-full sm:w-1/3 bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                    />
                    <input
                      type="text"
                      value={newFooterUrl}
                      onChange={(e) => setNewFooterUrl(e.target.value)}
                      placeholder="url (es. https://vimeo.com)"
                      className="flex-1 bg-transparent border-b border-white/20 py-1.5 text-white focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddFooterLink}
                      className="text-white/80 hover:text-white hover:italic transition-colors cursor-pointer self-start sm:self-center text-xs whitespace-nowrap"
                    >
                      [ + aggiungi link footer ]
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveContact}
                  className="text-xs text-white hover:italic transition-colors cursor-pointer font-bold"
                >
                  [ salva contatti e footer ]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: LIBRERIA MEDIA ── */}
        {activeTab === "media" && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                  libreria media server
                </h2>
                <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                  carica nuovi file o elimina quelli presenti. clicca su copia percorso per incollarli nei progetti
                </p>
              </div>

              {/* Upload controls */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <label className="text-white/80 hover:text-white hover:italic transition-colors cursor-pointer">
                  <span>{isUploading === "media-video" ? "[ caricamento video... ]" : "[ + carica video (.mp4/.webm/.mov) ]"}</span>
                  <input
                    type="file"
                    accept="video/*,.mp4,.webm,.mov"
                    disabled={isUploading === "media-video"}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setIsUploading("media-video");
                        try {
                          await handleUploadFile(f, "video");
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Errore");
                        } finally {
                          setIsUploading(null);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <label className="text-white/80 hover:text-white hover:italic transition-colors cursor-pointer">
                  <span>{isUploading === "media-image" ? "[ caricamento immagine... ]" : "[ + carica immagine (.jpg/.png/.webp) ]"}</span>
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    disabled={isUploading === "media-image"}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setIsUploading("media-image");
                        try {
                          await handleUploadFile(f, "image");
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Errore");
                        } finally {
                          setIsUploading(null);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Video List */}
            <div className="space-y-4">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider flex items-center justify-between">
                <span>{"//"} file video ({activeVideos.length})</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/media/diagnose");
                      const data = await res.json();
                      const lines = [
                        `STATO CLOUDFLARE R2 & MEDIA:`,
                        `• Connessione R2: ${data.r2Configured ? "CONFIGURATO ✓" : "MANCANTE ⚠"}`,
                        `• Bucket: "${data.bucketName || "non impostato"}" (S3: ${data.s3ConnectionSuccess ? "OK ✓" : `ERRORE: ${data.s3Error}`})`,
                        `• File in R2: ${data.objectsList?.videosCount ?? 0} video, ${data.objectsList?.imagesCount ?? 0} immagini`,
                        `• R2_PUBLIC_URL: ${data.rawPublicUrl || "(non impostata - streaming proxy attivo)"}`,
                        data.publicUrlStatus?.tested
                          ? `• Test URL Pubblico: HTTP ${data.publicUrlStatus.httpStatus} (${data.publicUrlStatus.accessible ? "FUNZIONANTE ✓" : "BLOCCATO 403/404 ⚠"})`
                          : "",
                        "",
                        data.recommendations?.length ? `RACCOMANDAZIONI:\n• ${data.recommendations.join("\n• ")}` : "",
                      ].filter(Boolean);
                      alert(lines.join("\n"));
                    } catch {
                      alert("Errore durante l'esecuzione del test diagnostico.");
                    }
                  }}
                  className="text-white/60 hover:text-white hover:italic transition-colors cursor-pointer text-[11px]"
                >
                  [ 🔍 diagnostica R2 & CDN ]
                </button>
              </div>
              {activeVideos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {activeVideos.map((vid) => (
                    <div key={vid.path} className="space-y-2 group">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                        <video
                          src={vid.path}
                          muted
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-start justify-between text-xs font-mono gap-2">
                        <div className="overflow-hidden">
                          <div className="text-white font-light truncate">{vid.name}</div>
                          <div className="text-[10px] text-white/30 truncate">
                            {vid.size} • {vid.path}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <a
                            href={vid.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-white/60 hover:text-white hover:italic transition-colors"
                          >
                            [ apri ↗ ]
                          </a>
                          <button
                            onClick={() => handleCopy(vid.path)}
                            className="text-xs text-white/60 hover:text-white hover:italic transition-colors cursor-pointer"
                          >
                            {copiedPath === vid.path ? "[ copiato ]" : "[ copia ]"}
                          </button>
                          <button
                            onClick={() => handleDeleteMedia(vid.path, vid.key)}
                            className="text-[11px] text-red-400/70 hover:text-red-400 hover:italic transition-colors cursor-pointer"
                          >
                            [ elimina ]
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center font-mono text-xs text-white/40">
                  Nessun video caricato su Cloudflare R2. Usa l&apos;area di upload sopra per caricare file video.
                </div>
              )}
            </div>

            {/* Image List */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="text-xs font-mono text-white/50 uppercase tracking-wider flex items-center justify-between">
                <span>{"//"} file immagini ({activeImages.length})</span>
              </div>
              {activeImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {activeImages.map((img) => (
                    <div key={img.path} className="space-y-2 group">
                      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black">
                        <Image
                          src={img.path}
                          alt={img.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="text-xs font-mono">
                        <div className="text-white font-light truncate">{img.name}</div>
                        <div className="text-[10px] text-white/30 truncate">{img.size}</div>
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <a
                            href={img.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/40 hover:text-white hover:italic transition-colors"
                          >
                            [ apri ↗ ]
                          </a>
                          <button
                            onClick={() => handleCopy(img.path)}
                            className="text-white/50 hover:text-white hover:italic transition-colors cursor-pointer"
                          >
                            {copiedPath === img.path ? "[ copiato ]" : "[ copia ]"}
                          </button>
                          <button
                            onClick={() => handleDeleteMedia(img.path, img.key)}
                            className="text-red-400/70 hover:text-red-400 hover:italic transition-colors cursor-pointer"
                          >
                            [ elimina ]
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center font-mono text-xs text-white/40">
                  Nessuna immagine caricata su Cloudflare R2. Usa l&apos;area di upload sopra per caricare file immagine.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 6: BACKUP & PIN ── */}
        {activeTab === "backup" && (
          <div className="space-y-8 max-w-2xl font-mono text-xs">
            <div className="pb-4 border-b border-white/10">
              <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                backup & sicurezza
              </h2>
              <p className="text-xs text-white/40 tracking-wider mt-1">
                esporta i dati in un file json o imposta un pin personalizzato
              </p>
            </div>

            {/* Backup options */}
            <div className="space-y-4 pb-6 border-b border-white/10">
              <div className="text-white/50 uppercase tracking-wider">{"//"} backup dati</div>
              <div className="flex flex-wrap items-center gap-6">
                <button
                  onClick={handleExportBackup}
                  className="hover:text-white hover:italic text-white/80 transition-colors cursor-pointer"
                >
                  [ scarica backup json ]
                </button>

                <label className="hover:text-white hover:italic text-white/80 transition-colors cursor-pointer">
                  <span>[ importa backup json ]</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => {
                    if (confirm("Ripristinare tutti i dati originali di fabbrica?")) {
                      resetToDefaults();
                    }
                  }}
                  className="text-red-400/80 hover:text-red-400 hover:italic transition-colors cursor-pointer"
                >
                  [ reset dati di fabbrica ]
                </button>
              </div>
            </div>

            {/* Change PIN (Server Encrypted PBKDF2) */}
            <div className="space-y-4">
              <div className="text-white/50 uppercase tracking-wider">{"//"} modifica pin di sicurezza server</div>
              <form onSubmit={handleChangePin} className="space-y-3 max-w-sm">
                <div>
                  <label className="text-[10px] text-white/40 uppercase block mb-1">PIN Attuale</label>
                  <input
                    type="password"
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="inserisci pin attuale"
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase block mb-1">Nuovo PIN (minimo 6 caratteri)</label>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="nuovo pin di sicurezza"
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors text-xs font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="hover:text-white hover:italic text-white/80 transition-colors cursor-pointer block pt-1 text-xs disabled:opacity-40"
                >
                  {isChangingPin ? "[ hashing & aggiornamento in corso... ]" : "[ aggiorna pin sul server ]"}
                </button>
                {pinSuccessMsg && (
                  <p className="text-emerald-400 text-xs tracking-wider pt-1">
                    [ ✓ {pinSuccessMsg} ]
                  </p>
                )}
                {pinChangeErrorMsg && (
                  <p className="text-red-400 text-xs tracking-wider pt-1">
                    [ ✗ {pinChangeErrorMsg} ]
                  </p>
                )}
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ── PROJECT EDITING MODAL: MINIMAL CINEMA OVERLAY ── */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-10 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto space-y-8 font-mono text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="space-y-1">
                <span className="text-xs text-white/40 tracking-widest uppercase">
                  {isCreatingNew ? "[ new film ]" : `[ edit: ${editingProject.id} ]`}
                </span>
                <h3 className="text-xl sm:text-2xl font-light text-white italic lowercase">
                  {editingProject.title.en || editingProject.title.it}
                </h3>
              </div>

              <button
                onClick={() => setEditingProject(null)}
                className="hover:text-white hover:italic text-white/50 transition-colors cursor-pointer"
              >
                [ chiudi × ]
              </button>
            </div>

            {/* General Info */}
            <div className="space-y-6">
              <div className="text-white/40 uppercase tracking-widest">{"//"} info generali</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-white/40 block">titolo / title</label>
                  <input
                    type="text"
                    value={editingProject.title.en || editingProject.title.it || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingProject({
                        ...editingProject,
                        title: {
                          en: val,
                          it: val,
                        },
                      });
                    }}
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white/40 block">sottotitolo / subtitle</label>
                  <input
                    type="text"
                    value={editingProject.subtitle.en || editingProject.subtitle.it || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingProject({
                        ...editingProject,
                        subtitle: {
                          en: val,
                          it: val,
                        },
                      });
                    }}
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-white/40 block">anno</label>
                  <input
                    type="text"
                    value={editingProject.year}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, year: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-white/40 block">durata (calcolata in automatico)</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetUrl = editingProject.fullVideoUrl || editingProject.videoPreviewUrl;
                        if (!targetUrl) {
                          alert("Carica o inserisci prima l'URL di un video.");
                          return;
                        }
                        setIsCalculatingDuration(true);
                        const dur = await detectVideoDuration(targetUrl);
                        setIsCalculatingDuration(false);
                        if (dur) {
                          setEditingProject((prev) => (prev ? { ...prev, duration: dur } : null));
                        } else {
                          alert("Impossibile calcolare automaticamente la durata dal video specificato.");
                        }
                      }}
                      className="text-[11px] text-white/70 hover:text-white hover:italic cursor-pointer"
                    >
                      {isCalculatingDuration ? "[ rilevamento... ]" : "[ ⟳ calcola dal video ]"}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="es. 02:45 (calcolato in automatico)"
                    value={editingProject.duration}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, duration: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white/40 block">categoria</label>
                  <select
                    value={editingProject.category}
                    onChange={(e) => {
                      const cat = e.target.value as LocalizedProject["category"];
                      const labels: Record<string, { it: string; en: string }> = {
                        gt: { it: "FORMULA & GT", en: "FORMULA & GT" },
                        pursuit: { it: "TRACK PURSUIT", en: "TRACK PURSUIT" },
                        rally: { it: "RALLY & DIRT", en: "RALLY & DIRT" },
                        commercial: { it: "COMMERCIAL CAMPAIGN", en: "COMMERCIAL CAMPAIGN" },
                        all: { it: "MOTORSPORT CINEMA", en: "MOTORSPORT CINEMA" },
                      };
                      setEditingProject({
                        ...editingProject,
                        category: cat,
                        categoryLabel: labels[cat] || { it: "CINEMA", en: "CINEMA" },
                      });
                    }}
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors [&>option]:bg-black"
                  >
                    <option value="gt">Formula & GT</option>
                    <option value="pursuit">Track Pursuit</option>
                    <option value="rally">Rally & Dirt</option>
                    <option value="commercial">Commercial</option>
                    <option value="all">Altro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white/40 block">location</label>
                <input
                  type="text"
                  value={editingProject.location}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, location: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            {/* Media URLs */}
            {/* Media URLs */}
            <div className="space-y-6 pt-4 border-t border-white/10">
              <div className="text-white/40 uppercase tracking-widest">{"//"} video & poster</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-white/40 block">video preview url (hover home)</label>
                    <label className="text-[11px] text-white/70 hover:text-white hover:italic cursor-pointer">
                      <span>{isUploading === "proj-preview" ? "[ caricamento... ]" : "[ + carica video ]"}</span>
                      <input
                        type="file"
                        accept="video/*,.mp4,.webm,.mov"
                        disabled={isUploading === "proj-preview"}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setIsUploading("proj-preview");
                            detectVideoDuration(f).then((dur) => {
                              if (dur) setEditingProject((prev) => (prev ? { ...prev, duration: dur } : null));
                            });
                            try {
                              const path = await handleUploadFile(f, "video");
                              if (path) setEditingProject((prev) => (prev ? { ...prev, videoPreviewUrl: path } : null));
                            } catch (err) {
                              alert(err instanceof Error ? err.message : "Errore");
                            } finally {
                              setIsUploading(null);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editingProject.videoPreviewUrl}
                    onBlur={async () => {
                      if (!editingProject.duration && editingProject.videoPreviewUrl) {
                        const dur = await detectVideoDuration(editingProject.videoPreviewUrl);
                        if (dur) setEditingProject((prev) => (prev ? { ...prev, duration: dur } : null));
                      }
                    }}
                    onChange={(e) =>
                      setEditingProject((prev) => (prev ? { ...prev, videoPreviewUrl: e.target.value } : null))
                    }
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-white/40 block">video completo url (pagina dedicata)</label>
                    <label className="text-[11px] text-white/70 hover:text-white hover:italic cursor-pointer">
                      <span>{isUploading === "proj-full" ? "[ caricamento... ]" : "[ + carica video ]"}</span>
                      <input
                        type="file"
                        accept="video/*,.mp4,.webm,.mov"
                        disabled={isUploading === "proj-full"}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setIsUploading("proj-full");
                            detectVideoDuration(f).then((dur) => {
                              if (dur) setEditingProject((prev) => (prev ? { ...prev, duration: dur } : null));
                            });
                            try {
                              const path = await handleUploadFile(f, "video");
                              if (path) setEditingProject((prev) => (prev ? { ...prev, fullVideoUrl: path } : null));
                            } catch (err) {
                              alert(err instanceof Error ? err.message : "Errore");
                            } finally {
                              setIsUploading(null);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editingProject.fullVideoUrl}
                    onBlur={async () => {
                      if (editingProject.fullVideoUrl) {
                        const dur = await detectVideoDuration(editingProject.fullVideoUrl);
                        if (dur) setEditingProject((prev) => (prev ? { ...prev, duration: dur } : null));
                      }
                    }}
                    onChange={(e) =>
                      setEditingProject((prev) => (prev ? { ...prev, fullVideoUrl: e.target.value } : null))
                    }
                    className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Video Library Quick Picker & Preview Player */}
              {activeVideos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-white/40">
                  <span className="text-white/60">scegli dai video in libreria:</span>
                  {activeVideos.map((vid) => (
                    <button
                      key={vid.path}
                      type="button"
                      onClick={async () => {
                        const dur = await detectVideoDuration(vid.path);
                        setEditingProject((prev) =>
                          prev
                            ? {
                                ...prev,
                                fullVideoUrl: vid.path,
                                videoPreviewUrl: prev.videoPreviewUrl || vid.path,
                                duration: dur || prev.duration,
                              }
                            : null
                        );
                      }}
                      className="text-white/70 hover:text-white hover:underline transition-colors truncate max-w-[180px] cursor-pointer"
                    >
                      [ {vid.name} ]
                    </button>
                  ))}
                </div>
              )}

              {(editingProject.fullVideoUrl || editingProject.videoPreviewUrl) && (
                <div className="space-y-1 pt-2">
                  <div className="text-[11px] font-mono text-white/40">anteprima video:</div>
                  <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-black/60 border border-white/10">
                    <video
                      src={resolveMediaUrl(editingProject.fullVideoUrl || editingProject.videoPreviewUrl)}
                      controls
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-white/40 block">poster image url</label>
                  <label className="text-[11px] text-white/70 hover:text-white hover:italic cursor-pointer">
                    <span>{isUploading === "proj-poster" ? "[ caricamento... ]" : "[ + carica cover dal pc ]"}</span>
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp"
                      disabled={isUploading === "proj-poster"}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setIsUploading("proj-poster");
                          try {
                            const path = await handleUploadFile(f, "image");
                            if (path) setEditingProject((prev) => (prev ? { ...prev, posterImage: path } : null));
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Errore");
                          } finally {
                            setIsUploading(null);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editingProject.posterImage}
                  onChange={(e) =>
                    setEditingProject((prev) => (prev ? { ...prev, posterImage: e.target.value } : null))
                  }
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                />

                {/* Cover Library Quick Picker */}
                {activeImages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-white/40">
                    <span className="text-white/60">scegli cover dalla libreria:</span>
                    {activeImages.slice(0, 10).map((img) => (
                      <button
                        key={img.path}
                        type="button"
                        onClick={() =>
                          setEditingProject((prev) => (prev ? { ...prev, posterImage: img.path } : null))
                        }
                        className="text-white/70 hover:text-white hover:underline transition-colors truncate max-w-[150px] cursor-pointer"
                      >
                        [ {img.name} ]
                      </button>
                    ))}
                  </div>
                )}

                {/* Cover Visual Preview */}
                {editingProject.posterImage && (
                  <div className="space-y-1 pt-2">
                    <div className="text-[11px] font-mono text-white/40">anteprima cover:</div>
                    <div className="relative aspect-video w-48 rounded-lg overflow-hidden bg-black/60 border border-white/10">
                      <Image
                        src={resolveMediaUrl(editingProject.posterImage)}
                        alt="Cover preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stills & Frames Section */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-white/40 uppercase tracking-widest">
                  {"//"} stills & frames ({editingProject.stills?.length || 0})
                </div>

                <label className="text-xs font-mono text-white/80 hover:text-white hover:italic transition-colors cursor-pointer">
                  <span>{isUploading === "proj-stills" ? "[ caricamento foto... ]" : "[ + carica foto dal pc ]"}</span>
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    multiple
                    disabled={isUploading === "proj-stills"}
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        setIsUploading("proj-stills");
                        try {
                          const uploaded: string[] = [];
                          for (let i = 0; i < files.length; i++) {
                            const p = await handleUploadFile(files[i], "image");
                            if (p) uploaded.push(p);
                          }
                          if (uploaded.length > 0) {
                            const newStills = uploaded.map((url) => ({
                              url,
                              caption: { it: "", en: "" },
                            }));
                            setEditingProject((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    stills: [...(prev.stills || []), ...newStills],
                                  }
                                : null
                            );
                          }
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Errore caricamento");
                        } finally {
                          setIsUploading(null);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Grid of stills with remove */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {editingProject.stills?.map((still, sIdx) => (
                  <div key={sIdx} className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-black">
                    <Image
                      src={resolveMediaUrl(still.url)}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveStill(sIdx)}
                      className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white/80 hover:text-white"
                    >
                      [ rimuovi ]
                    </button>
                  </div>
                ))}
              </div>

              {/* Add still via text */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newStillUrl}
                  onChange={(e) => setNewStillUrl(e.target.value)}
                  placeholder="percorso foto (es. /images/gt-night-race.jpg o url)"
                  className="flex-1 bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleAddStill()}
                  className="text-white/80 hover:text-white hover:italic transition-colors cursor-pointer self-start sm:self-center"
                >
                  [ + aggiungi foto ]
                </button>
              </div>

              {/* Quick image shortcuts */}
              {activeImages.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-white/30">
                  <span>scelta rapida:</span>
                  {activeImages.map((img) => (
                    <button
                      key={img.path}
                      type="button"
                      onClick={() => handleAddStill(img.path)}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      + {img.name}
                    </button>
                  ))}
                </div>
              )}
            </div>



            {/* Modal Actions */}
            <div className="pt-6 border-t border-white/10 flex items-center justify-between pb-8">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-white/40 hover:text-white hover:italic transition-colors cursor-pointer"
              >
                [ annulla ]
              </button>

              <button
                type="button"
                onClick={handleSaveProjectModal}
                className="text-white hover:italic transition-colors cursor-pointer font-bold"
              >
                {isCreatingNew ? "[ crea progetto → ]" : "[ salva modifiche → ]"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
