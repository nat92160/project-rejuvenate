import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";

type Theme = "tradition" | "moderne" | "prestige";

const themes: Record<Theme, { name: string; bg: string; accent: string; text: string; border: string; headerBg: string; bodyBg: string }> = {
  tradition: {
    name: "Tradition",
    bg: "linear-gradient(180deg, #1a237e 0%, #0d1642 100%)",
    accent: "#c9a84c",
    text: "#fff",
    border: "#c9a84c",
    headerBg: "rgba(201,168,76,0.15)",
    bodyBg: "rgba(255,255,255,0.05)",
  },
  moderne: {
    name: "Moderne",
    bg: "linear-gradient(180deg, #faf9f6 0%, #f0ebe0 100%)",
    accent: "#2563eb",
    text: "#1e293b",
    border: "#2563eb",
    headerBg: "rgba(37,99,235,0.08)",
    bodyBg: "#fff",
  },
  prestige: {
    name: "Prestige",
    bg: "linear-gradient(180deg, #0f0f0f 0%, #1a1a2e 100%)",
    accent: "#d4af37",
    text: "#f5f5f5",
    border: "#d4af37",
    headerBg: "rgba(212,175,55,0.1)",
    bodyBg: "rgba(255,255,255,0.03)",
  },
};

const AfficheChabbatWidget = () => {
  const { city } = useCity();
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [theme, setTheme] = useState<Theme>("tradition");
  const [synagogueName, setSynagogueName] = useState("Ma Synagogue");
  const [customMessage, setCustomMessage] = useState("Chabbat Chalom à toute la communauté !");
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((d) => { setData(d); setLoading(false); });
  }, [city]);

  const t = themes[theme];

  const handleExport = async () => {
    if (!canvasRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `affiche-chabbat-${city.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Export non disponible. Faites une capture d'écran de l'affiche.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Theme selector */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(themes) as Theme[]).map((key) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
              theme === key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {themes[key].name}
          </button>
        ))}
      </div>

      {/* Customization */}
      <div className="space-y-3 mb-4">
        <input
          value={synagogueName}
          onChange={(e) => setSynagogueName(e.target.value)}
          placeholder="Nom de la synagogue"
          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Message personnalisé"
          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Poster Preview */}
      <div
        ref={canvasRef}
        className="rounded-2xl overflow-hidden mb-4"
        style={{
          background: t.bg,
          border: `2px solid ${t.border}`,
          padding: "0",
        }}
      >
        {/* Header */}
        <div style={{ background: t.headerBg, padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", color: t.accent, letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700 }}>
            {synagogueName}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: t.text, marginTop: "8px", fontFamily: "'Montserrat', sans-serif" }}>
            Horaires de Chabbat
          </div>
          {data?.parasha && (
            <div style={{ fontSize: "16px", color: t.accent, marginTop: "6px", fontWeight: 600 }}>
              📖 {data.parasha}
            </div>
          )}
          {data?.parashaHebrew && (
            <div style={{ fontSize: "18px", color: `${t.text}99`, marginTop: "4px", direction: "rtl", fontFamily: "'Frank Ruhl Libre', serif" }}>
              {data.parashaHebrew}
            </div>
          )}
        </div>

        {/* Times */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: t.text }}>Chargement...</div>
        ) : data ? (
          <div style={{ padding: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{
                background: t.bodyBg,
                borderRadius: "16px",
                padding: "20px",
                textAlign: "center",
                border: `1px solid ${t.border}33`,
              }}>
                <div style={{ fontSize: "11px", color: t.accent, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
                  🕯️ Allumage
                </div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: t.text, marginTop: "8px", fontFamily: "'Montserrat', sans-serif" }}>
                  {data.candleLighting || "--:--"}
                </div>
                <div style={{ fontSize: "11px", color: `${t.text}88`, marginTop: "4px" }}>
                  {data.candleLightingDate}
                </div>
              </div>
              <div style={{
                background: t.bodyBg,
                borderRadius: "16px",
                padding: "20px",
                textAlign: "center",
                border: `1px solid ${t.border}33`,
              }}>
                <div style={{ fontSize: "11px", color: t.accent, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
                  ✨ Havdala
                </div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: t.text, marginTop: "8px", fontFamily: "'Montserrat', sans-serif" }}>
                  {data.havdalah || "--:--"}
                </div>
                <div style={{ fontSize: "11px", color: `${t.text}88`, marginTop: "4px" }}>
                  {data.havdalahDate}
                </div>
              </div>
            </div>

            {/* Custom message */}
            {customMessage && (
              <div style={{
                marginTop: "16px",
                padding: "14px",
                borderRadius: "12px",
                background: `${t.accent}15`,
                border: `1px solid ${t.accent}30`,
                textAlign: "center",
                fontSize: "13px",
                color: t.text,
                fontStyle: "italic",
              }}>
                {customMessage}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          textAlign: "center",
          fontSize: "10px",
          color: `${t.text}55`,
          borderTop: `1px solid ${t.border}20`,
        }}>
          📍 {city.name} • chabbat-chalom.com
        </div>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      >
        📥 Exporter en PNG
      </button>
    </motion.div>
  );
};

export default AfficheChabbatWidget;
