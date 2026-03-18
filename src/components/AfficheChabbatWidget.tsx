import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";
import { supabase } from "@/integrations/supabase/client";

type Theme = "tradition" | "moderne" | "chaud" | "prestige" | "blanc";
type FontChoice = "greatvibes" | "playfairsc" | "playfair" | "lora";

const themeConfig: Record<Theme, { name: string; swatch: string[]; bg: string; accent: string; text: string; border: string; blockBg: string; blockBorder: string; h4Color: string; valueColor: string; labelColor: string; footerColor: string; ornamentColor: string }> = {
  tradition: {
    name: "Tradition", swatch: ["#D4AF37", "#1a3a6b", "#fdfaf3"],
    bg: "radial-gradient(ellipse at center, #ffffff 0%, #fdfaf3 70%, #f8f0e0 100%)",
    accent: "#D4AF37", text: "#1a1a2e", border: "#D4AF37",
    blockBg: "rgba(253,248,237,0.6)", blockBorder: "rgba(212,175,55,0.2)",
    h4Color: "#8b6914", valueColor: "#1a3a6b", labelColor: "#666",
    footerColor: "#b0a080", ornamentColor: "%23D4AF37",
  },
  moderne: {
    name: "Moderne", swatch: ["#475569", "#2563eb", "#f1f5f9"],
    bg: "radial-gradient(ellipse at center, #f8f9fb 0%, #f1f5f9 70%, #e8ecf1 100%)",
    accent: "#2563eb", text: "#334155", border: "#475569",
    blockBg: "rgba(226,232,240,0.4)", blockBorder: "rgba(51,65,85,0.15)",
    h4Color: "#334155", valueColor: "#1e40af", labelColor: "#64748b",
    footerColor: "#94a3b8", ornamentColor: "%23475569",
  },
  chaud: {
    name: "Chaud", swatch: ["#92400e", "#991b1b", "#fdf5e8"],
    bg: "radial-gradient(ellipse at center, #fffbf5 0%, #fdf5e8 70%, #f5e8d0 100%)",
    accent: "#92400e", text: "#44403c", border: "#92400e",
    blockBg: "rgba(254,243,226,0.5)", blockBorder: "rgba(146,64,14,0.15)",
    h4Color: "#78350f", valueColor: "#92400e", labelColor: "#78716c",
    footerColor: "#a8a29e", ornamentColor: "%2392400e",
  },
  prestige: {
    name: "Prestige", swatch: ["#D4AF37", "#2c1810", "#fffef9"],
    bg: "radial-gradient(ellipse at center, #fffef9 0%, #fdf8ef 50%, #f8f0e0 100%)",
    accent: "#D4AF37", text: "#2c2c2c", border: "#D4AF37",
    blockBg: "#fff", blockBorder: "rgba(212,175,55,0.12)",
    h4Color: "#D4AF37", valueColor: "#1a1a2e", labelColor: "#888",
    footerColor: "#b0a080", ornamentColor: "%23D4AF37",
  },
  blanc: {
    name: "Blanc", swatch: ["#D4AF37", "#1a1a1a", "#ffffff"],
    bg: "#ffffff",
    accent: "#D4AF37", text: "#333", border: "#D4AF37",
    blockBg: "#fafafa", blockBorder: "#eee",
    h4Color: "#D4AF37", valueColor: "#1a1a1a", labelColor: "#888",
    footerColor: "#bbb", ornamentColor: "%23D4AF37",
  },
};

const fontConfig: Record<FontChoice, { name: string; sample: string; family: string }> = {
  greatvibes: { name: "Great Vibes", sample: "Chabbat Chalom", family: "'Great Vibes', cursive" },
  playfairsc: { name: "Playfair SC", sample: "CHABBAT", family: "'Playfair Display SC', serif" },
  playfair: { name: "Playfair", sample: "Chabbat", family: "'Playfair Display', serif" },
  lora: { name: "Lora", sample: "Chabbat", family: "'Lora', serif" },
};

const cornerSvg = (color: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M2 2 L14 2 L14 5 L5 5 L5 14 L2 14 Z' fill='${color}'/%3E%3Cpath d='M8 8 L16 8 L16 10 L10 10 L10 16 L8 16 Z' fill='${color}' opacity='0.4'/%3E%3C/svg%3E")`;

interface TimeRow {
  label: string;
  value: string;
  note?: string;
}

const AfficheChabbatWidget = () => {
  const { city } = useCity();
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [theme, setTheme] = useState<Theme>("tradition");
  const [font, setFont] = useState<FontChoice>("greatvibes");
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Synagogue info
  const [synaName, setSynaName] = useState("Ma Synagogue");
  const [synaAddress, setSynaAddress] = useState("");
  const [synaRav, setSynaRav] = useState("");

  // Custom times
  const [minhaFri, setMinhaFri] = useState("");
  const [kabbalat, setKabbalat] = useState("");
  const [shaharit, setShaharit] = useState("08:30");
  const [minhaSat, setMinhaSat] = useState("");
  const [arvitMotse, setArvitMotse] = useState("");

  // Announcements
  const [sponsor, setSponsor] = useState("");
  const [announce, setAnnounce] = useState("");
  const [ravMessage, setRavMessage] = useState("");

  // Step
  const [step, setStep] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((d) => { setData(d); setLoading(false); });
  }, [city]);

  const t = themeConfig[theme];
  const f = fontConfig[font];
  const cornerBg = cornerSvg(t.ornamentColor);

  const generatePosterBlob = async () => {
    if (!canvasRef.current) return null;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: null });

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      });
    } catch {
      return null;
    }
  };

  const downloadPosterBlob = (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = objectUrl;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handleExport = async () => {
    const blob = await generatePosterBlob();
    if (!blob) {
      alert("Export non disponible. Faites une capture d'écran.");
      return;
    }

    downloadPosterBlob(blob, `affiche-chabbat-${city.name}.png`);
  };

  const openWhatsAppLink = (url: string) => {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (popup) return;

    window.location.href = url;
  };

  const uploadPosterAndGetUrl = async (blob: Blob): Promise<string | null> => {
    const filename = `affiche-${city.name}-${Date.now()}.png`;
    const { error } = await supabase.storage.from("affiches").upload(filename, blob, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("affiches").getPublicUrl(filename);
    return urlData?.publicUrl || null;
  };

  const shareWhatsApp = async () => {
    const blob = await generatePosterBlob();
    const file = blob ? new File([blob], `affiche-chabbat-${city.name}.png`, { type: "image/png" }) : null;
    const baseText = `🕯️ Chabbat Chalom !\n\n🏛️ ${synaName}\n⏰ Allumage : ${data?.candleLighting || ""}\n🌙 Havdala : ${data?.havdalah || ""}\n📖 Paracha : ${data?.parasha || ""}`;

    // Mobile: native share with file
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Affiche de Chabbat", text: baseText });
      return;
    }

    // Desktop: upload image, include URL in WhatsApp message
    let imageUrl = "";
    if (blob) {
      const url = await uploadPosterAndGetUrl(blob);
      if (url) imageUrl = url;
    }

    const text = imageUrl ? `${baseText}\n\n🖼️ Voir l'affiche : ${imageUrl}` : baseText;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    openWhatsAppLink(whatsappUrl);
  };

  const TimeLine = ({ label, value, note }: TimeRow) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.88rem" }}>
      <span style={{ color: t.labelColor }}>{label}</span>
      <span style={{ fontWeight: 600, color: t.valueColor }}>
        {value}
        {note && <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "#999", fontStyle: "italic", marginLeft: "5px" }}>{note}</span>}
      </span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Stepper header */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border"
            style={{
              background: step === s ? "hsl(var(--gold) / 0.1)" : "transparent",
              borderColor: step === s ? "hsl(var(--gold-matte))" : "hsl(var(--border))",
              color: step === s ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
            }}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: step >= s ? "hsl(var(--gold-matte))" : "hsl(var(--muted))", color: step >= s ? "#fff" : "hsl(var(--muted-foreground))" }}>
              {s}
            </span>
            {s === 1 ? "Horaires" : s === 2 ? "Annonces" : "Partager"}
          </button>
        ))}
      </div>

      {/* Step 1: Times + Config */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">🏛️ Informations</h4>
            <div className="space-y-2.5">
              <input value={synaName} onChange={(e) => setSynaName(e.target.value)} placeholder="Nom de la synagogue"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={synaAddress} onChange={(e) => setSynaAddress(e.target.value)} placeholder="Adresse"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={synaRav} onChange={(e) => setSynaRav(e.target.value)} placeholder="Rav de la communauté"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">⏰ Horaires des offices</h4>
            <p className="text-xs text-muted-foreground mb-3">Allumage et Havdala sont pré-remplis. Ajoutez vos horaires d'office.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Minha Ven.</label>
                <input type="time" value={minhaFri} onChange={(e) => setMinhaFri(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Kabbalat</label>
                <input type="time" value={kabbalat} onChange={(e) => setKabbalat(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Shaharit Sam.</label>
                <input type="time" value={shaharit} onChange={(e) => setShaharit(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Minha Sam.</label>
                <input type="time" value={minhaSat} onChange={(e) => setMinhaSat(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Arvit Motsé</label>
                <input type="time" value={arvitMotse} onChange={(e) => setArvitMotse(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm" />
              </div>
            </div>
          </div>

          {/* Theme selector */}
          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">🎨 Thème</h4>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(themeConfig) as Theme[]).map((key) => {
                const tc = themeConfig[key];
                return (
                  <button key={key} onClick={() => setTheme(key)}
                    className={`rounded-xl p-2.5 text-center cursor-pointer transition-all border-2 ${theme === key ? "border-primary shadow-md" : "border-border"}`}>
                    <div className="flex rounded-lg overflow-hidden h-6 mb-1.5">
                      {tc.swatch.map((c, i) => <div key={i} style={{ background: c, flex: 1 }} />)}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">{tc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font selector */}
          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">✒️ Calligraphie</h4>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(fontConfig) as FontChoice[]).map((key) => {
                const fc = fontConfig[key];
                return (
                  <button key={key} onClick={() => setFont(key)}
                    className={`rounded-xl p-3 text-center cursor-pointer transition-all border-2 ${font === key ? "border-primary" : "border-border"}`}>
                    <div style={{ fontFamily: fc.family, fontSize: key === "greatvibes" ? "1.3rem" : "1.1rem", fontWeight: 700 }} className="text-foreground mb-1">
                      {fc.sample}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{fc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
            Suivant → Annonces
          </button>
        </div>
      )}

      {/* Step 2: Announcements */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">📢 Annonces (optionnel)</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">🎉 Séouda / Kiddouch offert par :</label>
                <input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="Famille Cohen pour le Bar Mitsva de..."
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">📢 Annonce communautaire :</label>
                <textarea value={announce} onChange={(e) => setAnnounce(e.target.value)} placeholder="Cours spécial ce Chabbat..." rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">💬 Message du Rav :</label>
                <textarea value={ravMessage} onChange={(e) => setRavMessage(e.target.value)} placeholder="Message inspirant..." rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer">
              ← Retour
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer"
              style={{ background: "var(--gradient-gold)" }}>
              Aperçu →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview + Share */}
      {step === 3 && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline">
            ← Modifier
          </button>

          {/* Poster Preview */}
          <div className="rounded-2xl overflow-hidden" style={{ padding: "8px", background: "hsl(var(--muted))" }}>
            <div
              ref={canvasRef}
              style={{
                background: t.bg,
                border: `2.5px solid ${t.border}`,
                outline: `0.5px solid ${t.border}`,
                outlineOffset: "5px",
                borderRadius: "6px",
                padding: "40px 34px 28px",
                position: "relative",
                overflow: "hidden",
                color: t.text,
                boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
              }}
            >
              {/* Corner ornaments */}
              {["top:6px;left:6px", "top:6px;right:6px;transform:rotate(90deg)", "bottom:6px;left:6px;transform:rotate(270deg)", "bottom:6px;right:6px;transform:rotate(180deg)"].map((pos, i) => (
                <div key={i} style={{
                  position: "absolute", width: "38px", height: "38px", pointerEvents: "none", zIndex: 2,
                  backgroundImage: cornerBg, backgroundSize: "contain", backgroundRepeat: "no-repeat",
                  ...(Object.fromEntries(pos.split(";").map(p => { const [k, v] = p.split(":"); return [k.trim(), v.trim()]; })) as any),
                }} />
              ))}
              {/* Inner frame */}
              <div style={{ position: "absolute", inset: "10px", border: `0.5px solid ${t.border}33`, pointerEvents: "none", zIndex: 1 }} />

              {/* Header */}
              <div style={{ textAlign: "center", paddingBottom: "14px", marginBottom: "10px" }}>
                <div style={{ fontFamily: f.family, fontSize: theme === "prestige" ? "2rem" : "1.5rem", fontWeight: theme === "prestige" ? 400 : 700, color: t.valueColor, letterSpacing: "0.5px" }}>
                  {synaName || "Nom de votre synagogue"}
                </div>
                {synaAddress && <div style={{ fontSize: "0.82rem", color: "#777", marginTop: "3px" }}>{synaAddress}</div>}
                {synaRav && <div style={{ fontSize: "0.82rem", color: "#999", marginTop: "3px", fontStyle: "italic" }}>{synaRav}</div>}
                <div style={{ fontSize: "0.78rem", color: t.labelColor, marginTop: "3px", fontWeight: 500 }}>📍 {city.name}</div>
              </div>

              {/* Divider */}
              <div style={{ width: "80px", height: "1px", background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`, margin: "0 auto 12px" }} />

              {/* Parasha */}
              <div style={{
                textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: "1.45rem",
                color: t.accent, marginBottom: "6px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const,
              }}>
                {data?.parasha || "CHABBAT CHALOM"}
              </div>
              {data?.parashaHebrew && (
                <div style={{ textAlign: "center", fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.1rem", color: `${t.text}88`, direction: "rtl" as const, marginBottom: "6px" }}>
                  {data.parashaHebrew}
                </div>
              )}

              {/* Date */}
              <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: 500, color: t.labelColor, marginBottom: "16px" }}>
                {data?.candleLightingDate}
              </div>

              {/* 4 Time blocks */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "30px", color: t.text }}>Chargement...</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  {/* Vendredi soir */}
                  <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                    <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                      🕯️ Vendredi soir
                    </h4>
                    <TimeLine label="Allumage" value={data?.candleLighting || "--:--"} />
                    {minhaFri && <TimeLine label="Minha" value={minhaFri} />}
                    {kabbalat && <TimeLine label="Kabbalat Chabbat" value={kabbalat} />}
                  </div>

                  {/* Chabbat matin */}
                  <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                    <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                      ☀️ Chabbat matin
                    </h4>
                    {shaharit && <TimeLine label="Shaharit" value={shaharit} />}
                  </div>

                  {/* Après-midi */}
                  <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                    <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                      📚 Après-midi
                    </h4>
                    {minhaSat && <TimeLine label="Minha" value={minhaSat} />}
                  </div>

                  {/* Motsé Chabbat */}
                  <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                    <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                      ✨ Motsé Chabbat
                    </h4>
                    <TimeLine label="Havdala" value={data?.havdalah || "--:--"} />
                    {arvitMotse && <TimeLine label="Arvit" value={arvitMotse} />}
                  </div>
                </div>
              )}

              {/* Sponsor */}
              {sponsor && (
                <div style={{ background: `${t.blockBg}`, borderLeft: `3px solid ${t.accent}`, padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: "10px" }}>
                  <h4 style={{ color: t.h4Color, fontSize: "0.92rem", marginBottom: "5px" }}>🎉 Séouda / Kiddouch</h4>
                  <p style={{ fontSize: "0.85rem", color: t.labelColor }}>{sponsor}</p>
                </div>
              )}

              {/* Announce */}
              {announce && (
                <div style={{ background: `${t.blockBg}`, borderLeft: `3px solid ${t.accent}`, padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: "10px" }}>
                  <h4 style={{ color: t.h4Color, fontSize: "0.92rem", marginBottom: "5px" }}>📢 Annonce</h4>
                  <p style={{ fontSize: "0.85rem", color: t.labelColor }}>{announce}</p>
                </div>
              )}

              {/* Rav message */}
              {ravMessage && (
                <div style={{ background: "#f0f4fa", borderLeft: "3px solid #1a3a6b", padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: "10px" }}>
                  <h4 style={{ color: "#1a3a6b", fontSize: "0.92rem", marginBottom: "5px" }}>💬 Message du Rav</h4>
                  <p style={{ fontSize: "0.85rem", color: "#555" }}>{ravMessage}</p>
                </div>
              )}

              {/* Footer */}
              <div style={{ textAlign: "center", fontSize: "0.75rem", color: t.footerColor, marginTop: "14px", paddingTop: "10px", borderTop: `1px solid ${t.blockBorder}` }}>
                {synaName} — Chabbat Chalom !
              </div>
              <div style={{ textAlign: "center", fontSize: "0.65rem", color: t.footerColor, marginTop: "6px", letterSpacing: "0.8px", textTransform: "uppercase" as const }}>
                Généré sur chabbat-chalom.com
              </div>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-3">
            <button onClick={handleExport}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
              💾 Télécharger
            </button>
            <button onClick={shareWhatsApp}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white border-none cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: "#25d366", boxShadow: "0 4px 12px rgba(37,211,102,0.3)" }}>
              💬 WhatsApp
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AfficheChabbatWidget;
