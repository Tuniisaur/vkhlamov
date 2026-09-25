/**
 * Client-side utility to capture a thumbnail frame from a video file or URL.
 * Uses an off-screen HTMLVideoElement and Canvas to extract an image as a Blob or Data URL.
 */

export async function captureVideoThumbnail(
  videoSource: string | File,
  seekTimeSeconds: number = 1.0
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number } | null> {
  if (typeof window === "undefined") return null;

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
      video.remove();
    };

    // Safety timeout in case video fails to decode or load
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);

    video.onloadedmetadata = () => {
      // Seek to either seekTimeSeconds or 10% of duration, capped at duration / 2
      const targetTime = Math.min(
        Math.max(seekTimeSeconds, 0.5),
        video.duration > 2 ? video.duration * 0.15 : video.duration * 0.5
      );
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve({ blob, dataUrl, width, height });
            } else {
              resolve(null);
            }
          },
          "image/jpeg",
          0.85
        );
      } catch (err) {
        console.warn("Could not capture video thumbnail frame:", err);
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };
  });
}
