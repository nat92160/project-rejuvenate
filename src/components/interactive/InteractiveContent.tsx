import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { shareText } from "@/lib/shareUtils";

/**
 * Generic reactions + comments + quick actions for verified content.
 * Used on annonces, horaires, evenements that come from the president
 * or are flagged verified.
 */

export type ContentType = "annonce" | "horaire" | "evenement";

interface Comment {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  is_president: boolean;
  created_at: string;
}

interface QuickActions {
  /** ISO date for calendar export */
  eventDate?: string;
  /** HH:MM */
  eventTime?: string;
  /** Address for itinerary */
  address?: string;
  /** Lat/lng for itinerary */
  lat?: number;
  lng?: number;
  /** Text shared via Web Share */
  shareText?: string;
  /** Calendar title */
  calendarTitle?: string;
}

interface Props {
  contentType: ContentType;
  contentId: string;
  synagogueId?: string | null;
  /** Show the "✓ Vérifié" badge */
  verified?: boolean;
  /** Show the "👑 Président" badge */
  fromPresident?: boolean;
  /** Quick actions config; omit any field to hide that button */
  actions?: QuickActions;
}

const formatRel = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  return `il y a ${Math.floor(d / 86400)} j`;
};

const buildIcs = (title: string, dateISO: string, time?: string, address?: string) => {
  const dt = new Date(`${dateISO}T${time || "20:00"}:00`);
  const end = new Date(dt.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ChabbatChalom//FR",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@chabbat-chalom.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title.replace(/[\r\n,]/g, " ")}`,
    address ? `LOCATION:${address.replace(/[\r\n,]/g, " ")}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
};

const InteractiveContent = ({ contentType, contentId, synagogueId, verified, fromPresident, actions }: Props) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch + realtime
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      const { data: c } = await (supabase as any)
        .from("content_comments").select("id, user_id, display_name, body, is_president, created_at")
        .eq("content_type", contentType).eq("content_id", contentId)
        .order("created_at", { ascending: true }).limit(50);
      if (cancelled) return;
      setComments((c as Comment[]) || []);
    };
    void fetchAll();

    const ch = supabase
      .channel(`ic-${contentType}-${contentId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "content_comments", filter: `content_id=eq.${contentId}` },
        () => void fetchAll())
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [contentType, contentId]);

  const postComment = async () => {
    if (!user) { toast.error("Connectez-vous pour commenter"); return; }
    const body = draft.trim();
    if (body.length < 1 || body.length > 600) { toast.error("1 à 600 caractères"); return; }
    setSending(true);
    const display_name = (user.user_metadata?.full_name || user.email?.split("@")[0] || "Fidèle").slice(0, 80);
    const { error } = await (supabase as any).from("content_comments").insert({
      content_type: contentType, content_id: contentId, synagogue_id: synagogueId ?? null,
      user_id: user.id, display_name, body, is_president: !!fromPresident && false, // user is the commenter, not the author
    });
    if (error) toast.error(error.message || "Erreur");
    else setDraft("");
    setSending(false);
  };

  const deleteComment = async (id: string) => {
    const { error } = await (supabase as any).from("content_comments").delete().eq("id", id);
    if (error) toast.error("Impossible de supprimer");
  };

  // ─── Quick actions ───
  const handleCalendar = () => {
    if (!actions?.eventDate || !actions?.calendarTitle) return;
    const ics = buildIcs(actions.calendarTitle, actions.eventDate, actions.eventTime, actions.address);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${actions.calendarTitle.replace(/\s+/g, "-").slice(0, 40)}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setShowMenu(false);
  };

  const handleShare = async () => {
    const ok = await shareText(actions?.shareText || "Découvrez sur Chabbat Chalom", actions?.calendarTitle);
    if (!ok) toast.error("Partage indisponible");
    setShowMenu(false);
  };

  const handleRoute = () => {
    let url = "";
    if (actions?.lat && actions?.lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${actions.lat},${actions.lng}`;
    } else if (actions?.address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(actions.address)}`;
    }
    if (url) window.open(url, "_blank", "noopener");
    setShowMenu(false);
  };

  const handleRemind = async () => {
    if (!actions?.eventDate) return;
    const when = new Date(`${actions.eventDate}T${actions.eventTime || "20:00"}:00`).getTime() - 30 * 60_000;
    if (when < Date.now()) { toast.error("Événement déjà passé"); return; }
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") throw new Error("denied");
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 1e6),
          title: "⏰ Rappel",
          body: `${actions.calendarTitle || "Événement"} dans 30 min`,
          schedule: { at: new Date(when) },
        }],
      });
      toast.success("Rappel programmé 30 min avant");
    } catch {
      // Web fallback: store in localStorage so app can warn on next open
      try {
        const key = "calj_pending_reminders";
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push({ at: when, title: actions.calendarTitle });
        localStorage.setItem(key, JSON.stringify(arr));
        toast.success("Rappel ajouté");
      } catch { toast.error("Rappel impossible"); }
    }
    setShowMenu(false);
  };

  const hasActions = !!(actions?.eventDate || actions?.address || actions?.lat || actions?.shareText);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {fromPresident && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte, 36 75% 33%))" }}>
            👑 Président
          </span>
        )}
        {verified && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
            ✓ Vérifié
          </span>
        )}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setShowComments((v) => !v)}
          className="min-h-[36px] px-2.5 py-1 rounded-full text-sm border border-border bg-card hover:bg-muted cursor-pointer transition-all active:scale-95"
        >
          💬 {comments.length > 0 && <span className="text-[11px] font-bold">{comments.length}</span>}
        </button>
        {hasActions && (
          <div className="relative ml-auto">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="min-h-[36px] w-9 rounded-full text-base border border-border bg-card hover:bg-muted cursor-pointer transition-all active:scale-95 flex items-center justify-center"
              aria-label="Actions rapides"
            >⋯</button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-border bg-card overflow-hidden"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {actions?.eventDate && (
                    <button onClick={handleCalendar} className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-muted cursor-pointer border-none bg-transparent">
                      📅 Ajouter au calendrier
                    </button>
                  )}
                  {actions?.eventDate && (
                    <button onClick={handleRemind} className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-muted cursor-pointer border-none bg-transparent">
                      ⏰ Me rappeler 30 min avant
                    </button>
                  )}
                  {actions?.shareText && (
                    <button onClick={handleShare} className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-muted cursor-pointer border-none bg-transparent">
                      📤 Partager
                    </button>
                  )}
                  {(actions?.address || (actions?.lat && actions?.lng)) && (
                    <button onClick={handleRoute} className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-muted cursor-pointer border-none bg-transparent">
                      🗺️ Itinéraire
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {comments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">Aucun commentaire — soyez le premier.</p>
            ) : comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-muted/40 border border-border p-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-foreground">{c.display_name || "Fidèle"}</span>
                  {c.is_president && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte, 36 75% 33%))" }}>👑</span>}
                  <span className="text-[10px] text-muted-foreground">{formatRel(c.created_at)}</span>
                  {user?.id === c.user_id && (
                    <button onClick={() => deleteComment(c.id)} className="ml-auto text-[10px] text-destructive/60 hover:text-destructive bg-transparent border-none cursor-pointer">
                      🗑️
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] text-foreground/90 whitespace-pre-line break-words">{c.body}</p>
              </div>
            ))}
            {user ? (
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 600))}
                  placeholder="Écrire un commentaire…"
                  rows={2}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[16px] sm:text-[13px] text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={postComment}
                  disabled={sending || draft.trim().length === 0}
                  className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--gradient-gold)" }}
                >
                  {sending ? "…" : "Envoyer"}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">Connectez-vous pour commenter.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InteractiveContent;