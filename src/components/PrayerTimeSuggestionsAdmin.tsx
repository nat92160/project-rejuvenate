import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Suggestion {
  id: string;
  synagogue_id: string | null;
  synagogue_name?: string;
  place_id: string | null;
  place_name: string | null;
  user_id: string;
  display_name: string;
  office_name: string;
  time_value: string | null;
  time_rule: string | null;
  status: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

const OFFICE_LABELS: Record<string, string> = {
  shacharit: "🌅 Cha'harit",
  minha: "🌇 Min'ha",
  arvit: "🌙 Arvit",
};

interface Props {
  /** If set, filter by this synagogue (for president view) */
  synagogueId?: string;
  /** Show only pending (admin mode) or all */
  mode?: "admin" | "president";
}

const PrayerTimeSuggestionsAdmin = ({ synagogueId, mode = "admin" }: Props) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("prayer_time_suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (synagogueId) {
      query = query.eq("synagogue_id", synagogueId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch suggestions error:", error);
      setLoading(false);
      return;
    }

    // Enrich with synagogue names
    const synaIds = [...new Set((data || []).map((s: any) => s.synagogue_id))];
    let synaNames: Record<string, string> = {};

    if (synaIds.length > 0) {
      const { data: synas } = await supabase
        .from("synagogue_profiles")
        .select("id, name")
        .in("id", synaIds as string[]);
      (synas || []).forEach((s: any) => { synaNames[s.id] = s.name; });
    }

    setSuggestions(
      (data || []).map((s: any) => ({
        ...s,
        synagogue_name: synaNames[s.synagogue_id] || "Synagogue",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchSuggestions();
  }, [user, synagogueId]);

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    setProcessing(id);
    const updateData: any = {
      status: decision,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
      verified: decision === "approved",
    };

    const { error } = await (supabase as any)
      .from("prayer_time_suggestions")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    } else {
      toast.success(decision === "approved" ? "✅ Horaire approuvé et vérifié !" : "❌ Proposition rejetée");
      await fetchSuggestions();
    }
    setProcessing(null);
  };

  const handleDelete = async (id: string) => {
    setProcessing(id);
    const { error } = await (supabase as any)
      .from("prayer_time_suggestions")
      .delete()
      .eq("id", id);

    if (error) toast.error("Erreur");
    else { toast.success("Supprimé"); await fetchSuggestions(); }
    setProcessing(null);
  };

  const pending = suggestions.filter((s) => s.status === "pending");
  const processed = suggestions.filter((s) => s.status !== "pending");

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Chargement des propositions…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-foreground">
          📝 Propositions d'horaires
        </h3>
        <button
          onClick={fetchSuggestions}
          className="text-xs font-bold text-primary bg-transparent border-none cursor-pointer"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Pending */}
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <span className="text-3xl">✅</span>
          <p className="mt-2 text-sm text-muted-foreground">Aucune proposition en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-primary/70">
            En attente ({pending.length})
          </p>
          {pending.map((s, i) => (
            <motion.div
              key={s.id}
              className="rounded-2xl border border-primary/20 bg-card p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold">{OFFICE_LABELS[s.office_name] || s.office_name}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase">En attente</span>
                  </div>
                  {!synagogueId && (
                    <p className="text-[11px] text-muted-foreground">🏛️ {s.synagogue_name}</p>
                  )}
                  {s.time_value && (
                    <p className="text-sm font-bold text-foreground mt-1">🕐 {s.time_value}</p>
                  )}
                  {s.time_rule && (
                    <p className="text-sm text-foreground mt-1">📐 {s.time_rule}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    👤 {s.display_name} • {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleDecision(s.id, "approved")}
                  disabled={processing === s.id}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                  style={{ background: "var(--gradient-gold)" }}
                >
                  {processing === s.id ? "⏳" : "✅ Valider"}
                </button>
                <button
                  onClick={() => handleDecision(s.id, "rejected")}
                  disabled={processing === s.id}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-destructive/10 text-destructive border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {processing === s.id ? "⏳" : "❌ Rejeter"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Processed */}
      {processed.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Historique ({processed.length})
          </p>
          {processed.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-card p-3 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold">{OFFICE_LABELS[s.office_name] || s.office_name}</span>
                  {s.verified && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}>
                      ✓ Vérifié
                    </span>
                  )}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.status === "approved" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                    {s.status === "approved" ? "Approuvé" : "Rejeté"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {s.time_value || s.time_rule} • {s.display_name}
                  {!synagogueId && ` • ${s.synagogue_name}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={processing === s.id}
                className="text-xs text-destructive/60 hover:text-destructive bg-transparent border-none cursor-pointer disabled:opacity-50"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrayerTimeSuggestionsAdmin;
