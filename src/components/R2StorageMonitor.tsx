"use client";

import React, { useState } from "react";

export interface R2StorageData {
  configured: boolean;
  bucketName: string;
  accountId: string;
  totalBytes: number;
  totalFormatted: string;
  objectCount: number;
  videosBytes: number;
  videosFormatted: string;
  videosCount: number;
  imagesBytes: number;
  imagesFormatted: string;
  imagesCount: number;
  otherBytes: number;
  otherCount: number;
  freeTierLimitBytes: number;
  freeTierFormatted: string;
  freeTierPercentUsed: number;
  freeTierRemainingBytes: number;
  freeTierRemainingFormatted: string;
  source: "cloudflare-graphql" | "r2-s3-scan" | "local";
  graphQlAvailable: boolean;
  graphQlMetrics?: {
    payloadSize: number;
    metadataSize: number;
    objectCount: number;
    uploadCount: number;
    lastDatetime?: string;
  } | null;
  lastUpdated: string;
}

interface R2StorageMonitorProps {
  storageInfo: R2StorageData | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function R2StorageMonitor({
  storageInfo,
  isRefreshing,
  onRefresh,
}: R2StorageMonitorProps) {
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  if (!storageInfo) {
    return (
      <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between font-mono text-xs text-white/50 animate-pulse">
        <span>[ caricamento statistiche spazio bucket r2... ]</span>
        <button
          onClick={onRefresh}
          className="text-white/70 hover:text-white hover:italic transition-colors"
        >
          [ ⟳ ricarica ]
        </button>
      </div>
    );
  }

  // Determine bar color based on percentage used
  const percent = Math.min(100, Math.max(0, storageInfo.freeTierPercentUsed));
  let barGradient = "from-emerald-400 via-teal-300 to-white/90";
  if (percent >= 75 && percent < 90) {
    barGradient = "from-amber-400 via-yellow-300 to-orange-400";
  } else if (percent >= 90) {
    barGradient = "from-red-500 via-rose-400 to-red-400";
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 sm:p-6 space-y-6 backdrop-blur-md shadow-2xl transition-all">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Cloudflare logo icon mark */}
          <div className="w-8 h-8 rounded-lg bg-[#F38020]/15 border border-[#F38020]/30 flex items-center justify-center text-[#F38020]">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18.3 10.1c-.2-.8-.7-1.5-1.3-2.1-.9-.8-2-1.2-3.2-1.2-1.6 0-3 .8-3.8 2.1-.4-.2-.9-.3-1.4-.3-1.8 0-3.3 1.4-3.5 3.2C3.9 12.1 3 13.2 3 14.6c0 1.6 1.3 2.9 2.9 2.9h12.5c1.9 0 3.5-1.6 3.5-3.5 0-1.8-1.4-3.3-3.1-3.5-.1-.1-.3-.2-.5-.4z" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tracking-tight text-white uppercase font-mono">
                Cloudflare R2 Bucket Storage
              </span>

              {/* Status Indicator */}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  storageInfo.configured
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    storageInfo.configured
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-amber-400"
                  }`}
                />
                {storageInfo.configured ? "ONLINE" : "LOCALE"}
              </span>

              {/* Source Tag */}
              {storageInfo.graphQlAvailable && (
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  GraphQL API
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-white/40 flex items-center gap-2 mt-0.5">
              <span>bucket: <strong className="text-white/70 font-normal">{storageInfo.bucketName}</strong></span>
              <span>•</span>
              <span>aggiornato: {storageInfo.lastUpdated}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={() => setShowConfigHelp(!showConfigHelp)}
            className="text-white/40 hover:text-white transition-colors cursor-pointer text-[11px]"
            title="Informazioni API Cloudflare"
          >
            [ ? {showConfigHelp ? "chiudi info" : "info api"} ]
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-white/80 hover:text-white hover:italic transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className={`inline-block transition-transform ${isRefreshing ? "animate-spin" : ""}`}>
              ⟳
            </span>
            <span>{isRefreshing ? "[ calcolo... ]" : "[ ricalcola spazio ]"}</span>
          </button>
        </div>
      </div>

      {/* ── Visual Storage Progress Bar (Cloudflare Free Tier 10 GB) ── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs font-mono">
          <span className="text-white/60 tracking-wider text-[11px] uppercase">
            Quota Free Tier (10 GB inclusi ogni mese)
          </span>
          <div className="text-right">
            <span className="text-white font-medium">{storageInfo.totalFormatted}</span>
            <span className="text-white/40"> / {storageInfo.freeTierFormatted}</span>
            <span className="text-white/70 ml-1.5">({storageInfo.freeTierPercentUsed}%)</span>
          </div>
        </div>

        {/* Progress track */}
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-[1px] relative">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(100, Math.max(percent, 0.8))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>{storageInfo.freeTierRemainingFormatted} gratuiti rimanenti</span>
          <span className="text-emerald-400/80">0 € costi di traffico (Zero Egress Fees)</span>
        </div>
      </div>

      {/* ── 4 Stat Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
            Spazio Totale
          </div>
          <div className="text-lg sm:text-xl font-light text-white tracking-tight">
            {storageInfo.totalFormatted}
          </div>
          <div className="text-[10px] font-mono text-white/30 truncate">
            {storageInfo.totalBytes.toLocaleString("it-IT")} byte
          </div>
        </div>

        {/* Card 2: Videos */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
            Video (.mp4/.mov)
          </div>
          <div className="text-lg sm:text-xl font-light text-white tracking-tight">
            {storageInfo.videosFormatted}
          </div>
          <div className="text-[10px] font-mono text-white/30 truncate">
            {storageInfo.videosCount} {storageInfo.videosCount === 1 ? "video" : "video"}
          </div>
        </div>

        {/* Card 3: Images */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
            Immagini (.webp/.jpg)
          </div>
          <div className="text-lg sm:text-xl font-light text-white tracking-tight">
            {storageInfo.imagesFormatted}
          </div>
          <div className="text-[10px] font-mono text-white/30 truncate">
            {storageInfo.imagesCount} {storageInfo.imagesCount === 1 ? "immagine" : "immagini"}
          </div>
        </div>

        {/* Card 4: Total Objects */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
            File nel Bucket
          </div>
          <div className="text-lg sm:text-xl font-light text-white tracking-tight">
            {storageInfo.objectCount} <span className="text-xs text-white/40 font-mono">file</span>
          </div>
          <div className="text-[10px] font-mono text-white/30 truncate">
            {storageInfo.source === "cloudflare-graphql"
              ? "dataset r2Storage"
              : "scansione real-time"}
          </div>
        </div>
      </div>

      {/* ── Optional Collapsible Info Banner ── */}
      {showConfigHelp && (
        <div className="p-4 rounded-xl border border-white/10 bg-black/40 font-mono text-xs space-y-2 text-white/70">
          <div className="text-white font-medium text-xs flex items-center justify-between">
            <span>// INTEGRAZIONE API CLOUDFLARE R2 & GRAPHQL</span>
            <button
              onClick={() => setShowConfigHelp(false)}
              className="text-white/40 hover:text-white"
            >
              [ × ]
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-white/60">
            Questo modulo interroga il bucket Cloudflare R2 per monitorare in tempo reale i file e la dimensione occupata.
          </p>
          <div className="pt-1 text-[11px] space-y-1 text-white/50">
            <div>
              • <strong>Fonte attuale:</strong>{" "}
              {storageInfo.source === "cloudflare-graphql" ? (
                <span className="text-purple-300">Cloudflare GraphQL Analytics API (r2StorageAdaptiveGroups)</span>
              ) : storageInfo.configured ? (
                <span className="text-emerald-300">Cloudflare R2 Live Object Sizing</span>
              ) : (
                <span className="text-amber-300">Directory Locale /public</span>
              )}
            </div>
            <div>
              • <strong>Abilitare GraphQL API:</strong> Per interrogare anche la GraphQL Analytics API ufficiale di Cloudflare,
              aggiungi <code className="text-white bg-white/10 px-1 py-0.5 rounded">CLOUDFLARE_API_TOKEN</code> nel tuo file{" "}
              <code className="text-white bg-white/10 px-1 py-0.5 rounded">.env.local</code> (con permesso <em>Account Analytics: Read</em>).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
