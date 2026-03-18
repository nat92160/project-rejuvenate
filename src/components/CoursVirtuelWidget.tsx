import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";

interface CoursVirtuel {
  id: string;
  title: string;
  teacher: string;
  day: string;
  time: string;
  zoomLink: string;
  description: string;
  isLive?: boolean;
  sponsor?: string;
}

const DEMO_COURS: CoursVirtuel[] = [
  { id: "1", title: "Guémara Baba Metsia", teacher: "Rav David Cohen", day: "Lundi", time: "20:30", zoomLink: "https://zoom.us/j/123456789", description: "Étude approfondie du traité Baba Metsia", isLive: false },
  { id: "2", title: "Halakha quotidienne", teacher: "Rav Yossef Lévy", day: "Mardi", time: "21:00", zoomLink: "https://zoom.us/j/987654321", description: "Les lois du Chabbat — chapitre par chapitre" },
  { id: "3", title: "Paracha de la semaine", teacher: "Rav Moché Berdugo", day: "Mercredi", time: "20:00", zoomLink: "https://zoom.us/j/456789123", description: "Commentaires et enseignements sur la Paracha", sponsor: "Offert par la famille Lévy" },
  { id: "4", title: "Moussar & Développement", teacher: "Rav Itshak Zerbib", day: "Jeudi", time: "21:30", zoomLink: "https://zoom.us/j/321654987", description: "Travail sur les Midot et le développement personnel" },
];

const dayColors: Record<string, string> = {
  "Lundi": "#3b82f6", "Mardi": "#8b5cf6", "Mercredi": "#22c55e",
  "Jeudi": "#f97316", "Vendredi": "#ef4444", "Dimanche": "#eab308",
};

const CoursVirtuelWidget = () => {
  const { city } = useCity();
  const [cours] = useState<CoursVirtuel[]>(DEMO_COURS);
  const [showForm, setShowForm] = useState(false);
  const [selectedCours, setSelectedCours] = useState<CoursVirtuel | null>(null);
  const [synaName] = useState("Ma Synagogue");
  const posterRef = useRef<HTMLDivElement>(null);

  // Form
  const [newTitle, setNewTitle] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newDay, setNewDay] = useState("Lundi");
  const [newTime, setNewTime] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleExportPoster = async () => {
    if (!posterRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `cours-${selectedCours?.title || "virtuel"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Export non disponible.");
    }
  };

  const shareCoursWhatsApp = async () => {
    const text = selectedCours
      ? `📚 ${selectedCours.title}\n👨‍🏫 ${selectedCours.teacher}\n📅 ${selectedCours.day} à ${selectedCours.time}\n🔗 ${selectedCours.zoomLink}`
      : "";
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const pendingWindow = window.open("about:blank", "_blank");

    if (!posterRef.current) {
      if (pendingWindow) pendingWindow.location.href = whatsappUrl;
      else window.open(whatsappUrl, "_blank");
      return;
    }

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true, backgroundColor: null });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          if (pendingWindow) pendingWindow.location.href = whatsappUrl;
          else window.open(whatsappUrl, "_blank");
          return;
        }

        if (navigator.share && navigator.canShare?.({ files: [new File([blob], "a.png", { type: "image/png" })] })) {
          if (pendingWindow) pendingWindow.close();
          const file = new File([blob], "cours.png", { type: "image/png" });
          await navigator.share({ files: [file], title: selectedCours?.title || "Cours", text });
        } else if (pendingWindow) {
          pendingWindow.location.href = whatsappUrl;
        } else {
          window.open(whatsappUrl, "_blank");
        }
      }, "image/png");
    } catch {
      if (pendingWindow) pendingWindow.location.href = whatsappUrl;
      else window.open(whatsappUrl, "_blank");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="rounded-2xl p-6 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              🎥 Cours Virtuels
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Cours en ligne via Zoom • Générez des affiches à partager
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
            style={{ background: "var(--gradient-gold)" }}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="space-y-3">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titre du cours"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={newTeacher} onChange={(e) => setNewTeacher(e.target.value)} placeholder="Nom du Rav"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newDay} onChange={(e) => setNewDay(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm">
                  {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Dimanche"].map(d => <option key={d}>{d}</option>)}
                </select>
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm" />
              </div>
              <input value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="Lien Zoom"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description du cours" rows={2}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <button className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer"
                style={{ background: "var(--gradient-gold)" }}>
                Publier le cours
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course poster preview (when selected) */}
      <AnimatePresence>
        {selectedCours && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <button onClick={() => setSelectedCours(null)}
              className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline mb-3">
              ← Retour à la liste
            </button>

            {/* Course poster */}
            <div className="rounded-2xl overflow-hidden mb-4" style={{ padding: "8px", background: "hsl(var(--muted))" }}>
              <div ref={posterRef} style={{ borderRadius: "18px", overflow: "hidden", background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontFamily: "'Inter', sans-serif", maxWidth: "480px", margin: "0 auto" }}>
                {/* Header gradient */}
                <div style={{ background: "linear-gradient(135deg, #1E293B, #334155)", padding: "28px 24px 22px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.85rem", opacity: 0.7, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px", color: "#fff", fontFamily: "'Frank Ruhl Libre', serif" }}>
                    {synaName}
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.25, marginBottom: "4px", color: "#fff", fontFamily: "'Frank Ruhl Libre', serif" }}>
                    {selectedCours.title}
                  </div>
                  <div style={{ fontSize: "0.95rem", opacity: 0.85, marginTop: "6px", color: "#fff" }}>
                    👨‍🏫 {selectedCours.teacher}
                  </div>
                  <div style={{
                    display: "inline-block", background: "rgba(212,175,55,0.25)", border: "1px solid rgba(212,175,55,0.5)",
                    color: "#f0d68a", padding: "4px 14px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "1px", marginTop: "12px",
                  }}>
                    Cours en ligne
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "24px" }}>
                  {[
                    { icon: "📅", label: "JOUR", value: selectedCours.day, bgColor: "#EFF6FF" },
                    { icon: "🕐", label: "HEURE", value: selectedCours.time, bgColor: "#FFF8E1" },
                    { icon: "📍", label: "LIEU", value: "Zoom — En ligne", bgColor: "#F0FDF4" },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", background: row.bgColor }}>
                        {row.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{row.label}</div>
                        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#1E293B" }}>{row.value}</div>
                      </div>
                    </div>
                  ))}

                  {/* Zoom link */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", background: "#EFF6FF" }}>
                      🎥
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase" }}>LIEN ZOOM</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2D8CFF", wordBreak: "break-all" as const }}>{selectedCours.zoomLink}</div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginTop: "16px", padding: "14px 16px", background: "#F8FAFC", borderRadius: "12px", fontSize: "0.88rem", color: "#475569", lineHeight: 1.55, borderLeft: "3px solid #b8860b" }}>
                    {selectedCours.description}
                  </div>

                  {/* Sponsor */}
                  {selectedCours.sponsor && (
                    <div style={{ marginTop: "14px", padding: "10px 16px", background: "#FFF8E1", borderRadius: "12px", fontSize: "0.85rem", color: "#92400e", textAlign: "center", fontWeight: 500 }}>
                      {selectedCours.sponsor}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ textAlign: "center", padding: "14px 24px 18px", borderTop: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{synaName} • {city.name}</div>
                  <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "0.7rem", color: "#b8860b", marginTop: "4px", letterSpacing: "1px" }}>
                    CHABBAT-CHALOM.COM
                  </div>
                </div>
              </div>
            </div>

            {/* Share buttons */}
            <div className="flex gap-3">
              <button onClick={handleExportPoster}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer"
                style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
                💾 Télécharger
              </button>
              <button onClick={shareCoursWhatsApp}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white border-none cursor-pointer"
                style={{ background: "#25d366" }}>
                💬 WhatsApp
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course list */}
      {!selectedCours && (
        <div className="space-y-3">
          {cours.map((c, i) => {
            const dotColor = dayColors[c.day] || "#94a3b8";
            return (
              <motion.div
                key={c.id}
                className="rounded-2xl bg-card p-5 border border-border hover:border-primary/20 transition-all cursor-pointer"
                style={{ boxShadow: "var(--shadow-card)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedCours(c)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{ background: `${dotColor}15`, color: dotColor }}>
                        {c.day}
                      </span>
                      <span className="text-xs font-bold text-foreground">{c.time}</span>
                      {c.isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> EN DIRECT
                        </span>
                      )}
                    </div>
                    <h4 className="font-display text-sm font-bold text-foreground mt-1">{c.title}</h4>
                    <p className="text-xs text-primary/80 font-medium mt-0.5">👨‍🏫 {c.teacher}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{c.description}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <a href={c.zoomLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
                      🎥
                    </a>
                    <span className="text-[9px] text-muted-foreground font-medium">Rejoindre</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCours(c); }}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-border bg-muted text-muted-foreground cursor-pointer hover:border-primary/20">
                    📋 Affiche
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default CoursVirtuelWidget;
