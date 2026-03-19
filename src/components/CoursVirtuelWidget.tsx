import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
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
  Lundi: "#3b82f6",
  Mardi: "#8b5cf6",
  Mercredi: "#22c55e",
  Jeudi: "#f97316",
  Vendredi: "#ef4444",
  Dimanche: "#eab308",
};

const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const CoursVirtuelWidget = () => {
  const { city } = useCity();
  const { user, dbRole } = useAuth();
  const [cours, setCours] = useState<CoursVirtuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showZoomCreator, setShowZoomCreator] = useState(false);
  const isPresident = dbRole === "president";

  // Manual form
  const [newTitle, setNewTitle] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newDay, setNewDay] = useState("Lundi");
  const [newTime, setNewTime] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Zoom creator
  const [zoomConnected, setZoomConnected] = useState<boolean | null>(null);
  const [zoomTitle, setZoomTitle] = useState("");
  const [zoomDatetime, setZoomDatetime] = useState("");
  const [zoomDuration, setZoomDuration] = useState("60");
  const [zoomPasscode, setZoomPasscode] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null);

  useEffect(() => {
    const fetchCours = async () => {
      const { data } = await supabase
        .from("cours_zoom")
        .select("*")
        .order("created_at", { ascending: false });
      setCours((data || []) as CoursVirtuel[]);
      setLoading(false);
    };
    void fetchCours();
  }, []);

  useEffect(() => {
    if (isPresident) {
      supabase.functions
        .invoke("zoom-proxy", { body: { action: "check-status" } })
        .then(({ data }) => setZoomConnected(data?.connected ?? false))
        .catch(() => setZoomConnected(false));
    }
  }, [isPresident]);

  // --- Manual add ---
  const handleAdd = async () => {
    if (!newTitle.trim() || !newLink.trim()) {
      toast.error("Titre et lien Zoom requis");
      return;
    }
    if (!user) { toast.error("Connectez-vous"); return; }
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
    if (error) toast.error("Erreur de publication");
    else if (data) {
      setCours(prev => [data as CoursVirtuel, ...prev]);
      setShowForm(false);
      setNewTitle(""); setNewTeacher(""); setNewDay("Lundi"); setNewTime(""); setNewLink(""); setNewDesc("");
      toast.success("✅ Cours publié !");
    }
    setSubmitting(false);
  };

  // --- Zoom create ---
  const createZoomMeeting = async () => {
    setCreating(true);
    setLastCreatedLink(null);
    try {
      const payload: Record<string, unknown> = {
        action: "create-meeting",
        title: zoomTitle.trim() || "Cours en direct",
        duration: parseInt(zoomDuration, 10),
      };
      if (zoomDatetime) {
        payload.start_time = zoomDatetime;
        payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
      }
      if (zoomPasscode.trim()) payload.passcode = zoomPasscode.trim();

      const { data, error } = await supabase.functions.invoke("zoom-proxy", { body: payload });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Erreur Zoom");

      const joinUrl = data.joinUrl;
      const topic = data.topic || zoomTitle.trim() || "Cours en ligne";

      // Auto-publish to cours_zoom if scheduled
      if (zoomDatetime && user) {
        const meetingDate = new Date(zoomDatetime);
        const derivedDay = dayNames[meetingDate.getDay()] || "Lundi";
        const derivedTime = zoomDatetime.split("T")[1]?.slice(0, 5) || "20:00";
        const { data: inserted } = await supabase.from("cours_zoom").insert({
          creator_id: user.id,
          title: topic,
          rav: "",
          day_of_week: derivedDay,
          course_time: derivedTime,
          zoom_link: joinUrl,
          description: "Cours programmé via Zoom",
        }).select().single();
        if (inserted) setCours(prev => [inserted as CoursVirtuel, ...prev]);
      }

      // If instant, open start URL for host
      if (!zoomDatetime && data.startUrl) {
        window.open(data.startUrl, "_blank", "noopener,noreferrer");
      }

      setLastCreatedLink(joinUrl);
      toast.success(zoomDatetime ? "✅ Cours programmé et publié !" : "✅ Réunion lancée !");
      setZoomTitle(""); setZoomDatetime(""); setZoomPasscode("");
    } catch (e: unknown) {
      toast.error("Erreur: " + (e instanceof Error ? e.message : "Inconnue"));
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce cours ?")) return;
    const { error } = await supabase.from("cours_zoom").delete().eq("id", id);
    if (error) toast.error("Erreur de suppression");
    else {
      setCours(prev => prev.filter(c => c.id !== id));
      toast.success("Cours supprimé");
    }
  };

  const getShareText = (c: CoursVirtuel) => {
    let text = `📚 *${c.title}*\n`;
    if (c.rav) text += `👨‍🏫 ${c.rav}\n`;
    text += `📅 ${c.day_of_week} à ${c.course_time?.slice(0, 5)}\n`;
    if (c.zoom_link) text += `\n🎥 Rejoindre : ${c.zoom_link}\n`;
    if (c.description) text += `\n${c.description}\n`;
    text += `\n✡️ Chabbat Chalom • ${city.name}`;
    return text;
  };

  const shareCours = async (c: CoursVirtuel) => {
    const text = getShareText(c);
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard?.writeText(text);
    toast.success("Lien copié dans le presse-papier !");
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="rounded-2xl p-4 mb-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">🎥 Cours en ligne</h3>
            <p className="text-xs text-muted-foreground mt-1">Cours via Zoom</p>
          </div>
          {isPresident && (
            <div className="flex gap-2">
              <button
                onClick={() => { setShowZoomCreator(!showZoomCreator); setShowForm(false); setLastCreatedLink(null); }}
                className="px-3 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-white"
                style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)" }}
              >
                🎥 Zoom
              </button>
              <button
                onClick={() => { setShowForm(!showForm); setShowZoomCreator(false); }}
                className="px-3 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
                style={{ background: "var(--gradient-gold)" }}
              >
                + Manuel
              </button>
            </div>
          )}
        </div>
        {isPresident && zoomConnected !== null && (
          <p className={`text-[10px] mt-2 font-bold ${zoomConnected ? "text-green-600" : "text-destructive"}`}>
            {zoomConnected ? "✅ Zoom connecté (Server-to-Server)" : "❌ Zoom non connecté — vérifiez les clés API"}
          </p>
        )}
      </div>

      {/* Zoom Creator */}
      <AnimatePresence>
        {isPresident && showZoomCreator && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ background: "#2D8CFF" }} />
              <span className="text-xs font-bold" style={{ color: "#2D8CFF" }}>Créer via Zoom API</span>
            </div>
            <div className="space-y-3">
              <input value={zoomTitle} onChange={e => setZoomTitle(e.target.value)} placeholder="Titre du cours" className={inputClass} />
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">📅 Date et heure (optionnel)</label>
                <input type="datetime-local" value={zoomDatetime} onChange={e => setZoomDatetime(e.target.value)} className={inputClass} />
                <p className="text-[10px] text-muted-foreground mt-1">Vide = lancer maintenant</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={zoomDuration} onChange={e => setZoomDuration(e.target.value)} className={inputClass}>
                  <option value="30">30 min</option>
                  <option value="60">1 heure</option>
                  <option value="90">1h30</option>
                  <option value="120">2 heures</option>
                </select>
                <input value={zoomPasscode} onChange={e => setZoomPasscode(e.target.value)} placeholder="Code (optionnel)" className={inputClass} />
              </div>
              <button onClick={createZoomMeeting} disabled={creating}
                className="w-full py-3 rounded-xl font-bold text-sm text-white border-none cursor-pointer disabled:opacity-50 transition-all"
                style={{
                  background: zoomDatetime ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #2D8CFF, #1a6fdd)",
                  boxShadow: zoomDatetime ? "0 4px 12px rgba(34,197,94,0.3)" : "0 4px 12px rgba(45,140,255,0.3)",
                }}>
                {creating ? "⏳ Création..." : zoomDatetime ? "📅 Programmer et publier" : "🎥 Lancer en direct"}
              </button>
            </div>

            {/* Created link result */}
            {lastCreatedLink && (
              <div className="mt-4 p-4 rounded-xl border border-green-500/30 bg-green-500/5">
                <p className="text-xs font-bold text-green-600 mb-2">✅ Réunion créée !</p>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={lastCreatedLink} className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs" />
                  <button onClick={() => { navigator.clipboard.writeText(lastCreatedLink); toast.success("Lien copié !"); }}
                    className="px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-white" style={{ background: "#2D8CFF" }}>
                    📋
                  </button>
                </div>
                <button onClick={() => {
                    const text = `🎥 Rejoignez le cours en direct !\n${lastCreatedLink}\n\n✡️ Chabbat Chalom`;
                    if (navigator.share) { navigator.share({ text }).catch(() => {}); }
                    else { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }
                  }}
                  className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm text-white border-none cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: "#25d366" }}>
                  💬 Partager sur WhatsApp
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-primary/20" style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre du cours" className={inputClass} />
              <input value={newTeacher} onChange={e => setNewTeacher(e.target.value)} placeholder="Nom du Rav" className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <select value={newDay} onChange={e => setNewDay(e.target.value)} className={inputClass}>
                  {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Dimanche"].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className={inputClass} />
              </div>
              <input value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="Lien Zoom (https://...)" className={inputClass} />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" rows={2} className={`${inputClass} resize-none`} />
              <button onClick={handleAdd} disabled={submitting || !newTitle.trim() || !newLink.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                style={{ background: "var(--gradient-gold)" }}>
                {submitting ? "Publication..." : "Publier le cours"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cours List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : cours.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-4xl">📚</span>
          <p className="text-sm text-muted-foreground mt-3">Aucun cours programmé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cours.map((c, i) => {
            const dotColor = dayColors[c.day_of_week] || "#94a3b8";
            const zoomHref = c.zoom_link?.startsWith("http") ? c.zoom_link : `https://${c.zoom_link}`;
            return (
              <motion.div key={c.id} className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${dotColor}15`, color: dotColor }}>
                        {c.day_of_week}
                      </span>
                      <span className="text-xs font-bold text-foreground">{c.course_time?.slice(0, 5)}</span>
                    </div>
                    <h4 className="font-display text-sm font-bold text-foreground mt-1">{c.title}</h4>
                    {c.rav && <p className="text-xs text-primary/80 font-medium mt-0.5">👨‍🏫 {c.rav}</p>}
                    {c.description && <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{c.description}</p>}
                  </div>
                  {c.zoom_link && (
                    <a href={zoomHref} target="_blank" rel="noopener noreferrer" aria-label="Rejoindre la réunion Zoom en direct"
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 no-underline transition-transform hover:scale-110 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #2D8CFF, #1a6fdd)", boxShadow: "0 4px 12px rgba(45,140,255,0.3)" }}>
                      🎥
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => shareCours(c)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer"
                    style={{ background: "#25d366", color: "#fff" }}>
                    💬 Partager
                  </button>
                  {isPresident && user?.id === c.creator_id && (
                    <button onClick={() => void handleDelete(c.id)}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border-none cursor-pointer hover:bg-destructive/20">
                      🗑️ Supprimer
                    </button>
                  )}
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
