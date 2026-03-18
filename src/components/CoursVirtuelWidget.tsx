import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CoursVirtuel {
  id: string;
  title: string;
  rav: string;
  day_of_week: string;
  course_time: string;
  zoom_link: string;
  description: string;
  creator_id: string;
}

const dayColors: Record<string, string> = {
  "Lundi": "#3b82f6", "Mardi": "#8b5cf6", "Mercredi": "#22c55e",
  "Jeudi": "#f97316", "Vendredi": "#ef4444", "Dimanche": "#eab308",
};

const CoursVirtuelWidget = () => {
  const { city } = useCity();
  const { user, dbRole } = useAuth();
  const [cours, setCours] = useState<CoursVirtuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCours, setSelectedCours] = useState<CoursVirtuel | null>(null);
  const [synaName] = useState("Ma Synagogue");
  const posterRef = useRef<HTMLDivElement>(null);
  const isPresident = dbRole === "president";

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newDay, setNewDay] = useState("Lundi");
  const [newTime, setNewTime] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCours = async () => {
      const { data } = await supabase
        .from("cours_zoom")
        .select("*")
        .order("created_at");
      setCours((data || []) as CoursVirtuel[]);
      setLoading(false);
    };
    fetchCours();
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newLink.trim() || !user) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("cours_zoom").insert({
      creator_id: user.id,
      title: newTitle.trim(),
      rav: newTeacher.trim(),
      day_of_week: newDay,
      course_time: newTime || "20:00",
      zoom_link: newLink.trim(),
      description: newDesc.trim(),
    }).select().single();

    if (data && !error) {
      setCours((prev) => [...prev, data as CoursVirtuel]);
      setShowForm(false);
      setNewTitle("");
      setNewTeacher("");
      setNewDay("Lundi");
      setNewTime("");
      setNewLink("");
      setNewDesc("");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cours_zoom").delete().eq("id", id);
    setCours((prev) => prev.filter((c) => c.id !== id));
    if (selectedCours?.id === id) setSelectedCours(null);
  };

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
      ? `📚 ${selectedCours.title}\n👨‍🏫 ${selectedCours.rav}\n📅 ${selectedCours.day_of_week} à ${selectedCours.course_time}\n🔗 ${selectedCours.zoom_link}`
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
          {isPresident && (
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
              style={{ background: "var(--gradient-gold)" }}>
              + Ajouter
            </button>
          )}
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
              <button onClick={handleAdd} disabled={submitting || !newTitle.trim() || !newLink.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {submitting ? "Publication..." : "Publier le cours"}
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
                    👨‍🏫 {selectedCours.rav}
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
                    { icon: "📅", label: "JOUR", value: selectedCours.day_of_week, bgColor: "#EFF6FF" },
                    { icon: "🕐", label: "HEURE", value: selectedCours.course_time?.slice(0, 5), bgColor: "#FFF8E1" },
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
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2D8CFF", wordBreak: "break-all" as const }}>{selectedCours.zoom_link}</div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginTop: "16px", padding: "14px 16px", background: "#F8FAFC", borderRadius: "12px", fontSize: "0.88rem", color: "#475569", lineHeight: 1.55, borderLeft: "3px solid #b8860b" }}>
                    {selectedCours.description}
                  </div>
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
        loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
        ) : cours.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-sm text-muted-foreground">Aucun cours virtuel programmé.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cours.map((c, i) => {
              const dotColor = dayColors[c.day_of_week] || "#94a3b8";
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
                          {c.day_of_week}
                        </span>
                        <span className="text-xs font-bold text-foreground">{c.course_time?.slice(0, 5)}</span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-foreground mt-1">{c.title}</h4>
                      <p className="text-xs text-primary/80 font-medium mt-0.5">👨‍🏫 {c.rav}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{c.description}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      {c.zoom_link && (
                        <a href={c.zoom_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 no-underline"
                          style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
                          🎥
                        </a>
                      )}
                      <span className="text-[9px] text-muted-foreground font-medium">Rejoindre</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedCours(c); }}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-border bg-muted text-muted-foreground cursor-pointer hover:border-primary/20">
                      📋 Affiche
                    </button>
                    {isPresident && user?.id === c.creator_id && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer hover:bg-destructive/20">
                        🗑️ Supprimer
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </motion.div>
  );
};

export default CoursVirtuelWidget;
