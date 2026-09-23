/**
 * Utility per il calcolo e la formattazione automatica della durata dei video.
 */

/**
 * Formatta i secondi nel formato mm:ss o hh:mm:ss
 */
export function formatVideoDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Rileva automaticamente la durata di un video da un file File o da un URL.
 * Restituisce una Promise con la stringa formattata (es. "02:45").
 */
export function detectVideoDuration(source: string | File): Promise<string> {
  if (typeof window === "undefined" || !source) {
    return Promise.resolve("");
  }

  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";

      let objectUrl = "";
      if (typeof source === "string") {
        const cleanUrl = source.trim();
        if (!cleanUrl) {
          resolve("");
          return;
        }
        video.src = cleanUrl;
      } else if (source instanceof File) {
        objectUrl = URL.createObjectURL(source);
        video.src = objectUrl;
      } else {
        resolve("");
        return;
      }

      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute("src");
        video.load();
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {}
        }
      };

      video.onloadedmetadata = () => {
        const dur = video.duration;
        cleanup();
        if (dur && !isNaN(dur) && dur > 0 && isFinite(dur)) {
          resolve(formatVideoDuration(dur));
        } else {
          resolve("");
        }
      };

      video.onerror = () => {
        cleanup();
        resolve("");
      };

      // Timeout di sicurezza nel caso il video non possa essere decodificato
      setTimeout(() => {
        cleanup();
        resolve("");
      }, 7000);
    } catch {
      resolve("");
    }
  });
}
