import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Simple .env.local parser
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const f of envFiles) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const accountId = (process.env.R2_ACCOUNT_ID || "").replace(/https?:\/\//, "").replace(/\.r2\.cloudflarestorage\.com.*$/, "").trim();
const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const bucketName = (process.env.R2_BUCKET_NAME || "").trim();
const publicBase = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

console.log("\n=======================================================");
console.log("  VALERIY KHLAMOV STUDIO - CLOUDFLARE R2 SYNC ENGINE");
console.log("=======================================================\n");

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.log("❌ CREDENZIALI R2 MANCANTI NEL FILE .env.local\n");
  console.log("Per sincronizzare automaticamente i media nel Cloudflare R2,");
  console.log("copia le stesse variabili che hai impostato su Vercel nel file .env.local:\n");
  console.log("R2_ACCOUNT_ID=tuo_account_id");
  console.log("R2_ACCESS_KEY_ID=tuo_access_key");
  console.log("R2_SECRET_ACCESS_KEY=tuo_secret_key");
  console.log("R2_BUCKET_NAME=nome_del_tuo_bucket");
  console.log("R2_PUBLIC_URL=https://pub-xxxxxx.r2.dev\n");
  console.log("Poi rilancia: npm run upload-to-cloud\n");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function uploadFile(localPath, r2Key, contentType) {
  const fileBuffer = fs.readFileSync(localPath);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  await s3.send(command);
}

async function main() {
  console.log(`📡 Connessione al bucket Cloudflare R2: [${bucketName}]`);

  // 1. Upload Video MP4 Ottimizzati
  const videosDir = path.join(ROOT, "public", "videos");
  const targetVideos = [
    "portfolio-wec-8155.mp4",
    "portfolio-wec-preview.mp4",
    "sfondo-portfolio-hero.mp4",
  ];

  console.log("\n▶ [1/3] Upload Video Ottimizzati nel Cloud R2...");
  for (const vName of targetVideos) {
    const vPath = path.join(videosDir, vName);
    if (fs.existsSync(vPath)) {
      const stat = fs.statSync(vPath);
      process.stdout.write(`  -> Caricamento ${vName} (${(stat.size / 1024 / 1024).toFixed(1)} MB)... `);
      try {
        await uploadFile(vPath, `videos/${vName}`, "video/mp4");
        console.log("✓ OK!");
      } catch (err) {
        console.log("❌ Errore:", err.message);
      }
    }
  }

  // 2. Upload Immagini Stills Ottimizzate
  console.log("\n▶ [2/3] Upload Immagini Stills Ottimizzate...");
  const imagesDir = path.join(ROOT, "public", "images");
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"));
    let count = 0;
    for (const f of files) {
      const fPath = path.join(imagesDir, f);
      const isPng = f.endsWith(".png");
      try {
        await uploadFile(fPath, `images/${f}`, isPng ? "image/png" : "image/jpeg");
        count++;
        if (count % 5 === 0 || count === files.length) {
          console.log(`  -> Caricate ${count}/${files.length} immagini...`);
        }
      } catch (err) {
        console.warn(`  [!] Fallito upload per ${f}:`, err.message);
      }
    }
    console.log(`  ✓ Tutte le ${count} immagini caricate sul Cloud!`);
  }

  // 3. Upload site-content.json aggiornato
  console.log("\n▶ [3/3] Sincronizzazione configurazione site-content.json...");
  const contentPath = path.join(ROOT, "src", "data", "site-content.json");
  if (fs.existsSync(contentPath)) {
    try {
      await uploadFile(contentPath, "site-content.json", "application/json");
      console.log("  ✓ site-content.json aggiornato nel bucket R2!");
    } catch (err) {
      console.warn("  [!] Impossibile aggiornare site-content.json su R2:", err.message);
    }
  }

  console.log("\n=======================================================");
  console.log("  SINCRONIZZAZIONE COMPLETATA CON SUCCESSO! 🎉");
  if (publicBase) {
    console.log(`  I tuoi media ora sono distribuiti via CDN: ${publicBase}`);
  }
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Errore durante la sincronizzazione:", err);
  process.exit(1);
});
