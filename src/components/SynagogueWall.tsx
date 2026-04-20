import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * SynagogueWall — "Tableau d'affichage" manuscrit pour les fidèles.
 * Affiche les horaires, annonces, cours et événements d'une synagogue
 * abonnée, dans une esthétique papier kraft / post-its épinglés.
 */

interface SynaSummary {
  id: string;
  name: string;
  shacharit_time: string | null;
  shacharit_time_2: string | null;
  minha_time: string | null;
  minha_time_2: string | null;
  arvit_time: string | null;
  arvit_time_2: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

interface AnnonceRow {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

interface CoursRow {
  id: string;
  title: string;
  rav: string;
  day_of_week: string;
  course_time: string;
  description: string;
  course_type: string;
  zoom_link: string;
  address: string | null;
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  event_type: string;
}

/* — palette des post-its (couleurs pastel sur papier kraft) — */
const NOTE_COLORS = [
  { bg: "#FFF6A8", tape: "#E8D26A" }, // jaune
  { bg: "#FFD6E0", tape: "#E89AAA" }, // rose
  { bg: "#CFE8FF", tape: "#7FB6E0" }, // bleu
  { bg: "#D8F0C8", tape: "#8BC07A" }, // vert
  { bg: "#FFE3C2", tape: "#E8B070" }, // orange doux
];

const TILTS = ["-2deg", "1.5deg", "-1deg", "2deg", "-1.5deg"];

const formatTime = (t?: string | null) => (t ? t.slice(0, 5) : "—");

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `il y a ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const Pin = ({ color = "#C53030" }: { color?: string }) => (
  <span
    aria-hidden
    className="absolute -top-2 left-1/2 -translate-x-1/2 z-10"
    style={{
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: `radial-gradient(circle at 30% 30%, ${color}, #5a0a0a 80%)`,
      boxShadow: "0 2px 3px rgba(0,0,0,0.35)",
    }}
  />
);

const PaperCard = ({
  children,
  color,
  tilt,
  pin = true,
  className = "",
}: {
  children: React.ReactNode;
  color?: { bg: string; tape: string };
  tilt?: string;
  pin?: boolean;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    whileTap={{ rotate: 0, scale: 0.98 }}
    transition={{ duration: 0.45, ease: "easeOut" }}
    className={`relative ${className}`}
    style={{
      background: color?.bg ?? "#FFFBE9",
      transform: `rotate(${tilt ?? "0deg"})`,
      boxShadow:
        "0 6px 14px -6px rgba(60,40,10,0.25), 0 2px 4px rgba(60,40,10,0.12)",
      borderRadius: 10,
      padding: "18px 16px 16px",
    }}
  >
    {pin && <Pin />}
    {children}
  </motion.div>
);

const SynagogueWall = () => {
  const { user } = useAuth();
  const [synas, setSynas] = useState<SynaSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [annonces, setAnnonces] = useState<AnnonceRow[]>([]);
  const [cours, setCours] = useState<CoursRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* — Récupère les synagogues auxquelles le fidèle est abonné — */
  const fetchSynas = useCallback(async () => {
    if (!user) {
      setSynas([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: subs } = await supabase
      .from("synagogue_subscriptions")
      .select("synagogue_id")
      .eq("user_id", user.id);
    const ids = (subs || []).map((s: any) => s.synagogue_id);
    if (ids.length === 0) {
      setSynas([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    const { data: profiles } = await (supabase
      .from("synagogue_profiles")
      .select(
        "id, name, shacharit_time, shacharit_time_2, minha_time, minha_time_2, arvit_time, arvit_time_2, primary_color, secondary_color"
      ) as any)
      .in("id", ids)
      .order("name");
    const list = (profiles || []) as SynaSummary[];
    setSynas(list);
    setActiveId((prev) => prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchSynas();
  }, [fetchSynas]);

  /* — Charge le contenu de la synagogue active — */
  const fetchWallContent = useCallback(async (synaId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const [a, c, e] = await Promise.all([
      supabase
        .from("annonces")
        .select("id, title, content, priority, created_at")
        .eq("synagogue_id", synaId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("cours_zoom")
        .select("id, title, rav, day_of_week, course_time, description, course_type, zoom_link, address")
        .eq("synagogue_id", synaId)
        .order("course_time", { ascending: true })
        .limit(12),
      supabase
        .from("evenements")
        .select("id, title, description, event_date, event_time, location, event_type")
        .eq("synagogue_id", synaId)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(6),
    ]);
    setAnnonces((a.data || []) as AnnonceRow[]);
    setCours((c.data || []) as CoursRow[]);
    setEvents((e.data || []) as EventRow[]);
  }, []);

  useEffect(() => {
    if (!activeId) {
      setAnnonces([]); setCours([]); setEvents([]);
      return;
    }
    void fetchWallContent(activeId);
  }, [activeId, fetchWallContent]);

  /* — Realtime : nouvelles annonces / cours / événements — */
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`syna-wall-${activeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces", filter: `synagogue_id=eq.${activeId}` }, () => fetchWallContent(activeId))
      .on("postgres_changes", { event: "*", schema: "public", table: "cours_zoom", filter: `synagogue_id=eq.${activeId}` }, () => fetchWallContent(activeId))
      .on("postgres_changes", { event: "*", schema: "public", table: "evenements", filter: `synagogue_id=eq.${activeId}` }, () => fetchWallContent(activeId))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeId, fetchWallContent]);

  const activeSyna = useMemo(
    () => synas.find((s) => s.id === activeId) ?? null,
    [synas, activeId]
  );

  /* — Empty state : aucune syna abonnée — */
  if (!loading && synas.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background:
            "repeating-linear-gradient(45deg, #FDF6E3, #FDF6E3 10px, #F5ECCF 10px, #F5ECCF 20px)",
          border: "1px dashed #C9B07A",
        }}
      >
        <span className="text-5xl">📌</span>
        <p className="mt-3" style={{ fontFamily: "'Caveat', cursive", fontSize: 24, color: "#5a3a1a" }}>
          Le tableau d'affichage est vide…
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Abonnez-vous à votre synagogue dans l'onglet « Annuaire » ou « Proches »
          pour voir ses horaires, annonces et cours sur ce mur.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Chargement du tableau d'affichage…
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-3 sm:p-5"
      style={{
        // fond papier kraft / parchemin avec subtile texture
        background:
          "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.55), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.4), transparent 40%), #FDF6E3",
        border: "1px solid #E5D6A8",
        boxShadow: "inset 0 0 60px rgba(140,100,40,0.08)",
      }}
    >
      {/* — Sélecteur de synagogue — */}
      {synas.length > 1 && (
        <div className="mb-4 -mx-1 overflow-x-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          <div className="flex gap-2 px-1" style={{ minWidth: "max-content" }}>
            {synas.map((s) => {
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className="rounded-full border px-4 py-2 text-xs font-bold transition-all active:scale-95"
                  style={{
                    minHeight: 40,
                    fontFamily: "'Patrick Hand', cursive",
                    fontSize: 15,
                    background: active ? "#5a3a1a" : "rgba(255,255,255,0.7)",
                    color: active ? "#FDF6E3" : "#5a3a1a",
                    borderColor: "#C9B07A",
                  }}
                >
                  🏛️ {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* — Titre du mur — */}
      <div className="mb-4 text-center">
        <h2
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 34,
            lineHeight: 1.1,
            color: "#3a2410",
            fontWeight: 700,
          }}
        >
          📌 Le mur de {activeSyna?.name ?? "ma synagogue"}
        </h2>
        <p style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 15, color: "#7a5a30" }}>
          Tout ce qu'il faut savoir cette semaine
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeId ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          {/* — Horaires : grande carte centrale — */}
          {activeSyna && (
            <PaperCard color={{ bg: "#FFFBE9", tape: "#E8D26A" }} tilt="-1deg">
              <h3
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: 26,
                  color: "#3a2410",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                🕐 Horaires de prières
              </h3>
              <div
                className="mt-3 grid grid-cols-3 gap-3 text-center"
                style={{ fontFamily: "'Patrick Hand', cursive", color: "#3a2410" }}
              >
                <div>
                  <p style={{ fontSize: 14, opacity: 0.7 }}>🌅 Cha'harit</p>
                  <p style={{ fontSize: 22, fontWeight: 700 }}>{formatTime(activeSyna.shacharit_time)}</p>
                  {activeSyna.shacharit_time_2 && (
                    <p style={{ fontSize: 16 }}>{formatTime(activeSyna.shacharit_time_2)}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 14, opacity: 0.7 }}>🌇 Min'ha</p>
                  <p style={{ fontSize: 22, fontWeight: 700 }}>{formatTime(activeSyna.minha_time)}</p>
                  {activeSyna.minha_time_2 && (
                    <p style={{ fontSize: 16 }}>{formatTime(activeSyna.minha_time_2)}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 14, opacity: 0.7 }}>🌙 Arvit</p>
                  <p style={{ fontSize: 22, fontWeight: 700 }}>{formatTime(activeSyna.arvit_time)}</p>
                  {activeSyna.arvit_time_2 && (
                    <p style={{ fontSize: 16 }}>{formatTime(activeSyna.arvit_time_2)}</p>
                  )}
                </div>
              </div>
            </PaperCard>
          )}

          {/* — Annonces — */}
          <section>
            <h3
              className="mb-2 px-1"
              style={{
                fontFamily: "'Kalam', cursive",
                fontSize: 22,
                color: "#3a2410",
                fontWeight: 700,
              }}
            >
              📣 Annonces de la semaine
            </h3>
            {annonces.length === 0 ? (
              <p className="px-1 text-sm" style={{ fontFamily: "'Patrick Hand', cursive", color: "#7a5a30" }}>
                Pas d'annonce pour l'instant — le tableau est calme.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {annonces.map((a, i) => {
                  const color = NOTE_COLORS[i % NOTE_COLORS.length];
                  const tilt = TILTS[i % TILTS.length];
                  return (
                    <PaperCard key={a.id} color={color} tilt={tilt}>
                      <p
                        style={{
                          fontFamily: "'Caveat', cursive",
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#2a1a08",
                          lineHeight: 1.1,
                        }}
                      >
                        {a.title}
                      </p>
                      <p
                        className="mt-1 whitespace-pre-line"
                        style={{
                          fontFamily: "'Patrick Hand', cursive",
                          fontSize: 16,
                          color: "#3a2410",
                          lineHeight: 1.35,
                        }}
                      >
                        {a.content}
                      </p>
                      <p className="mt-2" style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: "#7a5a30" }}>
                        ✍️ {formatRelative(a.created_at)}
                      </p>
                    </PaperCard>
                  );
                })}
              </div>
            )}
          </section>

          {/* — Cours — */}
          <section>
            <h3
              className="mb-2 px-1"
              style={{
                fontFamily: "'Kalam', cursive",
                fontSize: 22,
                color: "#3a2410",
                fontWeight: 700,
              }}
            >
              📖 Cours de la semaine
            </h3>
            {cours.length === 0 ? (
              <p className="px-1 text-sm" style={{ fontFamily: "'Patrick Hand', cursive", color: "#7a5a30" }}>
                Aucun cours programmé pour l'instant.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {cours.map((c, i) => {
                  const tilt = TILTS[(i + 2) % TILTS.length];
                  return (
                    <PaperCard key={c.id} color={{ bg: "#FFFBE9", tape: "#E8D26A" }} tilt={tilt}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p style={{ fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700, color: "#2a1a08", lineHeight: 1.1 }}>
                          📖 {c.title}
                        </p>
                        <span style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 14, color: "#7a5a30" }}>
                          {c.day_of_week} · {formatTime(c.course_time)}
                        </span>
                      </div>
                      {c.rav && (
                        <p style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 16, color: "#3a2410" }}>
                          ✡️ {c.rav}
                        </p>
                      )}
                      {c.description && (
                        <p style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 15, color: "#3a2410", lineHeight: 1.3 }}>
                          {c.description}
                        </p>
                      )}
                      {c.course_type === "zoom" && c.zoom_link ? (
                        <a
                          href={c.zoom_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block rounded-lg px-3 py-1 text-xs font-bold no-underline active:scale-95"
                          style={{ background: "#3a2410", color: "#FDF6E3", fontFamily: "'Patrick Hand', cursive" }}
                        >
                          🎥 Rejoindre Zoom
                        </a>
                      ) : c.address ? (
                        <p className="mt-1" style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 14, color: "#7a5a30" }}>
                          📍 {c.address}
                        </p>
                      ) : null}
                    </PaperCard>
                  );
                })}
              </div>
            )}
          </section>

          {/* — Événements à venir — */}
          {events.length > 0 && (
            <section>
              <h3
                className="mb-2 px-1"
                style={{
                  fontFamily: "'Kalam', cursive",
                  fontSize: 22,
                  color: "#3a2410",
                  fontWeight: 700,
                }}
              >
                🎉 Événements à venir
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {events.map((ev, i) => {
                  const tilt = TILTS[(i + 1) % TILTS.length];
                  return (
                    <PaperCard key={ev.id} color={{ bg: "#FFE3C2", tape: "#E8B070" }} tilt={tilt}>
                      <p style={{ fontFamily: "'Caveat', cursive", fontSize: 24, fontWeight: 700, color: "#2a1a08", lineHeight: 1.1 }}>
                        {ev.title}
                      </p>
                      <p style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 15, color: "#7a5a30" }}>
                        🗓️ {formatDate(ev.event_date)} · {ev.event_time}
                      </p>
                      {ev.location && (
                        <p style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 14, color: "#3a2410" }}>
                          📍 {ev.location}
                        </p>
                      )}
                      {ev.description && (
                        <p className="mt-1" style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 15, color: "#3a2410", lineHeight: 1.3 }}>
                          {ev.description}
                        </p>
                      )}
                    </PaperCard>
                  );
                })}
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SynagogueWall;