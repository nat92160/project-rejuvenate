import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";
import CardPosterTemplate, { type CardPosterContent } from "@/components/poster/CardPosterTemplate";
import { exportPosterPng } from "@/components/poster/usePosterExport";
import HalakhicDisclaimer from "@/components/zmanim/HalakhicDisclaimer";

const ShabbatWidget = () => {
  const { city } = useCity();
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((d) => { setData(d); setLoading(false); });
  }, [city]);

  const handleExport = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 100)));
    const filename = `chabbat-${city.name.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
    await exportPosterPng(posterRef.current, filename);
    setExporting(false);
  }, [data, city]);

  const posterContent: CardPosterContent | null = data ? {
    topEmoji: "🕯️",
    badge: "HORAIRES DE CHABBAT",
    badgeColor: "#D4AF37",
    title: data.parasha || "Chabbat Chalom",
    description: `🕯️ Allumage : ${data.candleLighting || "--:--"} — ${data.candleLightingDate || ""}\n✨ Havdala : ${data.havdalah || "--:--"} — ${data.havdalahDate || ""}`,
    details: [
      { icon: "🕯️", text: `Allumage : ${data.candleLighting} • ${data.candleLightingDate}` },
      { icon: "✨", text: `Havdala : ${data.havdalah} • ${data.havdalahDate}` },
    ],
    date: city.name,
    dateEmoji: "📍",
    accentColor: "#D4AF37",
    bgColor: "#FDFAF3",
  } : null;

  return (
    <motion.div
      className="rounded-2xl bg-card p-4 sm:p-5 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold flex items-center gap-2 text-foreground">
          🕯️ Horaires de Chabbat
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {city.name}
        </span>
      </div>

      <HalakhicDisclaimer />

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-xl animate-pulse bg-muted" />
          <div className="h-16 rounded-xl animate-pulse bg-muted" />
        </div>
      ) : data ? (
        <>
          {/* Times row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl p-3 sm:p-4 text-center bg-muted/60 border border-border/60">
              <div className="text-[9px] uppercase tracking-[1.5px] mb-1 text-muted-foreground font-semibold">
                Allumage
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-display text-primary leading-tight">
                {data.candleLighting || "--:--"}
              </div>
              <div className="text-[10px] mt-1 capitalize text-muted-foreground leading-tight">
                {data.candleLightingDate}
              </div>
            </div>

            <div className="rounded-xl p-3 sm:p-4 text-center bg-muted/60 border border-border/60">
              <div className="text-[9px] uppercase tracking-[1.5px] mb-1 text-muted-foreground font-semibold">
                Havdala
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-display text-primary leading-tight">
                {data.havdalah || "--:--"}
              </div>
              <div className="text-[10px] mt-1 capitalize text-muted-foreground leading-tight">
                {data.havdalahDate}
              </div>
            </div>
          </div>

          {/* Parasha */}
          {data.parasha && (
            <div className="mt-3 p-3 rounded-xl text-center border border-primary/10"
              style={{ background: "hsl(var(--gold) / 0.04)" }}>
              <div className="text-[9px] uppercase tracking-[1.5px] mb-0.5 text-muted-foreground font-semibold">
                Paracha de la semaine
              </div>
              <div className="font-display text-base font-bold text-foreground leading-tight">
                {data.parasha}
              </div>
              {data.parashaHebrew && (
                <div className="font-hebrew text-sm mt-0.5 text-primary/70" style={{ direction: "rtl" }}>
                  {data.parashaHebrew}
                </div>
              )}
            </div>
          )}

          {/* Share button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground disabled:opacity-50 transition-all active:scale-95"
            style={{ background: "var(--gradient-gold)" }}
          >
            {exporting ? "⏳ Génération..." : "🖼️ Générer l'image de Chabbat"}
          </button>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Impossible de charger les horaires</p>
      )}

      {/* Hidden poster */}
      {posterContent && (
        <div style={{ position: "fixed", left: 0, top: 0, zIndex: -1, opacity: 0, pointerEvents: "none" }}>
          <CardPosterTemplate ref={posterRef} profile={{ name: city.name, logo_url: null, website: "chabbat-chalom.com" }} content={posterContent} />
        </div>
      )}
    </motion.div>
  );
};

export default ShabbatWidget;
