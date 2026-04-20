import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * SynagogueWall — Tableau de la synagogue, esthétique minimaliste & chic.
 * Typographie sobre, fond ivoire, filets or mat, sans post-its ni manuscrits.
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
  mikve_enabled?: boolean | null;
  mikve_winter_hours?: string | null;
  mikve_summer_hours?: string | null;
  mikve_phone?: string | null;
  mikve_maps_link?: string | null;
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

const PALETTE = {
  bg: "#FBFAF6",       // ivoire très clair
  surface: "#FFFFFF",  // cards blanches
  ink: "#001F3F",      // bleu nuit
  inkSoft: "#3A4A60",
  inkMuted: "#8A92A2",
  gold: "#996515",
  goldSoft: "#C5A059",
  border: "#ECE7DC",
  hairline: "#E4DFD2",
};

const formatTime = (t?: string | null) => (t ? t.slice(0, 5) : "—");

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `il y a ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

/* — Card sobre, blanche, filet doré discret — */
const Card = ({
  children,
  className = "",
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className={`relative overflow-hidden ${className}`}
    style={{
      background: PALETTE.surface,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 4,
      padding: "20px 22px",
      boxShadow: "0 1px 2px rgba(0,20,40,0.03)",
    }}
  >
    {accent && (
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${PALETTE.goldSoft}, transparent)`,
        }}
      />
    )}
    {children}
  </motion.div>
);

/* — Titre de section : petit eyebrow + filet doré — */
const SectionTitle = ({ label }: { label: string }) => (
  <div className="mb-4 flex items-center gap-3 px-1">
    <span
      style={{
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: PALETTE.gold,
      }}
    >
      {label}
    </span>
    <span
      aria-hidden
      style={{ flex: 1, height: 1, background: PALETTE.hairline }}
    />
  </div>
);

const SynagogueWall = () => {
  const { user } = useAuth();
  const [synas, setSynas] = useState<SynaSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [annonces, setAnnonces] = useState<AnnonceRow[]>([]);
  const [cours, setCours] = useState<CoursRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

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
        "id, name, shacharit_time, shacharit_time_2, minha_time, minha_time_2, arvit_time, arvit_time_2, primary_color, secondary_color, mikve_enabled, mikve_winter_hours, mikve_summer_hours, mikve_phone, mikve_maps_link"
      ) as any)
      .in("id", ids)
      .order("name");
    const list = (profiles || []) as SynaSummary[];
    setSynas(list);
    setActiveId((prev) => prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchSynas(); }, [fetchSynas]);

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

  if (!loading && synas.length === 0) {
    return (
      <div
        className="rounded-sm p-10 text-center"
        style={{
          background: PALETTE.surface,
          border: `1px solid ${PALETTE.border}`,
        }}
      >
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: PALETTE.gold,
          }}
        >
          Tableau vide
        </p>
        <p
          className="mt-3"
          style={{
            fontFamily: "'Lora', serif",
            fontSize: 18,
            color: PALETTE.ink,
            fontWeight: 500,
          }}
        >
          Aucune synagogue suivie pour l'instant.
        </p>
        <p className="mt-2 text-sm" style={{ color: PALETTE.inkMuted, fontFamily: "'Montserrat', sans-serif" }}>
          Abonnez-vous à votre synagogue dans l'onglet « Annuaire »
          pour retrouver ici ses horaires, annonces et cours.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: PALETTE.inkMuted, fontFamily: "'Montserrat', sans-serif" }}>
        Chargement…
      </div>
    );
  }

  return (
    <div
      className="rounded-sm p-4 sm:p-8"
      style={{
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.border}`,
      }}
    >
      {/* — Sélecteur de synagogue (onglets discrets) — */}
      {synas.length > 1 && (
        <div className="mb-6 -mx-1 overflow-x-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          <div className="flex gap-1 px-1" style={{ minWidth: "max-content" }}>
            {synas.map((s) => {
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className="transition-all active:scale-[0.98]"
                  style={{
                    minHeight: 40,
                    padding: "8px 16px",
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    background: "transparent",
                    color: active ? PALETTE.ink : PALETTE.inkMuted,
                    border: "none",
                    borderBottom: active ? `2px solid ${PALETTE.gold}` : `2px solid transparent`,
                    borderRadius: 0,
                  }}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* — En-tête sobre — */}
      <div className="mb-8 text-center">
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: PALETTE.gold,
          }}
        >
          Le tableau
        </p>
        <h2
          className="mt-2"
          style={{
            fontFamily: "'Lora', serif",
            fontSize: 28,
            lineHeight: 1.15,
            color: PALETTE.ink,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          {activeSyna?.name ?? "Ma synagogue"}
        </h2>
        <div
          aria-hidden
          className="mx-auto mt-4"
          style={{
            height: 1,
            width: 48,
            background: PALETTE.goldSoft,
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeId ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {/* — Horaires de prière — */}
          {activeSyna && (
            <section>
              <SectionTitle label="Horaires de prière" />
              <Card accent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Cha'harit", t1: activeSyna.shacharit_time, t2: activeSyna.shacharit_time_2 },
                    { label: "Min'ha", t1: activeSyna.minha_time, t2: activeSyna.minha_time_2 },
                    { label: "Arvit", t1: activeSyna.arvit_time, t2: activeSyna.arvit_time_2 },
                  ].map((o, idx) => (
                    <div
                      key={o.label}
                      style={{
                        borderLeft: idx > 0 ? `1px solid ${PALETTE.hairline}` : "none",
                        padding: "4px 8px",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: PALETTE.gold,
                        }}
                      >
                        {o.label}
                      </p>
                      <p
                        className="mt-2"
                        style={{
                          fontFamily: "'Lora', serif",
                          fontSize: 24,
                          fontWeight: 500,
                          color: PALETTE.ink,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {formatTime(o.t1)}
                      </p>
                      {o.t2 && (
                        <p
                          className="mt-0.5"
                          style={{
                            fontFamily: "'Lora', serif",
                            fontSize: 14,
                            color: PALETTE.inkMuted,
                          }}
                        >
                          {formatTime(o.t2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* — Mikvé — */}
          {activeSyna?.mikve_enabled && (
            <section>
              <SectionTitle label="Mikvé" />
              <Card>
                <div className="space-y-2">
                  {activeSyna.mikve_winter_hours && (
                    <div className="flex items-baseline gap-3">
                      <span
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: PALETTE.gold,
                          minWidth: 60,
                        }}
                      >
                        Hiver
                      </span>
                      <span style={{ fontFamily: "'Lora', serif", fontSize: 15, color: PALETTE.ink }}>
                        {activeSyna.mikve_winter_hours}
                      </span>
                    </div>
                  )}
                  {activeSyna.mikve_summer_hours && (
                    <div className="flex items-baseline gap-3">
                      <span
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: PALETTE.gold,
                          minWidth: 60,
                        }}
                      >
                        Été
                      </span>
                      <span style={{ fontFamily: "'Lora', serif", fontSize: 15, color: PALETTE.ink }}>
                        {activeSyna.mikve_summer_hours}
                      </span>
                    </div>
                  )}
                  {!activeSyna.mikve_winter_hours && !activeSyna.mikve_summer_hours && (
                    <p style={{ fontFamily: "'Lora', serif", fontSize: 14, color: PALETTE.inkMuted }}>
                      Contactez la synagogue pour les horaires.
                    </p>
                  )}
                </div>
                {(activeSyna.mikve_phone || activeSyna.mikve_maps_link) && (
                  <div className="mt-4 flex flex-wrap gap-2 pt-4" style={{ borderTop: `1px solid ${PALETTE.hairline}` }}>
                    {activeSyna.mikve_phone && (
                      <a
                        href={`tel:${activeSyna.mikve_phone}`}
                        className="no-underline active:scale-[0.98] transition-transform"
                        style={{
                          padding: "8px 16px",
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          background: PALETTE.ink,
                          color: PALETTE.bg,
                          borderRadius: 2,
                        }}
                      >
                        Appeler
                      </a>
                    )}
                    {activeSyna.mikve_maps_link && (
                      <a
                        href={activeSyna.mikve_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline active:scale-[0.98] transition-transform"
                        style={{
                          padding: "8px 16px",
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          background: "transparent",
                          color: PALETTE.ink,
                          border: `1px solid ${PALETTE.ink}`,
                          borderRadius: 2,
                        }}
                      >
                        Itinéraire
                      </a>
                    )}
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* — Annonces — */}
          <section>
            <SectionTitle label="Annonces" />
            {annonces.length === 0 ? (
              <p className="px-1 text-sm" style={{ fontFamily: "'Lora', serif", color: PALETTE.inkMuted, fontStyle: "italic" }}>
                Aucune annonce pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {annonces.map((a) => (
                  <Card key={a.id}>
                    <h4
                      style={{
                        fontFamily: "'Lora', serif",
                        fontSize: 17,
                        fontWeight: 600,
                        color: PALETTE.ink,
                        lineHeight: 1.3,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {a.title}
                    </h4>
                    <p
                      className="mt-2 whitespace-pre-line"
                      style={{
                        fontFamily: "'Lora', serif",
                        fontSize: 15,
                        color: PALETTE.inkSoft,
                        lineHeight: 1.55,
                      }}
                    >
                      {a.content}
                    </p>
                    <p
                      className="mt-3"
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: PALETTE.inkMuted,
                      }}
                    >
                      {formatRelative(a.created_at)}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* — Cours — */}
          <section>
            <SectionTitle label="Cours" />
            {cours.length === 0 ? (
              <p className="px-1 text-sm" style={{ fontFamily: "'Lora', serif", color: PALETTE.inkMuted, fontStyle: "italic" }}>
                Aucun cours programmé.
              </p>
            ) : (
              <div className="space-y-3">
                {cours.map((c) => (
                  <Card key={c.id}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <h4
                        style={{
                          fontFamily: "'Lora', serif",
                          fontSize: 17,
                          fontWeight: 600,
                          color: PALETTE.ink,
                          lineHeight: 1.3,
                        }}
                      >
                        {c.title}
                      </h4>
                      <span
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: PALETTE.gold,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.day_of_week} · {formatTime(c.course_time)}
                      </span>
                    </div>
                    {c.rav && (
                      <p
                        className="mt-1"
                        style={{
                          fontFamily: "'Lora', serif",
                          fontSize: 14,
                          fontStyle: "italic",
                          color: PALETTE.inkSoft,
                        }}
                      >
                        {c.rav}
                      </p>
                    )}
                    {c.description && (
                      <p
                        className="mt-2"
                        style={{
                          fontFamily: "'Lora', serif",
                          fontSize: 14,
                          color: PALETTE.inkSoft,
                          lineHeight: 1.5,
                        }}
                      >
                        {c.description}
                      </p>
                    )}
                    {c.course_type === "zoom" && c.zoom_link ? (
                      <a
                        href={c.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block no-underline active:scale-[0.98] transition-transform"
                        style={{
                          padding: "8px 16px",
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          background: PALETTE.ink,
                          color: PALETTE.bg,
                          borderRadius: 2,
                        }}
                      >
                        Rejoindre
                      </a>
                    ) : c.address ? (
                      <p
                        className="mt-2"
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 11,
                          color: PALETTE.inkMuted,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {c.address}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* — Événements — */}
          {events.length > 0 && (
            <section>
              <SectionTitle label="Événements" />
              <div className="space-y-3">
                {events.map((ev) => (
                  <Card key={ev.id}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <h4
                        style={{
                          fontFamily: "'Lora', serif",
                          fontSize: 17,
                          fontWeight: 600,
                          color: PALETTE.ink,
                          lineHeight: 1.3,
                        }}
                      >
                        {ev.title}
                      </h4>
                      <span
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: PALETTE.gold,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(ev.event_date)} · {ev.event_time}
                      </span>
                    </div>
                    {ev.location && (
                      <p
                        className="mt-1"
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 11,
                          color: PALETTE.inkMuted,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {ev.location}
                      </p>
                    )}
                    {ev.description && (
                      <p
                        className="mt-2"
                        style={{
                          fontFamily: "'Lora', serif",
                          fontSize: 14,
                          color: PALETTE.inkSoft,
                          lineHeight: 1.5,
                        }}
                      >
                        {ev.description}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SynagogueWall;
