import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { toast } from "sonner";

interface Subscriber {
  user_id: string;
  display_name: string;
}

const AdjointManager = () => {
  const { user } = useAuth();
  const { synagogueId } = useSynaProfile();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [currentAdjointId, setCurrentAdjointId] = useState<string | null>(null);
  const [adjointName, setAdjointName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!synagogueId || !user) return;
    const load = async () => {
      // Get current adjoint
      const { data: syna } = await supabase
        .from("synagogue_profiles")
        .select("adjoint_id")
        .eq("id", synagogueId)
        .single();
      
      const adjId = (syna as any)?.adjoint_id || null;
      setCurrentAdjointId(adjId);

      // Get adjoint name if exists
      if (adjId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, first_name, last_name")
          .eq("user_id", adjId)
          .single();
        if (profile) {
          setAdjointName(
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name || "Adjoint"
          );
        }
      }

      // Get subscribers (potential adjoints)
      const { data: subs } = await supabase
        .from("synagogue_subscriptions")
        .select("user_id")
        .eq("synagogue_id", synagogueId);

      if (subs && subs.length > 0) {
        const userIds = subs.map(s => s.user_id).filter(id => id !== user.id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, first_name, last_name")
            .in("user_id", userIds);
          
          setSubscribers(
            (profiles || []).map(p => ({
              user_id: p.user_id,
              display_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || "Membre",
            }))
          );
        }
      }
      setLoading(false);
    };
    void load();
  }, [synagogueId, user]);

  const assignAdjoint = async (userId: string, name: string) => {
    if (!synagogueId) return;
    setSaving(true);

    // Update synagogue_profiles
    const { error } = await supabase
      .from("synagogue_profiles")
      .update({ adjoint_id: userId } as any)
      .eq("id", synagogueId);

    if (error) {
      toast.error("Erreur lors de la nomination");
      setSaving(false);
      return;
    }

    // Give the adjoint the president role so RLS policies allow them to create content
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "president" as any }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    setCurrentAdjointId(userId);
    setAdjointName(name);
    toast.success(`🏅 ${name} est maintenant votre Adjoint !`);
    setSaving(false);
  };

  const removeAdjoint = async () => {
    if (!synagogueId || !currentAdjointId) return;
    setSaving(true);

    const { error } = await supabase
      .from("synagogue_profiles")
      .update({ adjoint_id: null } as any)
      .eq("id", synagogueId);

    if (error) {
      toast.error("Erreur");
      setSaving(false);
      return;
    }

    // Remove president role from former adjoint
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", currentAdjointId)
      .eq("role", "president" as any);

    // Give them back the fidele role
    await supabase
      .from("user_roles")
      .upsert({ user_id: currentAdjointId, role: "fidele" as any }, { onConflict: "user_id,role" });

    setCurrentAdjointId(null);
    setAdjointName(null);
    toast.success("Adjoint retiré");
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-5 mb-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">🏅 Adjoint</h3>
        <p className="text-xs text-muted-foreground mt-1">Nommez un membre de confiance avec les mêmes droits que vous</p>
      </div>

      {/* Current adjoint */}
      {currentAdjointId && adjointName ? (
        <div className="rounded-2xl bg-card p-5 border border-border mb-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏅</span>
              <div>
                <p className="text-sm font-bold text-foreground">{adjointName}</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider mt-1" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.2), hsl(var(--gold) / 0.1))", color: "hsl(var(--gold-matte))" }}>
                  Adjoint actif
                </span>
              </div>
            </div>
            <button
              onClick={removeAdjoint}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border-none cursor-pointer disabled:opacity-50"
            >
              Retirer
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-5 border border-border mb-4 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-4xl">👤</span>
          <p className="text-sm text-muted-foreground mt-2">Aucun adjoint désigné</p>
        </div>
      )}

      {/* Subscriber list to choose from */}
      {!currentAdjointId && (
        <>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Fidèles abonnés</h4>
          {subscribers.length === 0 ? (
            <div className="rounded-xl bg-card p-4 border border-border text-center">
              <p className="text-xs text-muted-foreground">Aucun fidèle abonné à votre synagogue pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscribers.map(s => (
                <div key={s.user_id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <span className="text-sm font-medium text-foreground">{s.display_name}</span>
                  <button
                    onClick={() => assignAdjoint(s.user_id, s.display_name)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary-foreground border-none cursor-pointer disabled:opacity-50"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    🏅 Nommer
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default AdjointManager;
