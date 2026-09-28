"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./framer-video-player.css";

interface FramerVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "custom";
  fit?: "contain" | "cover";
  cornerRadius?: number;
  progressColor?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onMuteStateChange?: (isMuted: boolean) => void;
  onAspectRatioChange?: (isVertical: boolean, ratio: number) => void;
  onReady?: () => void;
}

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const FramerVideoPlayer = React.forwardRef<HTMLVideoElement, FramerVideoPlayerProps>(
  function FramerVideoPlayer(
    {
      src,
      poster,
      autoPlay = true,
      muted = false,
      loop = true,
      aspectRatio = "custom",
      fit = "contain",
      cornerRadius = 14,
      progressColor = "#ffffff",
      className = "",
      onTimeUpdate,
      onPlayStateChange,
      onMuteStateChange,
      onAspectRatioChange,
      onReady,
    },
    forwardedRef
  ) {
  const rootRef = useRef<HTMLDivElement>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubVideoRef = useRef<HTMLVideoElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const framePreviewRef = useRef<HTMLDivElement>(null);
  const frameTimeLblRef = useRef<HTMLSpanElement>(null);
  const progressWrapRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const speedPanelRef = useRef<HTMLDivElement>(null);
  const speedBtnRef = useRef<HTMLButtonElement>(null);
  const ppFlashRef = useRef<HTMLDivElement>(null);
  const holdBadgeRef = useRef<HTMLDivElement>(null);
  const seekIndicatorRef = useRef<HTMLDivElement>(null);
  const edgeLeftRef = useRef<HTMLDivElement>(null);
  const edgeRightRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(!autoPlay ? false : true);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [showReplay, setShowReplay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [seekLabel, setSeekLabel] = useState("");
  const [seekDirection, setSeekDirection] = useState<"back" | "fwd">("back");
  const [ppIconType, setPpIconType] = useState<"play" | "pause">("play");
  const [videoAR, setVideoAR] = useState<string>("16 / 9");
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ppTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchEndRef = useRef(0);
  const lastTapTRef = useRef(0);
  const lastTapSideRef = useRef("");
  const isHoldingRef = useRef(false);
  const didHoldRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0, moved: false });
  const lastScrubTimeRef = useRef(-1);

  const resolvedSrc = resolveMediaUrl(src);
  const resolvedPoster = poster ? resolveMediaUrl(poster) : undefined;

  // Format seconds to mm:ss or hh:mm:ss
  const fmt = (s: number) => {
    if (isNaN(s) || s == null) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastRef.current) {
      toastRef.current.classList.add("show");
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        toastRef.current?.classList.remove("show");
      }, 1600);
    }
  }, []);

  const showControls = useCallback(() => {
    const root = rootRef.current;
    const pw = playerWrapRef.current;
    if (!root || !pw) return;
    const controls = root.querySelector(".controls");
    if (controls) controls.classList.add("reveal");
    pw.classList.remove("hide-cursor");
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (controls) controls.classList.remove("reveal");
      if (videoRef.current && !videoRef.current.paused) {
        pw.classList.add("hide-cursor");
      }
    }, 2600);
  }, []);

  const flashEdge = useCallback((side: "left" | "right") => {
    const el = side === "left" ? edgeLeftRef.current : edgeRightRef.current;
    if (!el) return;
    el.classList.remove("flash-in");
    void el.offsetWidth;
    el.classList.add("flash-in");
  }, []);

  const flashSeek = useCallback((dir: "back" | "fwd") => {
    setSeekDirection(dir);
    setSeekLabel(dir === "back" ? "−10s" : "+10s");
    if (seekIndicatorRef.current) {
      seekIndicatorRef.current.style.left = dir === "back" ? "22%" : "auto";
      seekIndicatorRef.current.style.right = dir === "back" ? "auto" : "22%";
      seekIndicatorRef.current.classList.add("show");
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      seekTimerRef.current = setTimeout(() => {
        seekIndicatorRef.current?.classList.remove("show");
      }, 720);
    }
  }, []);

  const flashPlayPause = useCallback((play: boolean) => {
    setPpIconType(play ? "play" : "pause");
    if (ppFlashRef.current) {
      ppFlashRef.current.classList.remove("show");
      void ppFlashRef.current.offsetWidth;
      ppFlashRef.current.classList.add("show");
      if (ppTimerRef.current) clearTimeout(ppTimerRef.current);
      ppTimerRef.current = setTimeout(() => {
        ppFlashRef.current?.classList.remove("show");
      }, 1100);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
      setShowReplay(false);
      flashPlayPause(true);
      onPlayStateChange?.(true);
    } else {
      video.pause();
      setIsPlaying(false);
      flashPlayPause(false);
      onPlayStateChange?.(false);
    }
  }, [flashPlayPause, onPlayStateChange]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    onMuteStateChange?.(nextMuted);
    showToast(nextMuted ? "Muted" : "Unmuted");
  }, [onMuteStateChange, showToast]);

  const applySpeed = useCallback(
    (s: number) => {
      const video = videoRef.current;
      if (video) video.playbackRate = s;
      setCurrentSpeed(s);
      setIsSpeedOpen(false);
      showToast(`Speed ${s}×`);
    },
    [showToast]
  );

  const toggleFullscreen = useCallback(() => {
    const pw = playerWrapRef.current as any;
    if (!pw) return;
    const doc = document as any;
    const isFS = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    if (!isFS) {
      pw.classList.add("going-fullscreen");
      setTimeout(() => {
        const req =
          pw.requestFullscreen ||
          pw.webkitRequestFullscreen ||
          pw.mozRequestFullScreen ||
          pw.msRequestFullscreen;
        if (req) {
          Promise.resolve(req.call(pw)).catch(() => {});
        }
        setTimeout(() => pw.classList.remove("going-fullscreen"), 600);
      }, 80);
    } else {
      const exit =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;
      if (exit) exit.call(doc);
    }
  }, []);

  const seekRelative = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video || !video.duration) return;
      const target = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      video.currentTime = target;
      flashSeek(seconds < 0 ? "back" : "fwd");
      flashEdge(seconds < 0 ? "left" : "right");
      showControls();
    },
    [flashSeek, flashEdge, showControls]
  );

  // Initialize offscreen video for frame preview scrubbing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const scrub = document.createElement("video");
    scrub.muted = true;
    scrub.preload = "auto";
    scrub.playsInline = true;
    scrub.crossOrigin = "anonymous";
    scrub.src = resolvedSrc;
    scrub.load();
    scrubVideoRef.current = scrub;

    const offscreen = document.createElement("canvas");
    offscreen.width = 160;
    offscreen.height = 90;
    const offCtx = offscreen.getContext("2d");

    const onSeeked = () => {
      try {
        if (!offCtx || !frameCanvasRef.current) return;
        offCtx.drawImage(scrub, 0, 0, 160, 90);
        const canvas = frameCanvasRef.current;
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(offscreen, 0, 0);
      } catch {
        framePreviewRef.current?.classList.remove("show");
      }
    };
    scrub.addEventListener("seeked", onSeeked);

    return () => {
      scrub.removeEventListener("seeked", onSeeked);
      scrub.removeAttribute("src");
      scrub.remove();
      scrubVideoRef.current = null;
    };
  }, [resolvedSrc]);

  // Scrub seek function
  const seekScrubTo = useCallback((t: number) => {
    const scrub = scrubVideoRef.current;
    if (!scrub || !scrub.src || isNaN(scrub.duration)) return;
    if (Math.abs(t - lastScrubTimeRef.current) < 0.4) return;
    lastScrubTimeRef.current = t;
    scrub.currentTime = t;
  }, []);

  // Update progress bar and time display
  const updateProgressDisplay = useCallback((t: number, d: number) => {
    if (!isDraggingRef.current && progressFillRef.current) {
      const pct = d ? (t / d) * 100 : 0;
      progressFillRef.current.style.width = `${pct}%`;
    }
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = `${fmt(t)} / ${fmt(d)}`;
    }
  }, []);

  // Video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    const d = video.duration || 0;
    updateProgressDisplay(t, d);
    onTimeUpdate?.(t, d);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w && h) {
      setVideoAR(`${w} / ${h}`);
      const isVertical = h > w;
      onAspectRatioChange?.(isVertical, w / h);
    }
    updateProgressDisplay(video.currentTime, video.duration || 0);
    onReady?.();
  };

  const handleEnded = () => {
    if (!loop) {
      setIsPlaying(false);
      setShowReplay(true);
      onPlayStateChange?.(false);
    }
  };

  // Timeline scrub pointer interaction
  const getTimelinePct = (clientX: number) => {
    const track = progressTrackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const showFrameAt = (pct: number, clientX: number) => {
    const video = videoRef.current;
    const track = progressTrackRef.current;
    const preview = framePreviewRef.current;
    const label = frameTimeLblRef.current;
    if (!video || !track || !preview || !label) return;
    const dur = video.duration || 0;
    if (!dur) return;
    const t = pct * dur;
    const trackRect = track.getBoundingClientRect();
    const relX = clientX - trackRect.left;
    const halfW = 80;
    const clamped = Math.max(halfW, Math.min(trackRect.width - halfW, relX));
    preview.style.left = `${clamped}px`;
    label.textContent = fmt(t);
    preview.classList.add("show");
    seekScrubTo(t);
  };

  const handleProgressDown = (clientX: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    progressWrapRef.current?.classList.add("dragging");
    progressFillRef.current?.classList.add("no-transition");
    const pct = getTimelinePct(clientX);
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${pct * 100}%`;
    }
    video.currentTime = pct * video.duration;
    showFrameAt(pct, clientX);
  };

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const video = videoRef.current;
      if (!video) return;
      const root = rootRef.current;
      const isHovered = root ? root.matches(":hover") : false;
      const hasFocus = root ? root.contains(document.activeElement) : false;
      if (!isFullscreen && !isHovered && !hasFocus && video.paused) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.05);
          showToast(`${Math.round(video.volume * 100)}%`);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.05);
          showToast(`${Math.round(video.volume * 100)}%`);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case ">":
        case ".": {
          const idx = speeds.indexOf(currentSpeed);
          if (idx < speeds.length - 1) applySpeed(speeds[idx + 1]);
          break;
        }
        case "<":
        case ",": {
          const idx = speeds.indexOf(currentSpeed);
          if (idx > 0) applySpeed(speeds[idx - 1]);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, seekRelative, toggleMute, toggleFullscreen, currentSpeed, applySpeed, showToast]);

  // Window mouseup / mousemove for dragging
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current && videoRef.current?.duration) {
        const pct = getTimelinePct(e.clientX);
        if (progressFillRef.current) {
          progressFillRef.current.style.width = `${pct * 100}%`;
        }
        videoRef.current.currentTime = pct * videoRef.current.duration;
        showFrameAt(pct, e.clientX);
      }
    };

    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        progressWrapRef.current?.classList.remove("dragging");
        framePreviewRef.current?.classList.remove("show");
      }
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (isHoldingRef.current) {
        isHoldingRef.current = false;
        if (videoRef.current) videoRef.current.playbackRate = currentSpeed;
        holdBadgeRef.current?.classList.remove("show");
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [currentSpeed]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const isFS = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFS);
      setIsSpeedOpen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // Sync mute state on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      setIsMuted(muted);
    }
  }, [muted]);

  const tapSide = (clientX: number) => {
    const catchEl = rootRef.current?.querySelector(".click-catch");
    if (!catchEl) return "center";
    const r = catchEl.getBoundingClientRect();
    const f = r.width ? (clientX - r.left) / r.width : 0.5;
    if (f < 0.35) return "left";
    if (f > 0.65) return "right";
    return "center";
  };

  return (
    <div
      ref={rootRef}
      className={`framer-vp select-none ${className}`}
      style={
        {
          width: "100%",
          "--radius": `${cornerRadius}px`,
          "--progress-color": progressColor,
          "--fit": fit,
          "--ar-fixed":
            aspectRatio === "16:9"
              ? "16 / 9"
              : aspectRatio === "9:16"
              ? "9 / 16"
              : aspectRatio === "1:1"
              ? "1 / 1"
              : videoAR,
        } as React.CSSProperties
      }
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        const controls = rootRef.current?.querySelector(".controls");
        controls?.classList.remove("reveal");
        playerWrapRef.current?.classList.remove("hide-cursor");
      }}
    >
      <div className="app">
        <div ref={playerWrapRef} className="player-wrap">
          {/* Main Media Container */}
          <div className="media">
            <video
              ref={(node) => {
                (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
                if (typeof forwardedRef === "function") {
                  forwardedRef(node);
                } else if (forwardedRef) {
                  (forwardedRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
                }
              }}
              className="video-el"
              src={resolvedSrc}
              poster={resolvedPoster}
              autoPlay={autoPlay}
              muted={isMuted}
              loop={loop}
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={onReady}
              onPlaying={onReady}
              onPlay={() => {
                setIsPlaying(true);
                setShowReplay(false);
                onPlayStateChange?.(true);
              }}
              onPause={() => {
                setIsPlaying(false);
                onPlayStateChange?.(false);
              }}
              onEnded={handleEnded}
            />
          </div>

          {/* Click Catch Layer for play/pause, long-press 2x, double-tap seek */}
          <div
            className="click-catch"
            onClick={() => {
              if (Date.now() - lastTouchEndRef.current < 600) return;
              if (didHoldRef.current) {
                didHoldRef.current = false;
                return;
              }
              togglePlay();
            }}
            onMouseDown={(e) => {
              if (Date.now() - lastTouchEndRef.current < 600) return;
              e.stopPropagation();
              didHoldRef.current = false;
              holdTimerRef.current = setTimeout(() => {
                didHoldRef.current = true;
                isHoldingRef.current = true;
                if (videoRef.current) videoRef.current.playbackRate = 2;
                holdBadgeRef.current?.classList.add("show");
              }, 400);
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStartRef.current = { x: t.clientX, y: t.clientY, moved: false };
              didHoldRef.current = false;
              holdTimerRef.current = setTimeout(() => {
                didHoldRef.current = true;
                isHoldingRef.current = true;
                if (videoRef.current) videoRef.current.playbackRate = 2;
                holdBadgeRef.current?.classList.add("show");
              }, 400);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (
                Math.abs(t.clientX - touchStartRef.current.x) > 12 ||
                Math.abs(t.clientY - touchStartRef.current.y) > 12
              ) {
                touchStartRef.current.moved = true;
                if (holdTimerRef.current) {
                  clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = null;
                }
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              lastTouchEndRef.current = Date.now();
              if (holdTimerRef.current) {
                clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
              }
              if (isHoldingRef.current) {
                isHoldingRef.current = false;
                if (videoRef.current) videoRef.current.playbackRate = currentSpeed;
                holdBadgeRef.current?.classList.remove("show");
                didHoldRef.current = false;
                return;
              }
              didHoldRef.current = false;
              if (touchStartRef.current.moved) return;

              // Always reveal controls on tap (mobile has no hover/mousemove)
              showControls();

              const touch = e.changedTouches[0];
              const side = tapSide(touch.clientX);
              const now = Date.now();
              const isDouble =
                now - lastTapTRef.current < 300 &&
                side === lastTapSideRef.current &&
                side !== "center";

              if (isDouble) {
                if (singleTapTimerRef.current) {
                  clearTimeout(singleTapTimerRef.current);
                  singleTapTimerRef.current = null;
                }
                seekRelative(side === "left" ? -10 : 10);
                lastTapTRef.current = now;
                lastTapSideRef.current = side;
                return;
              }

              lastTapTRef.current = now;
              lastTapSideRef.current = side;

              // On first tap: only show controls; on second tap: act
              const controlsEl = rootRef.current?.querySelector(".controls");
              const controlsWereHidden = !controlsEl?.classList.contains("reveal");
              if (controlsWereHidden) {
                // Controls are now revealed — don't act yet
                return;
              }

              if (side === "center") {
                if (singleTapTimerRef.current) {
                  clearTimeout(singleTapTimerRef.current);
                  singleTapTimerRef.current = null;
                }
                togglePlay();
              } else {
                if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = setTimeout(() => {
                  singleTapTimerRef.current = null;
                  togglePlay();
                }, 300);
              }
            }}
          />

          {/* Edge Glare Flash on Seek */}
          <div ref={edgeLeftRef} className="edge-flash edge-left" />
          <div ref={edgeRightRef} className="edge-flash edge-right" />

          {/* Center Play/Pause Glass Flash */}
          <div ref={ppFlashRef} className="playpause-flash">
            {ppIconType === "play" ? (
              <svg className="pp-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M8 5.6v12.8l10.5-6.4z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg className="pp-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="7" y="5.5" width="3.6" height="13" rx="1.8" fill="currentColor" />
                <rect x="13.4" y="5.5" width="3.6" height="13" rx="1.8" fill="currentColor" />
              </svg>
            )}
          </div>

          {/* Replay Button (When ended and not looped) */}
          {showReplay && (
            <button
              className="replay-btn show"
              title="Replay"
              onClick={(e) => {
                e.stopPropagation();
                setShowReplay(false);
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                  setIsPlaying(true);
                  onPlayStateChange?.(true);
                }
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}

          {/* Long Press 2x Speed Pill Badge */}
          <div ref={holdBadgeRef} className="hold-badge">
            2× Speed
          </div>

          {/* -10s / +10s Indicator */}
          <div ref={seekIndicatorRef} className="seek-indicator">
            <svg
              className="seek-icon"
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="white"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {seekDirection === "back" ? (
                <polyline points="10,4 6,8 10,12" />
              ) : (
                <polyline points="6,4 10,8 6,12" />
              )}
            </svg>
            <span className="seek-label font-mono">{seekLabel}</span>
          </div>

          {/* Playback Speed Glass Popover Menu */}
          <div
            ref={speedPanelRef}
            className={`speed-panel ${isSpeedOpen ? "visible" : "hidden"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {speeds.map((s) => (
              <div
                key={s}
                className={`speed-opt ${currentSpeed === s ? "active" : ""}`}
                onClick={() => applySpeed(s)}
              >
                {s}×
              </div>
            ))}
          </div>

          {/* Bottom Luxury Cinema Overlay Controls */}
          <div className="controls">
            {/* Smooth Glass Scrubbing Timeline */}
            <div
              ref={progressWrapRef}
              className="progress-wrap"
              onMouseEnter={() => framePreviewRef.current?.classList.add("show")}
              onMouseLeave={() => {
                if (!isDraggingRef.current) {
                  framePreviewRef.current?.classList.remove("show");
                }
              }}
              onMouseMove={(e) => {
                const pct = getTimelinePct(e.clientX);
                if (isDraggingRef.current && videoRef.current?.duration) {
                  if (progressFillRef.current) {
                    progressFillRef.current.style.width = `${pct * 100}%`;
                  }
                  videoRef.current.currentTime = pct * videoRef.current.duration;
                }
                showFrameAt(pct, e.clientX);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleProgressDown(e.clientX);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleProgressDown(e.touches[0].clientX);
              }}
              onTouchMove={(e) => {
                if (!isDraggingRef.current || !videoRef.current?.duration) return;
                const pct = getTimelinePct(e.touches[0].clientX);
                if (progressFillRef.current) {
                  progressFillRef.current.style.width = `${pct * 100}%`;
                }
                videoRef.current.currentTime = pct * videoRef.current.duration;
              }}
              onTouchEnd={() => {
                isDraggingRef.current = false;
                setIsDragging(false);
                progressWrapRef.current?.classList.remove("dragging");
                framePreviewRef.current?.classList.remove("show");
              }}
            >
              <div ref={progressTrackRef} className="progress-track">
                <div ref={progressFillRef} className="progress-fill">
                  <div className="progress-thumb" />
                </div>
              </div>

              {/* Real-time Video Frame Scrub Thumbnail Preview */}
              <div ref={framePreviewRef} className="frame-preview">
                <div className="frame-canvas-wrap">
                  <canvas ref={frameCanvasRef} className="frame-canvas" />
                </div>
                <span ref={frameTimeLblRef} className="frame-time-label font-mono">
                  0:00
                </span>
              </div>
            </div>

            {/* Bottom Controls Row: Timecode, Mute, Speed, Fullscreen */}
            <div className="ctrl-row">
              <span ref={timeDisplayRef} className="time-display font-mono">
                0:00 / 0:00
              </span>

              {/* Sound Toggle Button */}
              <button
                type="button"
                className="ctrl-btn mute-btn"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  {isMuted ? (
                    <>
                      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                      <path
                        d="M16 9.5l5 5M21 9.5l-5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                      <path
                        d="M16.5 8.5a4 4 0 010 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </svg>
              </button>

              {/* Speed Button */}
              <button
                ref={speedBtnRef}
                type="button"
                className="ctrl-btn speed-btn font-mono"
                title="Playback speed (> / <)"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSpeedOpen((prev) => !prev);
                }}
              >
                {currentSpeed}×
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                className="ctrl-btn fullscreen-btn"
                title="Fullscreen (F)"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
              >
                <svg
                  className="fs-icon"
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                >
                  {isFullscreen ? (
                    <path d="M4.5 1H1.5v3M9.5 1h3v3M12 8.5v3h-3M4.5 12H1.5v-3" />
                  ) : (
                    <path d="M1 4.5V1.5h3M9 1.5h3v3M12 8.5v3h-3M4 11.5H1v-3" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Toast Feedback */}
          <div ref={toastRef} className="toast font-mono">
            {toastMsg}
          </div>
        </div>
      </div>
    </div>
  );
});

export default FramerVideoPlayer;
