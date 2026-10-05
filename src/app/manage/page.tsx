"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Film,
  Play,
  FileText,
  Mail,
  Layers,
  Shield,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Sparkles,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  EyeOff,
  Video,
  Image as ImageIcon,
  Save,
  Sliders,
  ChevronRight,
  Info,
  Clock,
  Sparkle,
} from "lucide-react";
import {
  useSiteData,
  SocialChannel,
  FooterLink,
  AboutSettings,
  AboutInfoBlock,
  DEFAULT_ABOUT,
} from "@/context/SiteDataContext";
import { LocalizedProject, ProjectStill, ProjectVideo } from "@/data/translations";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { captureVideoThumbnail } from "@/utils/videoThumbnail";
import { R2StorageMonitor, R2StorageData } from "@/components/R2StorageMonitor";

function AnimatedLoadingText({ label = "caricamento" }: { label?: string }) {
  return (
    <span className="inline-flex items-center text-white/90">
      <span>[ {label}</span>
      <span className="inline-flex items-center ml-0.5 font-mono">
        <span className="animate-dot-1">.</span>
        <span className="animate-dot-2">.</span>
        <span className="animate-dot-3">.</span>
      </span>
      <span>&nbsp;]</span>
    </span>
  );
}

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

  // Integrated Toast Notification State
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ message, type });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Project search & filter
  const [projectSearch, setProjectSearch] = useState("");

  // Media search & type filter
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "videos" | "images">("all");

  // PIN visibility toggles
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // Modal active section navigation
  const [modalSection, setModalSection] = useState<"general" | "videos" | "cover" | "stills">("general");

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
  const [storageInfo, setStorageInfo] = useState<R2StorageData | null>(null);
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setMediaFiles({ videos: data.videos || [], images: data.images || [] });
        if (data.storage) {
          setStorageInfo(data.storage);
        }
      }
    } catch (err) {
      console.warn("Could not fetch media list:", err);
    }
  }, []);

  const handleRefreshStorage = async () => {
    setIsRefreshingStorage(true);
    try {
      const res = await fetch("/api/media/storage");
      if (res.ok) {
        const data = await res.json();
        if (data.storage) {
          setStorageInfo(data.storage);
        }
      }
    } catch (err) {
      console.warn("Could not refresh storage metrics:", err);
    } finally {
      setIsRefreshingStorage(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch("/api/media");
        if (res.ok && !ignore) {
          const data = await res.json();
          setMediaFiles({ videos: data.videos || [], images: data.images || [] });
          if (data.storage) {
            setStorageInfo(data.storage);
          }
        }
      } catch (err) {
        console.warn("Could not fetch media list:", err);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab === "media") {
      fetchMedia();
    }
  }, [activeTab, fetchMedia]);

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

  const handleDeleteMedia = (filePath: string, key?: string) => {
    const name = decodeURIComponent(filePath).split("/").pop() || "file";
    setConfirmDialog({
      title: "Elimina File Multimediale",
      message: `Sei sicuro di voler eliminare definitivamente "${name}"? Il file verrà rimosso dal server/cloud.`,
      confirmLabel: "[ elimina file ]",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/media", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: filePath, key }),
          });
          if (res.ok) {
            await fetchMedia();
            showToast("File eliminato definitivamente", "info");
          } else {
            const data = await res.json();
            showToast(data.error || "Errore durante l'eliminazione", "error");
          }
        } catch {
          showToast("Errore di rete durante l'eliminazione", "error");
        }
      },
    });
  };

  // Dynamic media files list (direct from Cloudflare R2 / server)
  const activeVideos = mediaFiles.videos || [];
  const activeImages = mediaFiles.images || [];

  // Filtered projects by search query
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter((p) => {
      const title = (p.title?.en || p.title?.it || "").toLowerCase();
      const year = (p.year || "").toLowerCase();
      const loc = (p.location || "").toLowerCase();
      const desc = (
        typeof p.description === "string"
          ? p.description
          : p.description?.it || p.description?.en || ""
      ).toLowerCase();
      return title.includes(q) || year.includes(q) || loc.includes(q) || desc.includes(q);
    });
  }, [projects, projectSearch]);

  // Filtered media by search and type filter
  const filteredVideos = useMemo(() => {
    if (!mediaSearch.trim()) return activeVideos;
    const q = mediaSearch.toLowerCase();
    return activeVideos.filter(
      (v) => v.name.toLowerCase().includes(q) || v.path.toLowerCase().includes(q)
    );
  }, [activeVideos, mediaSearch]);

  const filteredImages = useMemo(() => {
    if (!mediaSearch.trim()) return activeImages;
    const q = mediaSearch.toLowerCase();
    return activeImages.filter(
      (img) => img.name.toLowerCase().includes(q) || img.path.toLowerCase().includes(q)
    );
  }, [activeImages, mediaSearch]);

  // Project Editing Modal State
  const [editingProject, setEditingProject] = useState<LocalizedProject | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Hero Video Form State
  const [heroVideoUrl, setHeroVideoUrl] = useState(settings.heroVideo);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    representation: settings.representation,
    vatNumber: settings.vatNumber || "18341681007",
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

  // New Still input in project editor & Stills reordering
  const [newStillUrl, setNewStillUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [draggedStillIndex, setDraggedStillIndex] = useState<number | null>(null);

  // Confirmation Popup Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Sync state when context settings load
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroVideoUrl(settings.heroVideo);
      setContactForm({
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        representation: settings.representation,
        vatNumber: settings.vatNumber || "18341681007",
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

  // Close confirmation modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmDialog && !isConfirming) {
        setConfirmDialog(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmDialog, isConfirming]);

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
    showToast("Percorso copiato negli appunti!", "info");
    setTimeout(() => setCopiedPath(null), 2500);
  };

  // Open Project Editor
  const handleOpenEdit = (project: LocalizedProject) => {
    setNewStillUrl("");
    setNewVideoUrl("");
    setNewVideoTitle("");
    const cloned: LocalizedProject = JSON.parse(JSON.stringify(project));

    // Normalize videos: if videos is missing or empty but fullVideoUrl exists, seed it
    if (!cloned.videos || cloned.videos.length === 0) {
      if (cloned.fullVideoUrl) {
        cloned.videos = [
          {
            url: cloned.fullVideoUrl,
            title: "Main Film",
          },
        ];
      } else {
        cloned.videos = [];
      }
    }

    if (!cloned.description) {
      cloned.description = { en: "", it: "" };
    }

    setEditingProject(cloned);
    setIsCreatingNew(false);
  };

  const handleOpenCreateNew = () => {
    setNewStillUrl("");
    setNewVideoUrl("");
    setNewVideoTitle("");
    const newId = `project-${Date.now().toString().slice(-4)}`;
    const blankProject: LocalizedProject = {
      id: newId,
      title: {
        en: "",
        it: "",
      },

      year: new Date().getFullYear().toString(),
      client: "",
      location: "",
      duration: "",
      posterImage: "",
      videoPreviewUrl: "",
      fullVideoUrl: "",
      videos: [],
      telemetry: {
        speed: "",
        gForce: "",
        track: "",
        timecode: "",
      },
      description: {
        en: "",
        it: "",
      },
      featured: true,
      stills: [],
    };
    setEditingProject(blankProject);
    setIsCreatingNew(true);
  };

  // Save Project from Editor
  const handleSaveProjectModal = async () => {
    if (!editingProject) return;

    const projectToSave = { ...editingProject };

    // Synchronize videos and fullVideoUrl
    if (projectToSave.videos && projectToSave.videos.length > 0) {
      if (!projectToSave.fullVideoUrl || !projectToSave.videos.some((v) => v.url === projectToSave.fullVideoUrl)) {
        projectToSave.fullVideoUrl = projectToSave.videos[0].url;
      }
    } else if (projectToSave.fullVideoUrl) {
      projectToSave.videos = [
        {
          url: projectToSave.fullVideoUrl,
          title: "Main Film",
        },
      ];
    }

    const res = isCreatingNew
      ? await addProject(projectToSave)
      : await updateProject(projectToSave);

    if (res.ok) {
      setEditingProject(null);
      showToast(
        isCreatingNew ? "Nuovo progetto creato con successo!" : "Modifiche salvate con successo!",
        "success"
      );
    } else {
      showToast(`Impossibile salvare il progetto: ${res.error || "Errore sconosciuto"}`, "error");
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

  // Reorder Stills
  const handleMoveStill = (fromIndex: number, toIndex: number) => {
    if (!editingProject || !editingProject.stills) return;
    const stills = [...editingProject.stills];
    if (toIndex < 0 || toIndex >= stills.length) return;
    const [moved] = stills.splice(fromIndex, 1);
    stills.splice(toIndex, 0, moved);
    setEditingProject({
      ...editingProject,
      stills,
    });
  };

  // Add Main Video to currently editing project
  const handleAddMainVideo = async (urlToAdd?: string, titleToAdd?: string) => {
    if (!editingProject) return;
    const url = (urlToAdd || newVideoUrl).trim();
    if (!url) return;
    const currentVideos = editingProject.videos || [];
    const title =
      (titleToAdd || newVideoTitle).trim() ||
      `Film ${String(currentVideos.length + 1).padStart(2, "0")}`;

    const newVid: ProjectVideo = {
      url,
      title,
    };

    const updatedVideos = [...currentVideos, newVid];
    setEditingProject({
      ...editingProject,
      videos: updatedVideos,
      fullVideoUrl: editingProject.fullVideoUrl || url,
    });
    setNewVideoUrl("");
    setNewVideoTitle("");
  };

  // Remove Main Video with confirmation
  const handleRemoveMainVideo = (indexToRemove: number) => {
    if (!editingProject || !editingProject.videos) return;
    const vidToRemove = editingProject.videos[indexToRemove];
    const vidLabel = vidToRemove?.title || `Video #${indexToRemove + 1}`;

    setConfirmDialog({
      title: "Elimina video principale",
      message: `Sei sicuro di voler rimuovere "${vidLabel}" dall'elenco dei video principali del progetto?`,
      confirmLabel: "Elimina Video",
      onConfirm: async () => {
        const updated = (editingProject.videos || []).filter((_, idx) => idx !== indexToRemove);
        setEditingProject({
          ...editingProject,
          videos: updated,
          fullVideoUrl: updated.length > 0 ? updated[0].url : "",
        });
      },
    });
  };

  // Reorder Main Videos
  const handleMoveMainVideo = (fromIndex: number, toIndex: number) => {
    if (!editingProject || !editingProject.videos) return;
    const list = [...editingProject.videos];
    if (toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    setEditingProject({
      ...editingProject,
      videos: list,
      fullVideoUrl: list[0]?.url || "",
    });
  };

  // Update Main Video fields (title, url, duration, cover)
  const handleUpdateMainVideo = (index: number, patch: Partial<ProjectVideo>) => {
    if (!editingProject || !editingProject.videos) return;
    const list = [...editingProject.videos];
    if (!list[index]) return;
    list[index] = { ...list[index], ...patch };
    setEditingProject({
      ...editingProject,
      videos: list,
      fullVideoUrl: list[0]?.url || "",
    });
  };

  // Automatically generate cover for a single video from its frames
  const handleAutoGenerateCoverForVideo = async (vIdx: number) => {
    if (!editingProject || !editingProject.videos?.[vIdx]) return;
    const vid = editingProject.videos[vIdx];
    setIsUploading(`vid-cover-auto-${vIdx}`);
    try {
      const fullVideoUrl = resolveMediaUrl(vid.url);
      const thumb = await captureVideoThumbnail(fullVideoUrl, 1.0);
      if (!thumb?.blob) {
        throw new Error("Impossibile estrarre il fotogramma dal video. Verifica che il file video sia valido.");
      }
      const cleanName = (vid.title || `video-${vIdx + 1}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const thumbFile = new File([thumb.blob], `cover-${cleanName}-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const coverPath = await handleUploadFile(thumbFile, "image");
      if (coverPath) {
        handleUpdateMainVideo(vIdx, { posterImage: coverPath, poster: coverPath });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore generazione copertina automatica", "error");
    } finally {
      setIsUploading(null);
    }
  };

  // Automatically generate covers for all videos missing a cover
  const handleAutoGenerateAllCovers = async () => {
    if (!editingProject || !editingProject.videos || editingProject.videos.length === 0) return;
    setIsUploading("all-vid-covers");
    try {
      const updated = [...editingProject.videos];
      let generatedCount = 0;
      for (let idx = 0; idx < updated.length; idx++) {
        const vid = updated[idx];
        if (!vid.posterImage && !vid.poster) {
          try {
            const fullVideoUrl = resolveMediaUrl(vid.url);
            const thumb = await captureVideoThumbnail(fullVideoUrl, 1.0);
            if (thumb?.blob) {
              const cleanName = (vid.title || `video-${idx + 1}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
              const thumbFile = new File([thumb.blob], `cover-${cleanName}-${Date.now()}.jpg`, {
                type: "image/jpeg",
              });
              const coverPath = await handleUploadFile(thumbFile, "image");
              if (coverPath) {
                updated[idx] = { ...vid, posterImage: coverPath, poster: coverPath };
                generatedCount++;
              }
            }
          } catch (e) {
            console.warn(`Could not generate cover for video ${idx}:`, e);
          }
        }
      }
      if (generatedCount > 0) {
        setEditingProject({
          ...editingProject,
          videos: updated,
        });
        showToast(`Generate ${generatedCount} copertine video con successo!`, "success");
      } else {
        showToast("Tutti i video hanno già una copertina.", "info");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore durante la generazione delle copertine", "error");
    } finally {
      setIsUploading(null);
    }
  };

  // Save Hero Video
  const handleSaveHeroVideo = async () => {
    const res = await updateSettings({ heroVideo: heroVideoUrl });
    if (res.ok) {
      showToast("Video di sfondo home salvato con successo!", "success");
    } else {
      showToast(res.error || "Errore nel salvataggio del video home", "error");
    }
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
    showToast(`Canale "${newChan.name}" aggiunto`, "info");
  };

  const handleRemoveChannel = (idToRemove: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== idToRemove));
    showToast("Canale rimosso", "info");
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
    showToast(`Link footer "${newLink.label}" aggiunto`, "info");
  };

  const handleRemoveFooterLink = (idToRemove: string) => {
    setFooterLinks((prev) => prev.filter((l) => l.id !== idToRemove));
    showToast("Link footer rimosso", "info");
  };

  const handleUpdateFooterLink = (id: string, updated: Partial<FooterLink>) => {
    setFooterLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updated } : l))
    );
  };

  // Save Contact & Footer Info
  const handleSaveContact = async () => {
    const res = await updateSettings({
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
    if (res.ok) {
      showToast("Contatti e link footer salvati con successo!", "success");
    } else {
      showToast(res.error || "Errore nel salvataggio dei contatti", "error");
    }
  };

  // Save About Info
  const handleSaveAbout = async () => {
    try {
      const res = await updateSettings({
        about: aboutForm,
      });
      if (res.ok) {
        showToast("Sezione About salvata con successo!", "success");
      } else {
        showToast(`Errore: ${res.error || "Impossibile salvare"}`, "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Errore imprevisto nel salvataggio: ${msg}`, "error");
    }
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
    showToast("Nuovo blocco informativo aggiunto", "info");
  };

  const handleRemoveCustomBlock = (id: string) => {
    setAboutForm((prev) => ({
      ...prev,
      customBlocks: (prev.customBlocks || []).filter((b) => b.id !== id),
    }));
    showToast("Blocco rimosso", "info");
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
    showToast("File di backup scaricato con successo!", "success");
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
          showToast("Backup ripristinato con successo!", "success");
        } else {
          showToast("File JSON non valido: struttura progetti assente", "error");
        }
      } catch {
        showToast("Errore nella lettura del file JSON", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
      {/* ── TOP HEADER: ULTRA-MINIMAL & CRISP ── */}
      <header className="w-full border-b border-white/10 px-3 sm:px-8 py-3 sm:py-4 safe-top flex flex-wrap items-center justify-between gap-3 font-mono text-xs tracking-wider bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Link href="/" target="_blank" className="text-white font-medium hover:text-[#e0fe10] transition-colors">
            VALERIY KHLAMOV
          </Link>
          <span className="text-white/30 hidden sm:inline">{"//"}</span>
          <span className="text-white/60 hidden sm:inline">STUDIO CONSOLE</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{saveStatus === "saving" ? "salvataggio..." : "online & sincronizzato"}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all text-xs"
          >
            <span>Vedi Sito</span>
            <ExternalLink className="w-3 h-3 text-white/50" />
          </Link>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-red-400 hover:italic transition-colors cursor-pointer text-xs"
          >
            [ esci ]
          </button>
        </div>
      </header>

      {/* ── HIGH-END CINEMA TAB BAR ── */}
      <nav className="w-full border-b border-white/10 px-3 sm:px-8 flex items-center gap-1.5 sm:gap-2 overflow-x-auto mobile-touch-scroll font-mono text-xs tracking-wider py-2.5 bg-black/40 backdrop-blur-sm sticky top-0 z-30">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
            activeTab === "projects"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Film & Progetti</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "projects" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-white/70"
            }`}
          >
            {projects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("hero")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
            activeTab === "hero"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Video Home</span>
        </button>

        <button
          onClick={() => setActiveTab("about")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
            activeTab === "about"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bio & About</span>
        </button>

        <button
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
            activeTab === "contact"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Contatti & Footer</span>
        </button>

        <button
          onClick={() => setActiveTab("media")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
            activeTab === "media"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Libreria Media</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "media" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-white/70"
            }`}
          >
            {activeVideos.length + activeImages.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
            activeTab === "backup"
              ? "bg-white text-black font-semibold shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Backup & Sicurezza</span>
        </button>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* ── TAB 1: PROGETTI & FILM ── */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                  film & progetti
                </h2>
                <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                  gestisci l&apos;ordine, i video, le descrizioni e le foto per ciascun progetto
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="cerca per titolo, anno, luogo..."
                    className="bg-white/[0.04] border border-white/15 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-mono w-48 sm:w-64"
                  />
                  {projectSearch && (
                    <button
                      onClick={() => setProjectSearch("")}
                      className="text-white/40 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={handleOpenCreateNew}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#e0fe10] text-black font-mono text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuovo Progetto</span>
                </button>
              </div>
            </div>

            {/* Editorial Projects List */}
            <div className="space-y-4">
              {projects.length === 0 ? (
                <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center font-mono text-xs text-white/40 space-y-3">
                  <Film className="w-8 h-8 text-white/20 mx-auto" />
                  <div>Nessun progetto presente. Clicca su &quot;Nuovo Progetto&quot; per iniziare.</div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center font-mono text-xs text-white/40 space-y-2">
                  <div>Nessun progetto trovato per &quot;{projectSearch}&quot;</div>
                  <button
                    onClick={() => setProjectSearch("")}
                    className="text-[#e0fe10] hover:underline cursor-pointer"
                  >
                    [ Reimposta ricerca ]
                  </button>
                </div>
              ) : (
                filteredProjects.map((proj) => {
                  const realIdx = projects.findIndex((p) => p.id === proj.id);
                  const isFirst = realIdx === 0;
                  const isLast = realIdx === projects.length - 1;
                  const vidCount = Array.isArray(proj.videos) && proj.videos.length > 0 ? proj.videos.length : (proj.fullVideoUrl ? 1 : 0);
                  const desc = typeof proj.description === "string" ? proj.description : proj.description?.it || proj.description?.en || "";

                  return (
                    <div
                      key={proj.id}
                      className="group border border-white/10 hover:border-white/25 bg-white/[0.015] hover:bg-white/[0.03] p-4 sm:p-5 rounded-2xl transition-all duration-300 grid grid-cols-1 md:grid-cols-12 gap-5 items-center"
                    >
                      {/* Visual preview thumbnail */}
                      <div className="md:col-span-3">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10 group-hover:border-white/20 transition-all">
                          {proj.posterImage || proj.stills?.[0]?.url ? (
                            <Image
                              src={resolveMediaUrl(proj.posterImage || proj.stills?.[0]?.url || "")}
                              alt={proj.title.en || proj.title.it || "Project"}
                              fill
                              unoptimized
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/20 font-mono text-[10px] uppercase tracking-wider bg-white/[0.02]">
                              <span>[ nessuna cover ]</span>
                            </div>
                          )}

                          {/* Index badge */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/15 font-mono text-[10px] text-white/90">
                            #{String(realIdx + 1).padStart(2, "0")}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="md:col-span-6 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-white/40">
                          <span className="text-white/80 font-semibold">{proj.year}</span>
                          {proj.location && (
                            <>
                              <span>•</span>
                              <span className="text-white/60">{proj.location}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70 text-[10px]">
                            {vidCount} {vidCount === 1 ? "video" : "video"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70 text-[10px]">
                            {proj.stills?.length || 0} stills
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-light tracking-tight text-white group-hover:text-white transition-colors">
                          {proj.title.en || proj.title.it || "Film senza titolo"}
                        </h3>

                        {desc.trim() && (
                          <p className="text-xs text-white/55 font-light line-clamp-2 leading-relaxed">
                            {desc}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-3 flex flex-wrap md:flex-col items-start md:items-end justify-between md:justify-center gap-2 font-mono text-xs">
                        {/* Reorder Arrows */}
                        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 p-1 rounded-lg">
                          <button
                            onClick={() => reorderProjects(realIdx, realIdx - 1)}
                            disabled={isFirst}
                            className="p-1 rounded hover:bg-white/20 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                            title="Sposta in alto"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-white/30 px-1">pos</span>
                          <button
                            onClick={() => reorderProjects(realIdx, realIdx + 1)}
                            disabled={isLast}
                            className="p-1 rounded hover:bg-white/20 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                            title="Sposta in basso"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(proj)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black transition-all cursor-pointer font-medium"
                          >
                            <span>Modifica</span>
                          </button>

                          <Link
                            href={`/project/${proj.id}`}
                            target="_blank"
                            className="p-2 rounded-lg border border-white/10 hover:border-white/30 text-white/60 hover:text-white transition-all cursor-pointer"
                            title="Apri anteprima film in nuova scheda"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => {
                              const title = proj.title.en || proj.title.it || "Senza titolo";
                              setConfirmDialog({
                                title: "Elimina Progetto",
                                message: `Sei sicuro di voler eliminare definitivamente il progetto "${title}"? Questa operazione non può essere annullata.`,
                                confirmLabel: "[ elimina definitivamente ]",
                                onConfirm: async () => {
                                  const res = await deleteProject(proj.id);
                                  if (!res.ok) {
                                    showToast(
                                      `Impossibile eliminare il progetto: ${res.error || "Errore sconosciuto"}`,
                                      "error"
                                    );
                                  } else {
                                    showToast("Progetto eliminato definitivamente", "info");
                                  }
                                },
                              });
                            }}
                            className="p-2 rounded-lg border border-red-500/20 hover:border-red-500/50 text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Elimina progetto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: VIDEO HOME ── */}
        {activeTab === "hero" && (
          <div className="space-y-8 max-w-4xl">
            <div className="pb-4 border-b border-white/10 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                  video di sfondo home
                </h2>
                <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                  video riprodotto a tutto schermo all&apos;apertura del portfolio
                </p>
              </div>
              <button
                onClick={handleSaveHeroVideo}
                className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-[#e0fe10] transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salva Impostazione</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Main Video Input & Upload Card */}
              <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-xs font-mono uppercase text-white/60 tracking-wider flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#e0fe10]" />
                    <span>percorso o url del video di sfondo</span>
                  </label>

                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-mono transition-colors cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading === "hero" ? <AnimatedLoadingText label="caricamento" /> : "Carica video dal PC"}</span>
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
                              showToast("Video caricato e impostato come sfondo!", "success");
                            }
                          } catch (err) {
                            showToast("Errore caricamento: " + (err instanceof Error ? err.message : ""), "error");
                          } finally {
                            setIsUploading(null);
                            e.target.value = "";
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={heroVideoUrl}
                    onChange={(e) => setHeroVideoUrl(e.target.value)}
                    placeholder="https://... o /videos/hero.mp4"
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-[#e0fe10] transition-colors"
                  />
                  {heroVideoUrl && (
                    <button
                      type="button"
                      onClick={() => handleCopy(heroVideoUrl)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer text-xs font-mono flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>copia</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-3">
                <span className="text-xs font-mono text-white/40 tracking-wider uppercase flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-[#e0fe10]" />
                  <span>anteprima streaming in tempo reale</span>
                </span>
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl">
                  {heroVideoUrl ? (
                    <video
                      key={heroVideoUrl}
                      src={heroVideoUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center font-mono text-xs text-white/40 gap-2">
                      <Video className="w-8 h-8 opacity-30" />
                      <span>Nessun video attualmente impostato</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Select from Server Videos */}
              <div className="space-y-4 pt-6 border-t border-white/10 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-white/40" />
                    <span>Oppure seleziona rapidamente dai video del server ({activeVideos.length}):</span>
                  </span>
                </div>

                {activeVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeVideos.map((vid) => {
                      const isSelected = heroVideoUrl === vid.path;
                      return (
                        <button
                          key={vid.path}
                          onClick={() => {
                            setHeroVideoUrl(vid.path);
                            showToast(`Selezionato: ${vid.name}`, "info");
                          }}
                          className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 group ${
                            isSelected
                              ? "bg-[#e0fe10]/10 border-[#e0fe10] text-white shadow-[0_0_15px_rgba(224,254,16,0.15)]"
                              : "bg-[#09090b] border-white/10 text-white/60 hover:text-white hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-light text-white text-xs truncate group-hover:italic">{vid.name}</span>
                            {isSelected ? (
                              <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#e0fe10] text-black text-[10px] font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Attivo
                              </span>
                            ) : (
                              vid.size && <span className="text-[10px] text-white/30">{vid.size}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-white/30 truncate">{vid.path}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-white/40 text-xs">
                    Nessun video presente sul server. Caricane uno usando il pulsante sopra o dalla libreria file.
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
                className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-[#e0fe10] transition-colors cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Salvataggio..." : "Salva Sezione About"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
              {/* Colonna Sinistra: Profilo Principale */}
              <div className="lg:col-span-6 space-y-6 font-mono text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                    {"//"} testi, direzione & biografia (colonna sinistra)
                  </span>
                </div>

                {/* Foto About Colonna Destra */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-white/80 uppercase tracking-wider block font-bold text-xs">
                        foto about (mostrata a destra)
                      </label>
                      <p className="text-[10px] text-white/40">
                        Foto ritratto o cinema still mostrata a destra nella sezione about della homepage
                      </p>
                    </div>

                    <label className="cursor-pointer">
                      <span className="text-white hover:italic transition-colors text-[11px] underline underline-offset-4">
                        {isUploading === "about-image" ? (
                          <AnimatedLoadingText label="caricamento" />
                        ) : (
                          "[ + carica foto dal pc ]"
                        )}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading === "about-image"}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            try {
                              setIsUploading("about-image");
                              const path = await handleUploadFile(f, "image");
                              if (path) {
                                setAboutForm((prev) => ({ ...prev, image: path }));
                                showToast("Foto profilo caricata!", "success");
                              }
                            } catch (err: any) {
                              showToast(`Errore caricamento immagine: ${err.message}`, "error");
                            } finally {
                              setIsUploading(null);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Manual path / URL */}
                  <input
                    type="text"
                    value={aboutForm.image || ""}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, image: e.target.value })
                    }
                    placeholder="/images/... oppure https://..."
                    className="w-full bg-transparent border-b border-white/20 py-1.5 text-white/90 focus:outline-none focus:border-white transition-colors text-xs font-mono"
                  />

                  {/* Quick select from media library if available */}
                  {activeImages.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-white/40 shrink-0">o scegli da libreria:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setAboutForm((prev) => ({ ...prev, image: e.target.value }));
                          }
                        }}
                        value=""
                        className="bg-black/80 border border-white/20 rounded text-[11px] font-mono text-white/80 py-1 px-2 focus:outline-none focus:border-white w-full max-w-xs cursor-pointer truncate"
                      >
                        <option value="" disabled>-- seleziona immagine caricata --</option>
                        {activeImages.map((img) => (
                          <option key={img.path || img.name} value={img.path}>
                            {img.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Visual preview */}
                  {aboutForm.image && (
                    <div className="flex items-start gap-4 pt-2">
                      <div className="relative w-28 aspect-[3/4] rounded-lg overflow-hidden border border-white/20 bg-black shrink-0">
                        <img
                          src={resolveMediaUrl(aboutForm.image)}
                          alt="About preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-white/50 break-all">
                          {aboutForm.image}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAboutForm({ ...aboutForm, image: "" })}
                          className="text-red-400 hover:text-red-300 hover:italic text-[11px] font-mono cursor-pointer"
                        >
                          [ rimuovi foto ]
                        </button>
                      </div>
                    </div>
                  )}
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

            {/* Anteprima Live in stile Sezione About (con testi a sinistra e foto a destra) */}
            <div className="pt-8 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                  {"//"} anteprima in tempo reale (come appare nella sezione about sotto a projects)
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  ● live preview
                </span>
              </div>
              <div className="relative rounded-2xl border border-white/15 bg-black/80 backdrop-blur-md overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch text-white relative">
                  {/* Photo Layer: background on mobile with dark shading, right column on desktop */}
                  <div className="absolute inset-0 lg:relative lg:inset-auto lg:col-span-5 border-t-0 lg:border-l border-white/10 bg-[#0c0c0e] order-1 lg:order-2 overflow-hidden">
                    <img
                      src={resolveMediaUrl(aboutForm.image || "/images/still-2026-09-23-130212_1-2-1-5306.jpg")}
                      alt="About preview"
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] lg:hidden pointer-events-none" />
                    <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Info Preview: directly on top on mobile, left column on desktop */}
                  <div className="relative z-10 lg:col-span-7 p-6 sm:p-8 space-y-5 order-2 lg:order-1">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 block">
                      {aboutForm.badge || "// ABOUT ME"}
                    </span>
                    <p className="text-xl sm:text-2xl md:text-3xl font-light leading-snug tracking-tight">
                      {aboutForm.title || "Valerio Khlamov"}
                    </p>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-light whitespace-pre-line">
                      {aboutForm.bio}
                    </p>
                    {aboutForm.secondaryBio && (
                      <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-light whitespace-pre-line pt-2 border-t border-white/[0.06]">
                        {aboutForm.secondaryBio}
                      </p>
                    )}

                    <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs text-white/70">
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

                      {Boolean(aboutForm.accreditations && aboutForm.accreditations.trim()) && (
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

                      {settings.representation && (
                        <div>
                          <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1">
                            REPRESENTATION
                          </span>
                          <p className="text-white font-light text-xs whitespace-pre-line">
                            {settings.representation}
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
          </div>
        )}

        {/* ── TAB 4: CONTATTI ── */}
        {activeTab === "contact" && (
          <div className="space-y-8 max-w-3xl">
            <div className="pb-4 border-b border-white/10 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-light text-white italic tracking-tight lowercase">
                  contatti & canali
                </h2>
                <p className="text-xs font-mono text-white/40 tracking-wider mt-1">
                  informazioni mostrate nell&apos;overlay contatti e nel footer del sito
                </p>
              </div>
              <button
                onClick={handleSaveContact}
                className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-[#e0fe10] transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salva Contatti</span>
              </button>
            </div>

            <div className="space-y-8 font-mono text-xs">
              {/* Direct Info Card */}
              <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-white/10 space-y-4">
                <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                  {"//"} contatti diretti & fiscali
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/50 uppercase tracking-wider block text-[10px]">
                      email di contatto
                    </label>
                    <input
                      type="email"
                      value={contactForm.contactEmail}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, contactEmail: e.target.value })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-white/50 uppercase tracking-wider block text-[10px]">
                      telefono / whatsapp hotline
                    </label>
                    <input
                      type="text"
                      value={contactForm.contactPhone}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, contactPhone: e.target.value })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-white/50 uppercase tracking-wider block text-[10px]">
                      rappresentanza & sede
                    </label>
                    <input
                      type="text"
                      value={contactForm.representation}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, representation: e.target.value })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-white/50 uppercase tracking-wider block text-[10px]">
                      partita iva (p.iva)
                    </label>
                    <input
                      type="text"
                      value={contactForm.vatNumber}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, vatNumber: e.target.value })
                      }
                      placeholder="18341681007"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Channels Section */}
              <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                    {"//"} canali & social ({channels.length})
                  </span>
                </div>

                {/* List of existing channels */}
                <div className="space-y-3">
                  {channels.map((chan) => (
                    <div
                      key={chan.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5"
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
                          className="w-full bg-transparent border-b border-white/20 py-1 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
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
                          className="w-full bg-transparent border-b border-white/20 py-1 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(chan.id)}
                        className="text-red-400/80 hover:text-red-400 hover:italic transition-colors cursor-pointer self-start sm:self-center text-xs px-2 py-1"
                      >
                        [ rimuovi ]
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new channel */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">aggiungi canale</span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="Nome (es. YouTube)"
                      className="w-full sm:w-1/3 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={newChannelUrl}
                      onChange={(e) => setNewChannelUrl(e.target.value)}
                      placeholder="URL (es. https://...)"
                      className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddChannel}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-colors cursor-pointer shrink-0"
                    >
                      + Aggiungi
                    </button>
                  </div>
                </div>
              </div>

              {/* ── FOOTER CENTER LINKS ── */}
              <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-white/10 space-y-4">
                <div>
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                    {"//"} link al centro nel footer ({footerLinks.length})
                  </span>
                  <p className="text-[10px] text-white/40 mt-1">
                    visibili in basso al centro sia nella home che nelle pagine di dettaglio
                  </p>
                </div>

                {/* List of existing footer links */}
                <div className="space-y-3">
                  {footerLinks.map((flink) => (
                    <div
                      key={flink.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5"
                    >
                      <div className="w-full sm:w-1/3">
                        <label className="text-[10px] text-white/30 block mb-0.5">
                          testo link
                        </label>
                        <input
                          type="text"
                          value={flink.label}
                          onChange={(e) =>
                            handleUpdateFooterLink(flink.id, { label: e.target.value })
                          }
                          placeholder="es. Vimeo ↗"
                          className="w-full bg-transparent border-b border-white/20 py-1 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-white/30 block mb-0.5">
                          url destinazione
                        </label>
                        <input
                          type="text"
                          value={flink.url}
                          onChange={(e) =>
                            handleUpdateFooterLink(flink.id, { url: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full bg-transparent border-b border-white/20 py-1 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFooterLink(flink.id)}
                        className="text-red-400/80 hover:text-red-400 hover:italic transition-colors cursor-pointer self-start sm:self-center text-xs px-2 py-1"
                      >
                        [ rimuovi ]
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new footer link */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">aggiungi link footer</span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newFooterLabel}
                      onChange={(e) => setNewFooterLabel(e.target.value)}
                      placeholder="Testo (es. Vimeo ↗)"
                      className="w-full sm:w-1/3 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={newFooterUrl}
                      onChange={(e) => setNewFooterUrl(e.target.value)}
                      placeholder="URL (es. https://vimeo.com)"
                      className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddFooterLink}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-colors cursor-pointer shrink-0"
                    >
                      + Aggiungi
                    </button>
                  </div>
                </div>
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
                  gestisci immagini e video caricati. clicca su copia percorso per usarli nei progetti
                </p>
              </div>

              {/* Upload controls */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer shadow-md">
                  <Video className="w-3.5 h-3.5 text-[#e0fe10]" />
                  <span>{isUploading === "media-video" ? <AnimatedLoadingText label="caricamento video" /> : "Carica Video"}</span>
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
                          showToast("Video caricato con successo!", "success");
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Errore caricamento", "error");
                        } finally {
                          setIsUploading(null);
                          e.target.value = "";
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer shadow-md">
                  <ImageIcon className="w-3.5 h-3.5 text-[#e0fe10]" />
                  <span>{isUploading === "media-image" ? <AnimatedLoadingText label="caricamento immagine" /> : "Carica Immagine"}</span>
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
                          showToast("Immagine caricata con successo!", "success");
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Errore caricamento", "error");
                        } finally {
                          setIsUploading(null);
                          e.target.value = "";
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Cloudflare R2 Storage Monitor */}
            <R2StorageMonitor
              storageInfo={storageInfo}
              isRefreshing={isRefreshingStorage}
              onRefresh={handleRefreshStorage}
            />

            {/* Media Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0a0a0c] border border-white/10 font-mono text-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Cerca file per nome o percorso..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-[#e0fe10] transition-colors"
                />
                {mediaSearch && (
                  <button
                    onClick={() => setMediaSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Type pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    mediaTypeFilter === "all"
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Tutti ({activeVideos.length + activeImages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter("videos")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    mediaTypeFilter === "videos"
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Video className="w-3 h-3" />
                  <span>Video ({activeVideos.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter("images")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    mediaTypeFilter === "images"
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Immagini ({activeImages.length})</span>
                </button>
              </div>
            </div>

            {/* Video List */}
            {(mediaTypeFilter === "all" || mediaTypeFilter === "videos") && (
              <div className="space-y-4">
                <div className="text-xs font-mono text-white/50 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-[#e0fe10]" />
                    <span>file video ({filteredVideos.length})</span>
                  </span>
                </div>
                {filteredVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredVideos.map((vid) => (
                      <div key={vid.path} className="p-3 rounded-2xl bg-[#09090b] border border-white/10 space-y-3 group hover:border-white/20 transition-all">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/5">
                          <video
                            src={vid.path}
                            muted
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-start justify-between text-xs font-mono gap-2">
                          <div className="overflow-hidden">
                            <div className="text-white font-light truncate" title={vid.name}>{vid.name}</div>
                            <div className="text-[10px] text-white/30 truncate">
                              {vid.size} • {vid.path}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono">
                          <button
                            onClick={() => handleCopy(vid.path)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedPath === vid.path ? "Copiato!" : "Copia URL"}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <a
                              href={vid.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/40 hover:text-white transition-colors"
                              title="Apri file in nuova scheda"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleDeleteMedia(vid.path, vid.key)}
                              className="text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                              title="Elimina file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-white/10 rounded-xl text-center font-mono text-xs text-white/40">
                    {mediaSearch ? "Nessun video corrispondente alla ricerca." : "Nessun video caricato."}
                  </div>
                )}
              </div>
            )}

            {/* Image List */}
            {(mediaTypeFilter === "all" || mediaTypeFilter === "images") && (
              <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="text-xs font-mono text-white/50 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-[#e0fe10]" />
                    <span>file immagini ({filteredImages.length})</span>
                  </span>
                </div>
                {filteredImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredImages.map((img) => (
                      <div key={img.path} className="p-2.5 rounded-xl bg-[#09090b] border border-white/10 space-y-2 group hover:border-white/20 transition-all">
                        <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-black border border-white/5">
                          <Image
                            src={img.path}
                            alt={img.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="text-xs font-mono">
                          <div className="text-white font-light truncate text-[11px]" title={img.name}>{img.name}</div>
                          <div className="text-[10px] text-white/30 truncate">{img.size}</div>
                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                            <button
                              onClick={() => handleCopy(img.path)}
                              className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span className="text-[10px]">{copiedPath === img.path ? "Copiato" : "Copia"}</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <a
                                href={img.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/40 hover:text-white transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => handleDeleteMedia(img.path, img.key)}
                                className="text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-white/10 rounded-xl text-center font-mono text-xs text-white/40">
                    {mediaSearch ? "Nessuna immagine corrispondente alla ricerca." : "Nessuna immagine caricata."}
                  </div>
                )}
              </div>
            )}
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

            {/* Backup options Cards */}
            <div className="space-y-4 pb-6 border-b border-white/10">
              <div className="text-white/50 uppercase tracking-wider">{"//"} backup dati di sistema</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleExportBackup}
                  className="p-4 rounded-xl bg-[#0a0a0c] border border-white/10 hover:border-white/30 text-left transition-all cursor-pointer group flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium group-hover:italic">Scarica Backup</span>
                    <ArrowDown className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-white/40">Esporta tutto in formato JSON</span>
                </button>

                <label className="p-4 rounded-xl bg-[#0a0a0c] border border-white/10 hover:border-white/30 text-left transition-all cursor-pointer group flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium group-hover:italic">Importa Backup</span>
                    <Upload className="w-4 h-4 text-[#e0fe10]" />
                  </div>
                  <span className="text-[10px] text-white/40">Carica file JSON esportato</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => {
                    setConfirmDialog({
                      title: "Reset Dati di Fabbrica",
                      message: "Ripristinare tutti i dati originali di fabbrica? Le modifiche correnti verranno sovrascritte.",
                      confirmLabel: "[ conferma reset ]",
                      onConfirm: async () => {
                        await resetToDefaults();
                      },
                    });
                  }}
                  className="p-4 rounded-xl bg-[#140808] border border-red-500/20 hover:border-red-500/50 text-left transition-all cursor-pointer group flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-red-300 font-medium group-hover:italic">Reset Fabbrica</span>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-[10px] text-red-400/50">Ripristina configurazione iniziale</span>
                </button>
              </div>
            </div>

            {/* Change PIN (Server Encrypted PBKDF2) */}
            <div className="space-y-4 p-6 rounded-2xl bg-[#0a0a0c] border border-white/10">
              <div className="text-white/50 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#e0fe10]" />
                <span>{"//"} modifica pin di sicurezza server</span>
              </div>
              <form onSubmit={handleChangePin} className="space-y-4 max-w-sm">
                <div>
                  <label className="text-[10px] text-white/40 uppercase block mb-1">PIN Attuale</label>
                  <div className="relative">
                    <input
                      type={showCurrentPin ? "text" : "password"}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="inserisci pin attuale"
                      className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 pr-9 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPin(!showCurrentPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      {showCurrentPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase block mb-1">Nuovo PIN (minimo 6 caratteri)</label>
                  <div className="relative">
                    <input
                      type={showNewPin ? "text" : "password"}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="nuovo pin di sicurezza"
                      className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 pr-9 text-white focus:outline-none focus:border-[#e0fe10] transition-colors text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="px-4 py-2.5 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-[#e0fe10] transition-colors cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-40"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isChangingPin ? "Hashing in corso..." : "Aggiorna PIN sul Server"}</span>
                </button>
                {pinSuccessMsg && (
                  <p className="text-emerald-400 text-xs tracking-wider pt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{pinSuccessMsg}</span>
                  </p>
                )}
                {pinChangeErrorMsg && (
                  <p className="text-red-400 text-xs tracking-wider pt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{pinChangeErrorMsg}</span>
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
            {/* Modal Sticky Header */}
            <div className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur-md pb-4 pt-2 border-b border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-white/40 tracking-widest uppercase">
                    {isCreatingNew ? "[ nuovo progetto ]" : `[ edit: ${editingProject.id} ]`}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-light text-white italic lowercase">
                    {editingProject.title.en || editingProject.title.it || "Senza Titolo"}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveProjectModal}
                    className="px-4 py-1.5 rounded-lg bg-white text-black font-mono text-xs font-bold hover:bg-[#e0fe10] transition-colors cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isCreatingNew ? "Crea Progetto" : "Salva"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="hover:text-white text-white/40 transition-colors cursor-pointer p-1.5 rounded-lg border border-white/10 hover:border-white/30"
                    title="Chiudi modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Jump Nav Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setModalSection("general");
                    document.getElementById("modal-section-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    modalSection === "general"
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  01 Info
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalSection("videos");
                    document.getElementById("modal-section-videos")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    modalSection === "videos"
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  02 Video ({editingProject.videos?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalSection("cover");
                    document.getElementById("modal-section-cover")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    modalSection === "cover"
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  03 Copertina
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalSection("stills");
                    document.getElementById("modal-section-stills")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    modalSection === "stills"
                      ? "bg-white text-black font-bold"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  04 Stills ({editingProject.stills?.length || 0})
                </button>
              </div>
            </div>

            {/* General Info */}
            <div id="modal-section-info" className="space-y-6">
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


              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

              {/* Descrizione Progetto */}
              <div className="space-y-1">
                <label className="text-white/40 block">
                  descrizione progetto <span className="normal-case text-white/25">(opzionale — visualizzata tra i video e i frame & stills)</span>
                </label>
                <textarea
                  rows={3}
                  value={
                    typeof editingProject.description === "string"
                      ? editingProject.description
                      : editingProject.description?.it || editingProject.description?.en || ""
                  }
                  placeholder="Descrizione o note di regia del film (appare nella pagina del progetto tra i video e i frame & stills)..."
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingProject({
                      ...editingProject,
                      description: {
                        en: val,
                        it: val,
                      },
                    });
                  }}
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/20 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Media URLs */}
            <div id="modal-section-videos" className="space-y-6 pt-4 border-t border-white/10">
              <div className="text-white/40 uppercase tracking-widest">{"//"} video & poster</div>

              {/* Video Preview (for homepage hover cards) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white/40 block">video preview url (hover home)</label>
                    <span className="text-[10px] text-white/30 font-mono">Breve loop riprodotto al passaggio del mouse sulle card della home</span>
                  </div>
                  <label className="text-[11px] text-white/70 hover:text-white hover:italic cursor-pointer">
                    <span>{isUploading === "proj-preview" ? <AnimatedLoadingText label="caricamento" /> : "[ + carica video preview ]"}</span>
                    <input
                      type="file"
                      accept="video/*,.mp4,.webm,.mov"
                      disabled={isUploading === "proj-preview"}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setIsUploading("proj-preview");
                          try {
                            const path = await handleUploadFile(f, "video");
                            if (path) {
                              setEditingProject((prev) => (prev ? { ...prev, videoPreviewUrl: path } : null));
                              showToast("Video preview caricato!", "success");
                            }
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : "Errore caricamento preview", "error");
                          } finally {
                            setIsUploading(null);
                            e.target.value = "";
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
                  placeholder="nessun URL video impostato"
                  onChange={(e) =>
                    setEditingProject((prev) => (prev ? { ...prev, videoPreviewUrl: e.target.value } : null))
                  }
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                />
                {editingProject.videoPreviewUrl && (
                  <div className="pt-1 flex items-center justify-between text-[11px] text-white/40 font-mono">
                    <span className="truncate max-w-[300px]">{editingProject.videoPreviewUrl}</span>
                    <button
                      type="button"
                      onClick={() => setEditingProject((prev) => (prev ? { ...prev, videoPreviewUrl: "" } : null))}
                      className="text-red-400 hover:text-red-300 ml-2 cursor-pointer"
                    >
                      [ rimuovi ]
                    </button>
                  </div>
                )}
              </div>

              {/* Video Preview Visual player if set */}
              {editingProject.videoPreviewUrl && (
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-white/40">anteprima video hover home:</div>
                  <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden bg-black/60 border border-white/10">
                    <video
                      src={resolveMediaUrl(editingProject.videoPreviewUrl)}
                      controls
                      muted
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* MULTI MAIN VIDEOS SECTION (DEDICATED PROJECT PAGE) */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-white font-medium flex items-center gap-2">
                      <span className="text-[#e0fe10] font-mono">{"//"}</span>
                      <span>video principali (pagina progetto)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        {editingProject.videos?.length || 0} {editingProject.videos?.length === 1 ? "video" : "video"}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 font-mono mt-0.5">
                      Puoi caricare più video principali (es. Main Film 4K, Director&apos;s Cut, Teaser, Reel). Gli spettatori potranno selezionarli direttamente nella pagina del progetto.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {editingProject.videos && editingProject.videos.some((v) => !v.posterImage && !v.poster) && (
                      <button
                        type="button"
                        onClick={handleAutoGenerateAllCovers}
                        disabled={isUploading !== null}
                        className="text-[11px] text-white hover:text-black bg-white/10 hover:bg-[#e0fe10] cursor-pointer inline-flex items-center gap-1.5 py-1 px-2.5 rounded border border-white/20 transition-all font-mono"
                        title="Estrae e crea automaticamente la copertina da tutti i video senza cover"
                      >
                        {isUploading === "all-vid-covers" ? (
                          <AnimatedLoadingText label="creazione copertine" />
                        ) : (
                          <span>⚡ genera tutte le copertine</span>
                        )}
                      </button>
                    )}

                    <label className="text-[11px] text-[#e0fe10] hover:brightness-110 cursor-pointer inline-flex items-center gap-1.5 py-1 px-3 rounded border border-[#e0fe10]/30 bg-[#e0fe10]/10 transition-all font-mono">
                      <span>{isUploading === "proj-videos" ? <AnimatedLoadingText label="caricamento" /> : "[ + carica video dal pc ]"}</span>
                    <input
                      type="file"
                      accept="video/*,.mp4,.webm,.mov"
                      multiple
                      disabled={isUploading === "proj-videos"}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        setIsUploading("proj-videos");
                        try {
                          const newVids: ProjectVideo[] = [];
                          for (let i = 0; i < files.length; i++) {
                            const f = files[i];
                            const path = await handleUploadFile(f, "video");

                            if (path) {
                              const cleanTitle = f.name
                                .replace(/\.[^/.]+$/, "")
                                .replace(/[-_]/g, " ");
                              newVids.push({
                                url: path,
                                title: cleanTitle || `Film ${String((editingProject?.videos?.length || 0) + i + 1).padStart(2, "0")}`,
                                posterImage: "",
                                poster: "",
                              });
                            }
                          }
                          if (newVids.length > 0) {
                            setEditingProject((prev) => {
                              if (!prev) return null;
                              const combined = [...(prev.videos || []), ...newVids];
                              return {
                                ...prev,
                                videos: combined,
                                fullVideoUrl: prev.fullVideoUrl || combined[0]?.url || "",
                              };
                            });
                          }
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Errore caricamento video", "error");
                        } finally {
                          setIsUploading(null);
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

                {/* List of Main Videos */}
                {editingProject.videos && editingProject.videos.length > 0 ? (
                  <div className="space-y-3">
                    {editingProject.videos.map((vid, vIdx) => {
                      const isFirst = vIdx === 0;
                      const isLast = vIdx === (editingProject.videos?.length || 0) - 1;
                      return (
                        <div
                          key={`main-vid-${vIdx}-${vid.url}`}
                          className="bg-black/50 border border-white/10 rounded-lg p-3 sm:p-4 space-y-3 hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[11px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-[#e0fe10] font-bold">
                                [ {String(vIdx + 1).padStart(2, "0")} ]
                              </span>
                              {isFirst ? (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#e0fe10]/15 text-[#e0fe10] border border-[#e0fe10]/30">
                                  Default / Player Iniziale
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                                  Video #{vIdx + 1}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveMainVideo(vIdx, vIdx - 1)}
                                className="bg-black/80 hover:bg-white hover:text-black text-white px-2 py-0.5 rounded disabled:opacity-20 disabled:hover:bg-black/80 disabled:hover:text-white transition-colors cursor-pointer border border-white/20"
                                title="Sposta su"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveMainVideo(vIdx, vIdx + 1)}
                                className="bg-black/80 hover:bg-white hover:text-black text-white px-2 py-0.5 rounded disabled:opacity-20 disabled:hover:bg-black/80 disabled:hover:text-white transition-colors cursor-pointer border border-white/20"
                                title="Sposta giù"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMainVideo(vIdx)}
                                className="text-red-400 hover:text-red-300 hover:underline ml-1 cursor-pointer"
                              >
                                [ rimuovi ]
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                            {/* Video preview mini player */}
                            <div className="md:col-span-4 aspect-video rounded overflow-hidden bg-black/80 border border-white/10 relative group">
                              <video
                                src={resolveMediaUrl(vid.url)}
                                controls
                                preload="metadata"
                                muted
                                className="w-full h-full object-contain"
                              />
                            </div>

                            {/* Video details inputs */}
                            <div className="md:col-span-8 space-y-2.5">
                              <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-widest block font-mono">
                                  Titolo / Versione video
                                </label>
                                <input
                                  type="text"
                                  value={vid.title || ""}
                                  placeholder="es. Main Film 4K, Director's Cut, Instagram Reel"
                                  onChange={(e) =>
                                    handleUpdateMainVideo(vIdx, { title: e.target.value })
                                  }
                                  className="w-full bg-transparent border-b border-white/15 py-1 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                                />
                              </div>

                              {/* Video Description */}
                              <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-widest block font-mono">
                                  Descrizione video <span className="normal-case text-white/25">(opzionale — visualizzata sotto il player)</span>
                                </label>
                                <textarea
                                  value={vid.description || ""}
                                  placeholder="Descrivi questo video: tecnica di ripresa, emozioni, contesto narrativo…"
                                  rows={2}
                                  onChange={(e) =>
                                    handleUpdateMainVideo(vIdx, { description: e.target.value })
                                  }
                                  className="w-full bg-transparent border-b border-white/15 py-1 text-sm text-white/80 focus:outline-none focus:border-white transition-colors placeholder:text-white/20 resize-none leading-relaxed"
                                />
                              </div>

                              {/* Video Cover / Poster Field */}
                              <div>
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] text-white/40 uppercase tracking-widest block font-mono">
                                    Cover / Poster Video {vid.posterImage || vid.poster ? "" : "(opzionale - fallback su poster/stills attivo)"}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAutoGenerateCoverForVideo(vIdx)}
                                      disabled={isUploading !== null}
                                      className="text-[9px] text-[#e0fe10] hover:underline cursor-pointer inline-flex items-center gap-0.5 font-mono"
                                      title="Estrae un fotogramma da questo video e lo imposta come copertina"
                                    >
                                      {isUploading === `vid-cover-auto-${vIdx}` ? (
                                        <AnimatedLoadingText label="creazione" />
                                      ) : (
                                        <span>[ ⚡ genera dal video ]</span>
                                      )}
                                    </button>
                                    <label className="text-[9px] text-white/70 hover:text-white hover:underline cursor-pointer inline-flex items-center gap-1 font-mono">
                                      <span>{isUploading === `vid-cover-${vIdx}` ? <AnimatedLoadingText label="caricamento" /> : "[ carica immagine ]"}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        disabled={isUploading === `vid-cover-${vIdx}`}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          setIsUploading(`vid-cover-${vIdx}`);
                                          try {
                                            const path = await handleUploadFile(file, "image");
                                            if (path) {
                                              handleUpdateMainVideo(vIdx, { posterImage: path, poster: path });
                                              showToast("Cover video aggiornata!", "success");
                                            }
                                          } catch (err) {
                                            showToast(err instanceof Error ? err.message : "Errore caricamento cover", "error");
                                          } finally {
                                            setIsUploading(null);
                                            e.target.value = "";
                                          }
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {(vid.posterImage || vid.poster || editingProject.posterImage) && (
                                    <div className="w-12 h-7 rounded overflow-hidden bg-black/60 border border-white/10 shrink-0">
                                      <img
                                        src={resolveMediaUrl(vid.posterImage || vid.poster || editingProject.posterImage)}
                                        alt="cover"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    value={vid.posterImage || vid.poster || ""}
                                    placeholder="es. /images/... o https://... (lascia vuoto per fallback automatico)"
                                    onChange={(e) =>
                                      handleUpdateMainVideo(vIdx, { posterImage: e.target.value, poster: e.target.value })
                                    }
                                    className="w-full bg-transparent border-b border-white/15 py-1 text-xs text-white/80 font-mono focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-widest block font-mono">
                                  URL / Percorso Video
                                </label>
                                <input
                                  type="text"
                                  value={vid.url}
                                  placeholder="/media/videos/..."
                                  onChange={(e) =>
                                    handleUpdateMainVideo(vIdx, { url: e.target.value })
                                  }
                                  className="w-full bg-transparent border-b border-white/15 py-1 text-xs text-white/80 font-mono focus:outline-none focus:border-white transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-dashed border-white/15 rounded-lg p-5 text-center text-xs font-mono text-white/40">
                    Nessun video principale aggiunto. Carica uno o più video dal computer oppure inserisci l&apos;URL qui sotto.
                  </div>
                )}

                {/* Add video manually via inputs */}
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2.5">
                  <div className="text-[11px] font-mono text-white/60 uppercase">
                    + Aggiungi video da URL o libreria
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-7">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest block font-mono mb-1">
                        URL o percorso video
                      </label>
                      <input
                        type="text"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        placeholder="https://... o /media/videos/..."
                        className="w-full bg-transparent border-b border-white/20 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/20 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest block font-mono mb-1">
                        Titolo video
                      </label>
                      <input
                        type="text"
                        value={newVideoTitle}
                        onChange={(e) => setNewVideoTitle(e.target.value)}
                        placeholder="es. Teaser Reel"
                        className="w-full bg-transparent border-b border-white/20 py-1.5 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => handleAddMainVideo()}
                        disabled={!newVideoUrl.trim()}
                        className="w-full text-center py-1.5 text-xs font-mono bg-white/10 hover:bg-white text-white hover:text-black rounded transition-colors disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white cursor-pointer"
                      >
                        [ + aggiungi ]
                      </button>
                    </div>
                  </div>

                  {/* Video library quick picker */}
                  {activeVideos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[11px] text-white/40 border-t border-white/5">
                      <span className="text-white/60">Aggiungi rapido da libreria:</span>
                      {activeVideos.map((vid) => (
                        <button
                          key={vid.path}
                          type="button"
                          onClick={() => {
                            const cleanName = vid.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                            handleAddMainVideo(vid.path, cleanName);
                          }}
                          className="text-white/70 hover:text-white hover:underline transition-colors truncate max-w-[200px] cursor-pointer"
                        >
                          + {vid.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div id="modal-section-cover" className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-white/40 block">poster image url</label>
                  <label className="text-[11px] text-white/70 hover:text-white hover:italic cursor-pointer">
                    <span>{isUploading === "proj-poster" ? <AnimatedLoadingText label="caricamento" /> : "[ + carica cover dal pc ]"}</span>
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
                            if (path) {
                              setEditingProject((prev) => (prev ? { ...prev, posterImage: path } : null));
                              showToast("Cover principale impostata!", "success");
                            }
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : "Errore caricamento cover", "error");
                          } finally {
                            setIsUploading(null);
                            e.target.value = "";
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
                  placeholder="nessun URL cover impostato"
                  onChange={(e) =>
                    setEditingProject((prev) => (prev ? { ...prev, posterImage: e.target.value } : null))
                  }
                  className="w-full bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                />

                {/* Cover Library Quick Picker */}
                {activeImages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-white/40">
                    <span className="text-white/60">scegli cover dalla libreria:</span>
                    {activeImages.slice(0, 10).map((img) => (
                      <button
                        key={img.path}
                        type="button"
                        onClick={() => {
                          setEditingProject((prev) => (prev ? { ...prev, posterImage: img.path } : null));
                          showToast(`Cover selezionata: ${img.name}`, "info");
                        }}
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
            <div id="modal-section-stills" className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-white/40 uppercase tracking-widest">
                  {"//"} stills & frames ({editingProject.stills?.length || 0})
                </div>

                <label className="text-xs font-mono text-white/80 hover:text-white hover:italic transition-colors cursor-pointer">
                  <span>{isUploading === "proj-stills" ? <AnimatedLoadingText label="caricamento foto" /> : "[ + carica foto dal pc ]"}</span>
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
                            showToast(`Caricate ${uploaded.length} foto negli stills!`, "success");
                          }
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Errore caricamento foto", "error");
                        } finally {
                          setIsUploading(null);
                          e.target.value = "";
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Grid of stills with drag-and-drop and arrow reordering */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {editingProject.stills?.map((still, sIdx) => {
                  const isFirst = sIdx === 0;
                  const isLast = sIdx === (editingProject.stills?.length || 1) - 1;
                  const isCover = editingProject.posterImage === still.url;

                  return (
                    <div
                      key={sIdx}
                      draggable
                      onDragStart={() => setDraggedStillIndex(sIdx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedStillIndex !== null && draggedStillIndex !== sIdx) {
                          handleMoveStill(draggedStillIndex, sIdx);
                          setDraggedStillIndex(null);
                        }
                      }}
                      onDragEnd={() => setDraggedStillIndex(null)}
                      className={`group relative aspect-[16/10] rounded-xl overflow-hidden bg-black border transition-all cursor-grab active:cursor-grabbing ${
                        draggedStillIndex === sIdx
                          ? "opacity-30 border-white/60 scale-95"
                          : isCover
                          ? "border-[#e0fe10]/50"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <Image
                        src={resolveMediaUrl(still.url)}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover pointer-events-none"
                      />

                      {/* Index Badge & Cover Tag */}
                      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1.5 pointer-events-none">
                        <span className="font-mono text-[10px] bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10 text-white/80">
                          [{String(sIdx + 1).padStart(2, "0")}]
                        </span>
                        {isCover && (
                          <span className="font-mono text-[9px] bg-[#e0fe10] text-black font-bold px-1.5 py-0.5 rounded">
                            COVER
                          </span>
                        )}
                      </div>

                      {/* Interactive Actions Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        {/* Top bar: Cover shortcut + Remove */}
                        <div className="flex items-center justify-between gap-1">
                          {!isCover ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProject((prev) =>
                                  prev ? { ...prev, posterImage: still.url } : null
                                );
                              }}
                              className="font-mono text-[9px] text-white/70 hover:text-white bg-black/80 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              title="Imposta come cover del progetto"
                            >
                              [ usa cover ]
                            </button>
                          ) : (
                            <div />
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                title: "Rimuovi Still",
                                message: `Rimuovere la foto [${String(sIdx + 1).padStart(2, "0")}] da questo progetto?`,
                                confirmLabel: "[ rimuovi still ]",
                                onConfirm: () => {
                                  handleRemoveStill(sIdx);
                                },
                              });
                            }}
                            className="font-mono text-[10px] text-red-400 hover:text-red-300 hover:underline bg-black/80 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title="Rimuovi foto"
                          >
                            [ rimuovi ]
                          </button>
                        </div>

                        {/* Bottom bar: Move Left / Move Right */}
                        <div className="flex items-center justify-between font-mono text-xs pt-1">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStill(sIdx, sIdx - 1);
                            }}
                            className="bg-black/90 hover:bg-white hover:text-black text-white px-2 py-0.5 rounded disabled:opacity-20 disabled:hover:bg-black/90 disabled:hover:text-white transition-colors cursor-pointer border border-white/20"
                            title="Sposta a sinistra (prima)"
                          >
                            ←
                          </button>

                          <span className="text-[9px] text-white/50 select-none hidden sm:inline">
                            trascina o frecce
                          </span>

                          <button
                            type="button"
                            disabled={isLast}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStill(sIdx, sIdx + 1);
                            }}
                            className="bg-black/90 hover:bg-white hover:text-black text-white px-2 py-0.5 rounded disabled:opacity-20 disabled:hover:bg-black/90 disabled:hover:text-white transition-colors cursor-pointer border border-white/20"
                            title="Sposta a destra (dopo)"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add still via text */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newStillUrl}
                  onChange={(e) => setNewStillUrl(e.target.value)}
                  placeholder="inserisci URL o percorso foto"
                  className="flex-1 bg-transparent border-b border-white/20 py-2 text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
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



            {/* Sticky Modal Bottom Actions */}
            <div className="sticky bottom-0 z-30 bg-[#050505]/95 backdrop-blur-md pt-4 pb-4 border-t border-white/10 flex items-center justify-between -mx-4 px-4 sm:-mx-10 sm:px-10">
              <div className="flex items-center gap-3 text-white/50 text-xs">
                <span>{editingProject.videos?.length || 0} video</span>
                <span>•</span>
                <span>{editingProject.stills?.length || 0} stills</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={handleSaveProjectModal}
                  className="px-5 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-[#e0fe10] transition-colors cursor-pointer flex items-center gap-2 shadow-xl"
                >
                  <Save className="w-4 h-4" />
                  <span>{isCreatingNew ? "Crea Progetto →" : "Salva Modifiche →"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Popup Modal */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-cinema-fade"
          onClick={() => {
            if (!isConfirming) setConfirmDialog(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c0c0e] border border-red-500/25 max-w-md w-full rounded-2xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-5 animate-cinema-blur"
          >
            {/* Header with status tag */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-red-400 uppercase tracking-widest">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>{"//"} conferma operazione</span>
              </div>
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setConfirmDialog(null)}
                className="font-mono text-xs text-white/40 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
              >
                [ ✕ ]
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-light tracking-tight text-white uppercase">
                {confirmDialog.title}
              </h3>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-light">
                {confirmDialog.message}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-colors cursor-pointer disabled:opacity-30"
              >
                [ annulla ]
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={async () => {
                  setIsConfirming(true);
                  try {
                    await confirmDialog.onConfirm();
                  } finally {
                    setIsConfirming(false);
                    setConfirmDialog(null);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(220,38,38,0.35)] cursor-pointer disabled:opacity-50"
              >
                {isConfirming ? "[ eliminazione... ]" : confirmDialog.confirmLabel || "[ conferma ]"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cinema Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[120] max-w-md animate-cinema-fade"
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl font-mono text-xs ${
              toast.type === "success"
                ? "bg-[#0b140b]/90 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50"
                : toast.type === "error"
                ? "bg-[#160b0b]/90 border-red-500/40 text-red-300 shadow-red-950/50"
                : "bg-[#111116]/90 border-white/20 text-white shadow-black/80"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toast.type === "info" && <Sparkles className="w-4 h-4 text-[#e0fe10] shrink-0" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
