import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────
const ZOOM_PROXY_URL = "https://chabbat-chalom-zoom.onrender.com";
const ZOOM_API_SECRET = "chabbat-chalom-zoom-2024";

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
  Lundi: "#3b82f6", Mardi: "#8b5cf6", Mercredi: "#22c55e",
  Jeudi: "#f97316", Vendredi: "#ef4444", Dimanche: "#eab308",
};

// ─── Zoom Meeting Creator ─────────────────────────────
const ZoomMeetingCreator = ({ onMeetingCreated }: { onMeetingCreated: (joinUrl: string, topic: string) => void }) => {
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [duration, setDuration] = useState("60");
  const [passcode, setPasscode] = useState("");
  const [creating, setCreating] = useState(false);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [checkingZoom, setCheckingZoom] = useState(true);
  const { user } = useAuth();

  // Check Zoom connection (via localStorage flag set after OAuth return)
  useEffect(() => {
    const connected = localStorage.getItem("zoom_connected") === "true";
    setZoomConnected(connected);
    setCheckingZoom(false);

    // Handle OAuth return
    const params = new URLSearchParams(window.location.search);
    if (params.get("zoom_connected") === "true") {
      const accessToken = params.get("zoom_access_token");
      const refreshToken = params.get("zoom_refresh_token");
      if (accessToken && refreshToken) {
        localStorage.setItem("zoom_connected", "true");
        localStorage.setItem("zoom_access_token", accessToken);
        localStorage.setItem("zoom_refresh_token", refreshToken);
        setZoomConnected(true);
        toast.success("Compte Zoom connecté !");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get("zoom_error")) {
      toast.error("Erreur connexion Zoom: " + params.get("zoom_error"));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const connectZoom = () => {
    // Redirect to Render proxy OAuth flow
    const synaId = user?.id || "default";
    window.location.href = `${ZOOM_PROXY_URL}/auth/zoom?synaId=${encodeURIComponent(synaId)}`;
  };

  const disconnectZoom = () => {
    if (!confirm("Déconnecter votre compte Zoom ?")) return;
    localStorage.removeItem("zoom_connected");
    localStorage.removeItem("zoom_access_token");
    localStorage.removeItem("zoom_refresh_token");
    setZoomConnected(false);
    toast.success("Compte Zoom déconnecté");
  };

  const createMeeting = async () => {
    const accessToken = localStorage.getItem("zoom_access_token");
    const refreshToken = localStorage.getItem("zoom_refresh_token");
    if (!accessToken) {
      toast.error("Connectez d'abord votre compte Zoom");
      return;
    }

    setCreating(true);
    const isScheduled = !!datetime;

    try {
      const payload: Record<string, unknown> = {
        title: title.trim() || "Cours en direct",
        duration: parseInt(duration),
        access_token: accessToken,
      };
      if (isScheduled) {
        payload.start_time = datetime;
        payload.timezone = "Europe/Paris";
      }
      if (passcode) payload.passcode = passcode;

      let response = await fetch(`${ZOOM_PROXY_URL}/create-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Secret": ZOOM_API_SECRET },
        body: JSON.stringify(payload),
      });
      let result = await response.json();

      // Token expired → refresh
      if (response.status === 401 && result.needRefresh && refreshToken) {
        const refreshResp = await fetch(`${ZOOM_PROXY_URL}/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Secret": ZOOM_API_SECRET },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const refreshResult = await refreshResp.json();
        if (refreshResp.ok && refreshResult.success) {
          localStorage.setItem("zoom_access_token", refreshResult.access_token);
          localStorage.setItem("zoom_refresh_token", refreshResult.refresh_token);
          payload.access_token = refreshResult.access_token;
          response = await fetch(`${ZOOM_PROXY_URL}/create-meeting`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Secret": ZOOM_API_SECRET },
            body: JSON.stringify(payload),
          });
          result = await response.json();
        } else {
          localStorage.removeItem("zoom_connected");
          localStorage.removeItem("zoom_access_token");
          localStorage.removeItem("zoom_refresh_token");
          setZoomConnected(false);
          toast.error("Session Zoom expirée. Reconnectez votre compte.");
          setCreating(false);
          return;
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erreur de création Zoom");
      }

      onMeetingCreated(result.joinUrl, result.topic || title.trim());

      if (isScheduled) {
        const dateStr = new Date(datetime).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
        toast.success(`Cours programmé pour le ${dateStr}`);
      } else {
        toast.success("Cours en direct lancé !");
        if (result.startUrl) window.open(result.startUrl, "_blank");
      }

      setTitle("");
      setDatetime("");
      setPasscode("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error("Erreur Zoom: " + msg);
    }
    setCreating(false);
  };

  if (checkingZoom) return null;

  if (!zoomConnected) {
    return (
      <div className="rounded-2xl bg-card p-6 mb-4 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">🎥</span>
        <h4 className="font-display text-sm font-bold mt-3 text-foreground">Connecter votre compte Zoom</h4>
        <p className="text-xs text-muted-foreground mt-2 mb-4">
          Connectez votre compte Zoom pour créer des cours en direct ou programmés.
        </p>
        <button onClick={connectZoom}
          className="px-6 py-3 rounded-xl font-bold text-sm text-white border-none cursor-pointer transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
          🔗 Connecter Zoom
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-5 mb-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold text-green-600">Zoom connecté</span>
        </div>
        <button onClick={disconnectZoom}
          className="text-[10px] text-destructive bg-transparent border-none cursor-pointer hover:underline">
          Déconnecter
        </button>
      </div>

      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du cours"
          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <p className="text-[10px] text-muted-foreground -mt-1">
          Laissez vide pour lancer en direct immédiatement
        </p>
        <div className="grid grid-cols-2 gap-3">
          <select value={duration} onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm">
            <option value="30">30 min</option>
            <option value="60">1 heure</option>
            <option value="90">1h30</option>
            <option value="120">2 heures</option>
          </select>
          <input value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Code (optionnel)"
            className="w-full px-3 py-3 rounded-xl bg-background border border-border text-foreground text-sm" />
        </div>
        <button onClick={createMeeting} disabled={creating}
          className="w-full py-3 rounded-xl font-bold text-sm text-white border-none cursor-pointer disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
          {creating ? "⏳ Création..." : datetime ? "📅 Programmer le cours" : "🎥 Lancer le cours en direct"}
        </button>
      </div>
    </div>
  );
};

// ─── Main Widget ──────────────────────────────────────
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
    if (!newTitle.trim() || !newLink.trim()) {
      toast.error("Veuillez remplir le titre et le lien Zoom");
      return;
    }
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }
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

    if (error) {
      toast.error("Erreur: vérifiez que vous avez le rôle Président.");
      console.error("Cours virtuel create error:", error);
    } else if (data) {
      setCours((prev) => [...prev, data as CoursVirtuel]);
      setShowForm(false);
      setNewTitle(""); setNewTeacher(""); setNewDay("Lundi"); setNewTime(""); setNewLink(""); setNewDesc("");
      toast.success("✅ Cours publié !");
    }
    setSubmitting(false);
  };

  const handleMeetingCreated = (joinUrl: string, topic: string) => {
    setNewLink(joinUrl);
    setNewTitle(topic);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce cours ?")) return;
    const { error } = await supabase.from("cours_zoom").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setCours((prev) => prev.filter((c) => c.id !== id));
      if (selectedCours?.id === id) setSelectedCours(null);
      toast.success("Cours supprimé");
    }
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
      toast.success("Image téléchargée !");
    } catch {
      toast.error("Export non disponible.");
    }
  };

  const shareCoursWhatsApp = async () => {
    const text = selectedCours
      ? `📚 ${selectedCours.title}\n👨‍🏫 ${selectedCours.rav}\n📅 ${selectedCours.day_of_week} à ${selectedCours.course_time}\n🔗 ${selectedCours.zoom_link}\n\n✡️ chabbat-chalom.com`
      : "";

    // Try Web Share API first (mobile)
    if (!posterRef.current) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      return;
    }

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

      if (blob && navigator.share && navigator.canShare?.({ files: [new File([blob], "a.png", { type: "image/png" })] })) {
        const file = new File([blob], "cours.png", { type: "image/png" });
        await navigator.share({ files: [file], title: selectedCours?.title || "Cours", text });
        return;
      }
    } catch { /* fallback */ }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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

      {/* Zoom integration (president only) */}
      {isPresident && <ZoomMeetingCreator onMeetingCreated={handleMeetingCreated} />}

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

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", background: "#EFF6FF" }}>
                      🎥
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase" }}>LIEN ZOOM</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2D8CFF", wordBreak: "break-all" as const }}>{selectedCours.zoom_link}</div>
                    </div>
                  </div>

                  {selectedCours.description && (
                    <div style={{ marginTop: "16px", padding: "14px 16px", background: "#F8FAFC", borderRadius: "12px", fontSize: "0.88rem", color: "#475569", lineHeight: 1.55, borderLeft: "3px solid #b8860b" }}>
                      {selectedCours.description}
                    </div>
                  )}
                </div>

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
