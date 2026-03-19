import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";
import { supabase } from "@/integrations/supabase/client";

type Theme = "tradition" | "moderne" | "chaud" | "prestige" | "blanc";
type FontChoice = "greatvibes" | "playfairsc" | "playfair" | "lora";

type TimeNoteKey = "candleLighting" | "minhaFri" | "kabbalat" | "arvitFri" | "shaharit" | "torahReading" | "moussaf" | "minhaSat" | "havdalah" | "arvitMotse";

type TimeNotes = Record<TimeNoteKey, string>;

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
  big?: boolean;
}

interface TimeInputRowProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  readOnly?: boolean;
}

const AfficheChabbatWidget = () => {
  const { city } = useCity();
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [theme, setTheme] = useState<Theme>("prestige");
  const [font, setFont] = useState<FontChoice>("greatvibes");
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [synaName, setSynaName] = useState("Ma Synagogue");
  const [synaAddress, setSynaAddress] = useState("");
  const [synaRav, setSynaRav] = useState("");

  const [minhaFri, setMinhaFri] = useState("");
  const [kabbalat, setKabbalat] = useState("");
  const [arvitFri, setArvitFri] = useState("");
  const [shaharit, setShaharit] = useState("08:30");
  const [moussaf, setMoussaf] = useState("");
  const [minhaSat, setMinhaSat] = useState("");
  const [arvitMotse, setArvitMotse] = useState("");
  const [timeNotes, setTimeNotes] = useState<TimeNotes>({
    candleLighting: "",
    minhaFri: "",
    kabbalat: "",
    arvitFri: "",
    shaharit: "",
    torahReading: "",
    moussaf: "",
    minhaSat: "",
    havdalah: "",
    arvitMotse: "",
  });

  const [sponsor, setSponsor] = useState("");
  const [announce, setAnnounce] = useState("");
  const [ravMessage, setRavMessage] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [city]);

  const t = themeConfig[theme];
  const f = fontConfig[font];
  const cornerBg = cornerSvg(t.ornamentColor);

  const updateNote = (key: TimeNoteKey, value: string) => {
    setTimeNotes((prev) => ({ ...prev, [key]: value }));
  };

  const generatePosterBlob = async (format: "image/jpeg" | "image/png" = "image/jpeg") => {
    if (!canvasRef.current) return null;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove("dark");
          const clonedCanvas = clonedDoc.getElementById("affiche-export-canvas") as HTMLDivElement | null;
          if (clonedCanvas) {
            clonedCanvas.style.background = t.bg;
            clonedCanvas.style.colorScheme = "light";
          }
        },
      });

      return await new Promise<Blob | null>((resolve) => {
        if (format === "image/jpeg") {
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
          return;
        }
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
    const blob = await generatePosterBlob("image/jpeg");
    if (!blob) {
      alert("Export non disponible. Faites une capture d'écran.");
      return;
    }

    downloadPosterBlob(blob, `affiche-chabbat-${city.name}.jpg`);
  };

  const openWhatsAppLink = (url: string) => {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (popup) return;
    window.location.href = url;
  };

  const uploadPosterAndGetUrl = async (blob: Blob): Promise<string | null> => {
    const extension = blob.type === "image/jpeg" ? "jpg" : "png";
    const filename = `affiche-${city.name}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("affiches").upload(filename, blob, {
      contentType: blob.type,
      upsert: true,
    });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("affiches").getPublicUrl(filename);
    return urlData?.publicUrl || null;
  };

  const shareWhatsApp = async () => {
    const blob = await generatePosterBlob("image/jpeg");
    const file = blob ? new File([blob], `affiche-chabbat-${city.name}.jpg`, { type: "image/jpeg" }) : null;
    const baseText = `🕯️ Chabbat Chalom !\n\n🏛️ ${synaName}\n⏰ Allumage : ${data?.candleLighting || ""}\n🌙 Havdala : ${data?.havdalah || ""}\n📖 Paracha : ${data?.parasha || ""}`;

    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Affiche de Chabbat", text: baseText });
      return;
    }

    let imageUrl = "";
    if (blob) {
      const url = await uploadPosterAndGetUrl(blob);
      if (url) imageUrl = url;
    }

    const text = imageUrl ? `${baseText}\n\n🖼️ Voir l'affiche : ${imageUrl}` : baseText;
    openWhatsAppLink(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const TimeLine = ({ label, value, note, big }: TimeRow) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: big ? "6px 0" : "4px 0", fontSize: big ? "1.1rem" : "0.88rem" }}>
      <span style={{ color: t.labelColor, flexShrink: 0, fontWeight: big ? 600 : 400 }}>{label}</span>
      <span style={{ fontWeight: big ? 800 : 600, color: big ? t.accent : t.valueColor, textAlign: "right", fontSize: big ? "1.3rem" : undefined }}>
        {value}
        {note && <span style={{ fontWeight: 400, fontSize: "0.78rem", color: t.labelColor, fontStyle: "italic", marginLeft: "5px" }}>{note}</span>}
      </span>
    </div>
  );

  const TimeInputRow = ({ label, value, onChange, note, onNoteChange, readOnly = false }: TimeInputRowProps) => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
        <input
          type="time"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm"
        />
        <input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Champ libre / remarque"
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm"
        />
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className="flex flex-col sm:flex-row items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border min-h-[64px]"
            style={{
              background: step === s ? "hsl(var(--gold) / 0.1)" : "transparent",
              borderColor: step === s ? "hsl(var(--gold-matte))" : "hsl(var(--border))",
              color: step === s ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
            }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: step >= s ? "hsl(var(--gold-matte))" : "hsl(var(--muted))", color: step >= s ? "#fff" : "hsl(var(--muted-foreground))" }}
            >
              {s}
            </span>
            <span className="leading-tight text-center">{s === 1 ? "Horaires" : s === 2 ? "Annonces" : "Partager"}</span>
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">🏛️ Informations</h4>
            <div className="space-y-2.5">
              <input value={synaName} onChange={(e) => setSynaName(e.target.value)} placeholder="Nom de la synagogue" className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={synaAddress} onChange={(e) => setSynaAddress(e.target.value)} placeholder="Adresse" className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={synaRav} onChange={(e) => setSynaRav(e.target.value)} placeholder="Rav de la communauté" className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">⏰ Horaires des offices</h4>
            <p className="text-xs text-muted-foreground mb-4">Chaque horaire a un champ libre pour ajouter une remarque sur l'affiche.</p>
            <div className="space-y-3">
              <TimeInputRow label="🕯️ Allumage" value={data?.candleLighting || ""} note={timeNotes.candleLighting} onNoteChange={(value) => updateNote("candleLighting", value)} readOnly />
              <TimeInputRow label="Minha Ven." value={minhaFri} onChange={setMinhaFri} note={timeNotes.minhaFri} onNoteChange={(value) => updateNote("minhaFri", value)} />
              <TimeInputRow label="Kabbalat" value={kabbalat} onChange={setKabbalat} note={timeNotes.kabbalat} onNoteChange={(value) => updateNote("kabbalat", value)} />
              <TimeInputRow label="Arvit Ven." value={arvitFri} onChange={setArvitFri} note={timeNotes.arvitFri} onNoteChange={(value) => updateNote("arvitFri", value)} />
              <hr className="border-border" />
              <TimeInputRow label="Shaharit Sam." value={shaharit} onChange={setShaharit} note={timeNotes.shaharit} onNoteChange={(value) => updateNote("shaharit", value)} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">📖 Lecture Torah</label>
                <input
                  value={timeNotes.torahReading}
                  onChange={(e) => updateNote("torahReading", e.target.value)}
                  placeholder="Remarque (affiché avec la Paracha)"
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm"
                />
              </div>
              <TimeInputRow label="Moussaf" value={moussaf} onChange={setMoussaf} note={timeNotes.moussaf} onNoteChange={(value) => updateNote("moussaf", value)} />
              <TimeInputRow label="Minha Sam." value={minhaSat} onChange={setMinhaSat} note={timeNotes.minhaSat} onNoteChange={(value) => updateNote("minhaSat", value)} />
              <hr className="border-border" />
              <TimeInputRow label="✨ Havdala" value={data?.havdalah || ""} note={timeNotes.havdalah} onNoteChange={(value) => updateNote("havdalah", value)} readOnly />
              <TimeInputRow label="Arvit Motsé" value={arvitMotse} onChange={setArvitMotse} note={timeNotes.arvitMotse} onNoteChange={(value) => updateNote("arvitMotse", value)} />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">🎨 Thème</h4>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(Object.keys(themeConfig) as Theme[]).map((key) => {
                const tc = themeConfig[key];
                return (
                  <button key={key} onClick={() => setTheme(key)} className={`rounded-xl p-2.5 text-center cursor-pointer transition-all border-2 ${theme === key ? "border-primary shadow-md" : "border-border"}`}>
                    <div className="flex rounded-lg overflow-hidden h-6 mb-1.5">
                      {tc.swatch.map((c, i) => <div key={i} style={{ background: c, flex: 1 }} />)}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">{tc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">✒️ Calligraphie</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(fontConfig) as FontChoice[]).map((key) => {
                const fc = fontConfig[key];
                return (
                  <button key={key} onClick={() => setFont(key)} className={`rounded-xl p-3 text-center cursor-pointer transition-all border-2 ${font === key ? "border-primary" : "border-border"}`}>
                    <div style={{ fontFamily: fc.family, fontSize: key === "greatvibes" ? "1.3rem" : "1.1rem", fontWeight: 700 }} className="text-foreground mb-1">
                      {fc.sample}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{fc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
            Suivant → Annonces
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">📢 Annonces (optionnel)</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">🎉 Séouda / Kiddouch offert par :</label>
                <input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="Famille Cohen pour le Bar Mitsva de..." className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">📢 Annonce communautaire :</label>
                <textarea value={announce} onChange={(e) => setAnnounce(e.target.value)} placeholder="Cours spécial ce Chabbat..." rows={2} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">💬 Message du Rav :</label>
                <textarea value={ravMessage} onChange={(e) => setRavMessage(e.target.value)} placeholder="Message inspirant..." rows={2} className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer">
              ← Retour
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)" }}>
              Aperçu →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline">
            ← Modifier
          </button>

          <div className="rounded-2xl overflow-hidden" style={{ padding: "8px", background: "hsl(var(--muted))" }}>
            <div id="affiche-export-canvas" ref={canvasRef} style={{ background: t.bg, border: `2.5px solid ${t.border}`, outline: `0.5px solid ${t.border}`, outlineOffset: "5px", borderRadius: "6px", padding: "40px 34px 28px", position: "relative", overflow: "hidden", color: t.text, boxShadow: "0 8px 40px rgba(0,0,0,0.12)", colorScheme: "light" as const }}>
              {["top:6px;left:6px", "top:6px;right:6px;transform:rotate(90deg)", "bottom:6px;left:6px;transform:rotate(270deg)", "bottom:6px;right:6px;transform:rotate(180deg)"].map((pos, i) => (
                <div key={i} style={{ position: "absolute", width: "38px", height: "38px", pointerEvents: "none", zIndex: 2, backgroundImage: cornerBg, backgroundSize: "contain", backgroundRepeat: "no-repeat", ...(Object.fromEntries(pos.split(";").map((p) => { const [k, v] = p.split(":"); return [k.trim(), v.trim()]; })) as Record<string, string>) }} />
              ))}
              <div style={{ position: "absolute", inset: "10px", border: `0.5px solid ${t.border}33`, pointerEvents: "none", zIndex: 1 }} />

              <div style={{ textAlign: "center", paddingBottom: "14px", marginBottom: "10px" }}>
                <div style={{ fontFamily: f.family, fontSize: theme === "prestige" ? "2rem" : "1.5rem", fontWeight: theme === "prestige" ? 400 : 700, color: t.valueColor, letterSpacing: "0.5px" }}>
                  {synaName || "Nom de votre synagogue"}
                </div>
                {synaAddress && <div style={{ fontSize: "0.82rem", color: t.labelColor, marginTop: "3px" }}>{synaAddress}</div>}
                {synaRav && <div style={{ fontSize: "0.82rem", color: t.labelColor, marginTop: "3px", fontStyle: "italic" }}>{synaRav}</div>}
                <div style={{ fontSize: "0.78rem", color: t.labelColor, marginTop: "3px", fontWeight: 500 }}>📍 {city.name}</div>
              </div>

              <div style={{ width: "80px", height: "1px", background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`, margin: "0 auto 12px" }} />

              <div style={{ textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: "1.45rem", color: t.accent, marginBottom: "6px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" as const }}>
                {data?.parasha || "CHABBAT CHALOM"}
              </div>
              {data?.parashaHebrew && (
                <div style={{ textAlign: "center", fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.1rem", color: `${t.text}88`, direction: "rtl" as const, marginBottom: "6px" }}>
                  {data.parashaHebrew}
                </div>
              )}

              <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: 500, color: t.labelColor, marginBottom: "16px" }}>
                {data?.candleLightingDate}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "30px", color: t.text }}>Chargement...</div>
              ) : (
                <>
                  {/* BIG allumage/havdala */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                    <div style={{ background: t.blockBg, borderRadius: "8px", padding: "16px", border: `1px solid ${t.blockBorder}`, textAlign: "center" }}>
                      <div style={{ fontSize: "0.75rem", color: t.labelColor, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>🕯️ Allumage</div>
                      <div style={{ fontSize: "2rem", fontWeight: 800, color: t.accent, lineHeight: 1.1 }}>{data?.candleLighting || "--:--"}</div>
                      {timeNotes.candleLighting && <div style={{ fontSize: "0.75rem", color: t.labelColor, fontStyle: "italic", marginTop: "4px" }}>{timeNotes.candleLighting}</div>}
                    </div>
                    <div style={{ background: t.blockBg, borderRadius: "8px", padding: "16px", border: `1px solid ${t.blockBorder}`, textAlign: "center" }}>
                      <div style={{ fontSize: "0.75rem", color: t.labelColor, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>✨ Sortie</div>
                      <div style={{ fontSize: "2rem", fontWeight: 800, color: t.accent, lineHeight: 1.1 }}>{data?.havdalah || "--:--"}</div>
                      {timeNotes.havdalah && <div style={{ fontSize: "0.75rem", color: t.labelColor, fontStyle: "italic", marginTop: "4px" }}>{timeNotes.havdalah}</div>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                    <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                      <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                        🕯️ Vendredi soir
                      </h4>
                      {minhaFri && <TimeLine label="Minha" value={minhaFri} note={timeNotes.minhaFri} />}
                      {kabbalat && <TimeLine label="Kabbalat Chabbat" value={kabbalat} note={timeNotes.kabbalat} />}
                      {arvitFri && <TimeLine label="Arvit" value={arvitFri} note={timeNotes.arvitFri} />}
                      {!minhaFri && !kabbalat && !arvitFri && <div style={{ fontSize: "0.8rem", color: t.labelColor, fontStyle: "italic" }}>—</div>}
                    </div>

                    <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                      <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                        ☀️ Chabbat matin
                      </h4>
                      {shaharit && <TimeLine label="Shaharit" value={shaharit} note={timeNotes.shaharit} />}
                      <TimeLine label="📖 Lecture Torah" value={data?.parasha || ""} note={timeNotes.torahReading} />
                      {moussaf && <TimeLine label="Moussaf" value={moussaf} note={timeNotes.moussaf} />}
                    </div>

                    <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                      <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                        📚 Après-midi
                      </h4>
                      {minhaSat && <TimeLine label="Minha" value={minhaSat} note={timeNotes.minhaSat} />}
                      {!minhaSat && <div style={{ fontSize: "0.8rem", color: t.labelColor, fontStyle: "italic" }}>—</div>}
                    </div>

                    <div style={{ background: t.blockBg, borderRadius: "8px", padding: "14px", border: `1px solid ${t.blockBorder}` }}>
                      <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: t.h4Color, marginBottom: "8px", paddingBottom: "5px", borderBottom: `1px solid ${t.blockBorder}` }}>
                        ✨ Motsé Chabbat
                      </h4>
                      {arvitMotse && <TimeLine label="Arvit" value={arvitMotse} note={timeNotes.arvitMotse} />}
                      {!arvitMotse && <div style={{ fontSize: "0.8rem", color: t.labelColor, fontStyle: "italic" }}>—</div>}
                    </div>
                  </div>
                </>
              )}

              {sponsor && (
                <div style={{ background: t.blockBg, borderLeft: `3px solid ${t.accent}`, padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: "10px" }}>
                  <h4 style={{ color: t.h4Color, fontSize: "0.92rem", marginBottom: "5px" }}>🎉 Séouda / Kiddouch</h4>
                  <p style={{ fontSize: "0.85rem", color: t.labelColor }}>{sponsor}</p>
                </div>
              )}

              {announce && (
                <div style={{ background: t.blockBg, borderLeft: `3px solid ${t.accent}`, padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: "10px" }}>
                  <h4 style={{ color: t.h4Color, fontSize: "0.92rem", marginBottom: "5px" }}>📢 Annonce</h4>
                  <p style={{ fontSize: "0.85rem", color: t.labelColor }}>{announce}</p>
                </div>
              )}

              {ravMessage && (
                <div style={{ background: t.blockBg, borderLeft: `3px solid ${t.accent}`, padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: "10px" }}>
                  <h4 style={{ color: t.h4Color, fontSize: "0.92rem", marginBottom: "5px" }}>💬 Message du Rav</h4>
                  <p style={{ fontSize: "0.85rem", color: t.labelColor }}>{ravMessage}</p>
                </div>
              )}

              <div style={{ textAlign: "center", fontSize: "0.75rem", color: t.footerColor, marginTop: "14px", paddingTop: "10px", borderTop: `1px solid ${t.blockBorder}` }}>
                {synaName} — Chabbat Chalom !
              </div>
              <div style={{ textAlign: "center", fontSize: "0.65rem", color: t.footerColor, marginTop: "6px", letterSpacing: "0.8px", textTransform: "uppercase" as const }}>
                Généré sur chabbat-chalom.com
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleExport} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
              💾 Télécharger JPG
            </button>
            <button onClick={shareWhatsApp} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white border-none cursor-pointer transition-all hover:-translate-y-0.5" style={{ background: "#25d366", boxShadow: "0 4px 12px rgba(37,211,102,0.3)" }}>
              💬 WhatsApp
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AfficheChabbatWidget;
