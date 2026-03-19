import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";

const CHAIN_GROUPS = [
  { start: 1, end: 15 }, { start: 16, end: 30 }, { start: 31, end: 45 },
  { start: 46, end: 60 }, { start: 61, end: 75 }, { start: 76, end: 90 },
  { start: 91, end: 105 }, { start: 106, end: 120 }, { start: 121, end: 135 },
  { start: 136, end: 150 },
];

const DEDICATION_LABELS: Record<string, string> = {
  general: "", refouah: "🙏 Refouah Chelema", ilouye: "🕯️ Ilouye Nichmat",
  hatslaha: "✨ Hatslaha", zivougue: "💍 Zivougué",
};

type Chain = {
  id: string; creator_id: string; title: string;
  dedication: string | null; dedication_type: string | null;
  status: string; created_at: string;
};

type Claim = {
  id: string; chain_id: string; user_id: string | null;
  display_name: string; chapter_start: number; chapter_end: number;
  completed: boolean; claimed_at: string; completed_at: string | null;
};

const TehilimJoinContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chain, setChain] = useState<Chain | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const fetchClaims = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("tehilim_claims")
      .select("*")
      .eq("chain_id", id)
      .order("chapter_start");
    setClaims((data as Claim[]) || []);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchChain = async () => {
      const { data, error } = await supabase
        .from("tehilim_chains")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setChain(data as Chain);
      await fetchClaims();
      setLoading(false);
    };
    fetchChain();
  }, [id, fetchClaims]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`tehilim-join-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tehilim_claims", filter: `chain_id=eq.${id}` }, () => {
        fetchClaims();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchClaims]);

  const claimGroup = async (group: { start: number; end: number }) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();
    const { error } = await supabase.from("tehilim_claims").insert({
      chain_id: id!,
      user_id: user.id,
      display_name: profile?.display_name || user.email || "Anonyme",
      chapter_start: group.start,
      chapter_end: group.end,
    });
    if (error) {
      toast.error("Erreur lors de la réservation");
    } else {
      toast.success(`✅ Chapitres ${group.start}-${group.end} réservés !`);
    }
  };

  const toggleComplete = async (claim: Claim) => {
    await supabase
      .from("tehilim_claims")
      .update({ completed: !claim.completed, completed_at: !claim.completed ? new Date().toISOString() : null })
      .eq("id", claim.id);
  };

  const totalClaimed = claims.length;
  const totalCompleted = claims.filter((c) => c.completed).length;
  const progress = Math.round((totalCompleted / CHAIN_GROUPS.length) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-5xl">📖</span>
          <h1 className="font-display text-xl font-bold text-foreground mt-4">Chaîne introuvable</h1>
          <p className="text-sm text-muted-foreground mt-2">Cette chaîne de Tehilim n'existe plus.</p>
          <button onClick={() => navigate("/")} className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)" }}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[500px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">📖 Chaîne de Tehilim</h1>
          <p className="text-sm text-muted-foreground mt-1">Prenez un groupe de psaumes à lire</p>
        </div>

        {/* Chain info */}
        {chain && (
          <div className="p-5 rounded-2xl border border-border mb-6" style={{ background: "hsl(var(--gold) / 0.04)", boxShadow: "var(--shadow-card)" }}>
            <h2 className="font-display text-lg font-bold text-foreground">{chain.title}</h2>
            {chain.dedication && (
              <p className="text-sm text-muted-foreground mt-1">
                {DEDICATION_LABELS[chain.dedication_type || "general"]} {chain.dedication}
              </p>
            )}
            {/* Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                <span>{totalClaimed}/{CHAIN_GROUPS.length} réservés</span>
                <span>{totalCompleted}/{CHAIN_GROUPS.length} terminés</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: progress === 100 ? "#22c55e" : "var(--gradient-gold)" }}
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          </div>
        )}

        {/* Groups */}
        <div className="space-y-2.5">
          {CHAIN_GROUPS.map((group) => {
            const claim = claims.find((c) => c.chapter_start === group.start && c.chapter_end === group.end);
            const isMine = claim?.user_id === user?.id;

            return (
              <div key={group.start} className={`p-4 rounded-xl border transition-all ${
                claim?.completed ? "border-green-500/30 bg-green-500/5"
                : claim ? "border-primary/30 bg-primary/5" : "border-border"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                      background: claim?.completed ? "rgba(34,197,94,0.15)" : claim ? "hsl(var(--gold) / 0.1)" : "hsl(var(--muted))",
                      color: claim?.completed ? "#22c55e" : claim ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                    }}>
                      {group.start}-{group.end}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Chapitres {group.start} à {group.end}</p>
                      {claim && (
                        <p className="text-[11px] text-muted-foreground">
                          {claim.completed ? "✅" : "📖"} {claim.display_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {!claim && (
                    <button onClick={() => claimGroup(group)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border-none text-primary-foreground"
                      style={{ background: "var(--gradient-gold)" }}>
                      {user ? "Prendre" : "🔑"}
                    </button>
                  )}
                  {isMine && !claim?.completed && (
                    <button onClick={() => toggleComplete(claim!)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border border-green-500 text-green-500 bg-transparent hover:bg-green-500/10">
                      ✓ Terminé
                    </button>
                  )}
                  {isMine && claim?.completed && (
                    <span className="text-xs font-bold text-green-500">✅ Fait</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back */}
        <div className="text-center mt-8">
          <button onClick={() => navigate("/")} className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer hover:underline">
            ← Retour à Chabbat Chalom
          </button>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

const TehilimJoin = () => (
  <AuthProvider>
    <TehilimJoinContent />
  </AuthProvider>
);

export default TehilimJoin;
