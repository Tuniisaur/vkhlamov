import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIDEOS_DIR = path.join(ROOT, "public", "videos");
const IMAGES_DIR = path.join(ROOT, "public", "images");

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

console.log("\n=======================================================");
console.log("  VALERIY KHLAMOV STUDIO - MEDIA OPTIMIZATION ENGINE");
console.log("=======================================================\n");

// ── 1. OPTIMIZE VIDEOS (using native macOS avconvert with FastStart) ──
console.log("▶ [1/2] Scanning & Optimizing Videos in public/videos...");

if (!fs.existsSync(VIDEOS_DIR)) {
  console.log("  [!] public/videos directory does not exist, skipping.");
} else {
  const videoFiles = fs.readdirSync(VIDEOS_DIR);
  let convertedCount = 0;

  for (const file of videoFiles) {
    if (
      file.startsWith(".") ||
      file.endsWith("-preview.mp4") ||
      file.endsWith("-1080p.mp4") ||
      file.endsWith("-web.mp4") ||
      file.endsWith("-hero.mp4")
    ) {
      continue;
    }
    const ext = path.extname(file).toLowerCase();
    if (ext !== ".mov" && ext !== ".mp4") continue;

    const sourcePath = path.join(VIDEOS_DIR, file);
    let stat;
    try {
      stat = fs.statSync(sourcePath);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;

    const baseName = path.basename(file, ext);
    const target1080 = path.join(VIDEOS_DIR, `${baseName}-1080p.mp4`);
    const target720 = path.join(VIDEOS_DIR, `${baseName}-preview.mp4`);

    console.log(`\n• Processing: ${file} (${formatBytes(stat.size)})`);

    // 1080p FastStart version
    if (!fs.existsSync(target1080)) {
      process.stdout.write("  -> Encoding 1080p Web-Ready FastStart MP4... ");
      try {
        execSync(`avconvert --source "${sourcePath}" --preset Preset1920x1080 --output "${target1080}" --replace`, {
          stdio: "ignore",
        });
        const outStat = fs.statSync(target1080);
        const saved = ((1 - outStat.size / stat.size) * 100).toFixed(0);
        console.log(`DONE! ${formatBytes(outStat.size)} (-${saved}%)`);
        convertedCount++;
      } catch (err) {
        console.log("FAILED (" + err.message + ")");
      }
    } else {
      console.log(`  -> 1080p version already exists (${formatBytes(fs.statSync(target1080).size)}).`);
    }

    // 720p FastStart preview version (ideal for hover preview cards)
    if (!fs.existsSync(target720)) {
      process.stdout.write("  -> Encoding 720p Lightweight Preview MP4... ");
      try {
        execSync(`avconvert --source "${sourcePath}" --preset Preset1280x720 --output "${target720}" --replace`, {
          stdio: "ignore",
        });
        const outStat = fs.statSync(target720);
        const saved = ((1 - outStat.size / stat.size) * 100).toFixed(0);
        console.log(`DONE! ${formatBytes(outStat.size)} (-${saved}%)`);
        convertedCount++;
      } catch (err) {
        console.log("FAILED (" + err.message + ")");
      }
    } else {
      console.log(`  -> 720p version already exists (${formatBytes(fs.statSync(target720).size)}).`);
    }
  }

  if (convertedCount === 0) {
    console.log("  ✓ All video files are already optimized with Web FastStart.");
  }
}

// ── 2. OPTIMIZE IMAGES (using native macOS sips) ──
console.log("\n▶ [2/2] Scanning & Optimizing Stills in public/images...");

if (!fs.existsSync(IMAGES_DIR)) {
  console.log("  [!] public/images directory does not exist, skipping.");
} else {
  const imageFiles = fs.readdirSync(IMAGES_DIR);
  let totalSavedBytes = 0;
  let optimizedImgCount = 0;

  for (const file of imageFiles) {
    if (file.startsWith(".")) continue;
    const ext = path.extname(file).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") continue;

    const sourcePath = path.join(IMAGES_DIR, file);
    const stat = fs.statSync(sourcePath);
    if (!stat.isFile()) continue;

    // Only compress images that are over 1 MB
    if (stat.size > 1024 * 1024) {
      const origSize = stat.size;
      try {
        // Resize max dimension to 2560px (Retina 4K display ready) and compress with 82% quality
        execSync(`sips -s formatOptions 82 -Z 2560 "${sourcePath}"`, { stdio: "ignore" });
        const newStat = fs.statSync(sourcePath);
        const saved = origSize - newStat.size;
        if (saved > 0) {
          totalSavedBytes += saved;
          optimizedImgCount++;
          console.log(`  ✓ Compressed ${file}: ${formatBytes(origSize)} -> ${formatBytes(newStat.size)}`);
        }
      } catch {}
    }
  }

  if (optimizedImgCount > 0) {
    console.log(`\n  ✓ Successfully optimized ${optimizedImgCount} images! Saved: ${formatBytes(totalSavedBytes)}`);
  } else {
    console.log("  ✓ All images are already optimal (< 1 MB).");
  }
}

console.log("\n=======================================================");
console.log("  OPTIMIZATION COMPLETE!");
console.log("  Videos have FastStart enabled (instant streaming).");
console.log("  Upload the new .mp4 files to Cloudflare R2 via /manage.");
console.log("=======================================================\n");
