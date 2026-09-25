/**
 * Client-side utility to capture an optimal thumbnail frame from a video file or URL.
 * Uses an off-screen HTMLVideoElement and Canvas to extract a vivid, non-black frame
 * by analyzing frame luminance across intelligent candidate timestamps.
 */

// Global in-memory cache to prevent redundant frame extractions across components
const thumbnailCache = new Map<string, { blob: Blob; dataUrl: string; width: number; height: number }>();

/**
 * Returns a cached thumbnail dataUrl or null if not yet extracted.
 */
export function getCachedVideoThumbnail(videoUrl: string): string | null {
  return thumbnailCache.get(videoUrl)?.dataUrl || null;
}

/**
 * Calculates the average perceived luminance (0-255) of a canvas context.
 */
function calculateCanvasLuminance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  try {
    const sampleW = Math.min(width, 160);
    const sampleH = Math.min(height, 90);
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) return 100;

    sampleCtx.drawImage(ctx.canvas, 0, 0, sampleW, sampleH);
    const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;
    let sum = 0;
    const step = 16; // sample every 4th pixel
    let count = 0;

    for (let i = 0; i < imgData.length; i += step) {
      // Rec. 601 perceived luminance formula: 0.299 R + 0.587 G + 0.114 B
      sum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      count++;
    }

    return count > 0 ? sum / count : 0;
  } catch {
    return 100;
  }
}

export async function captureVideoThumbnail(
  videoSource: string | File,
  preferredSeekSeconds: number = 2.0
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number } | null> {
  if (typeof window === "undefined") return null;

  // Check in-memory cache if string URL
  const cacheKey = typeof videoSource === "string" ? videoSource.trim() : null;
  if (cacheKey && thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let objectUrl = "";
    if (typeof videoSource === "string") {
      video.src = videoSource;
    } else if (videoSource) {
      objectUrl = URL.createObjectURL(videoSource);
      video.src = objectUrl;
    }

    let hasCleanedUp = false;
    const cleanup = () => {
      if (hasCleanedUp) return;
      hasCleanedUp = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      video.removeAttribute("src");
      video.load();
      video.remove();
    };

    // Safety timeout in case video fails to decode or load
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 12000);

    let candidateTimes: number[] = [];
    let currentCandidateIndex = 0;
    let bestResult: { blob: Blob; dataUrl: string; width: number; height: number; luminance: number } | null = null;

    video.onloadedmetadata = () => {
      const dur = video.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 10;

      // Build intelligent candidate timestamps:
      // 1. Preferred seek time (e.g. 2s or 20% into the film to skip black intro fades)
      // 2. 15% of duration
      // 3. 35% of duration (peak action)
      // 4. 50% of duration
      // 5. 1.0s fallback
      const candidates = new Set<number>();
      
      const primary = Math.min(Math.max(preferredSeekSeconds, 1.2), dur > 2.5 ? dur * 0.25 : dur * 0.5);
      candidates.add(parseFloat(primary.toFixed(2)));

      if (dur > 4) {
        candidates.add(parseFloat((dur * 0.15).toFixed(2)));
        candidates.add(parseFloat((dur * 0.35).toFixed(2)));
        candidates.add(parseFloat((dur * 0.55).toFixed(2)));
      }
      candidates.add(1.0);

      candidateTimes = Array.from(candidates).filter((t) => t > 0 && t < dur);
      if (candidateTimes.length === 0) candidateTimes = [0.5];

      currentCandidateIndex = 0;
      video.currentTime = candidateTimes[0];
    };

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const luminance = calculateCanvasLuminance(ctx, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
              const result = { blob, dataUrl, width, height, luminance };

              if (!bestResult || luminance > bestResult.luminance) {
                bestResult = result;
              }

              // If frame is luminous (> 18 on 0-255 scale, not pitch black) or we tried all candidates
              const isSatisfactory = luminance >= 18;
              const hasMoreCandidates = currentCandidateIndex + 1 < candidateTimes.length;

              if (isSatisfactory || !hasMoreCandidates) {
                clearTimeout(timeout);
                cleanup();
                const finalRes = bestResult || result;
                if (cacheKey && finalRes) {
                  thumbnailCache.set(cacheKey, finalRes);
                }
                resolve(finalRes);
              } else {
                // Seek to next candidate to find a brighter, more vivid frame
                currentCandidateIndex++;
                video.currentTime = candidateTimes[currentCandidateIndex];
              }
            } else {
              // Try next candidate if blob generation failed
              if (currentCandidateIndex + 1 < candidateTimes.length) {
                currentCandidateIndex++;
                video.currentTime = candidateTimes[currentCandidateIndex];
              } else {
                clearTimeout(timeout);
                cleanup();
                resolve(bestResult);
              }
            }
          },
          "image/jpeg",
          0.88
        );
      } catch (err) {
        console.warn("Could not capture video thumbnail frame:", err);
        clearTimeout(timeout);
        cleanup();
        resolve(bestResult);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(bestResult);
    };
  });
}
