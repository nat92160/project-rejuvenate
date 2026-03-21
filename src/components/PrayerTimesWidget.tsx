import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const PrayerTimesWidget = () => {
  const { user } = useAuth();
  const [times, setTimes] = useState({ shacharit_time: "", minha_time: "", arvit_time: "" });
  const [synaId, setSynaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("synagogue_profiles")
        .select("id, shacharit_time, minha_time, arvit_time")
        .or(`president_id.eq.${user.id},adjoint_id.eq.${user.id}`)
        .maybeSingle();
      if (data) {
        setSynaId(data.id);
        setTimes({
          shacharit_time: data.shacharit_time || "",
          minha_time: data.minha_time || "",
          arvit_time: data.arvit_time || "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!synaId) return;
    setSaving(true);
    const { error } = await supabase
      .from("synagogue_profiles")
      .update({
        shacharit_time: times.shacharit_time || null,
        minha_time: times.minha_time || null,
        arvit_time: times.arvit_time || null,
      })
      .eq("id", synaId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Horaires mis à jour ✅");
    }
  };

  const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
    );
  }

  if (!synaId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">🏛️</span>
        <p className="mt-3 text-sm text-muted-foreground">
          Créez d'abord votre profil de synagogue dans "Ma Synagogue" pour gérer les horaires.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl border border-primary/15 p-5 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <span className="text-3xl">🕐</span>
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Horaires des Offices</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Définissez les horaires quotidiens de votre synagogue
        </p>
      </div>

      {/* Time inputs */}
      <div className="space-y-3">
        {[
          { key: "shacharit_time" as const, label: "Cha'harit", icon: "🌅", desc: "Office du matin" },
          { key: "minha_time" as const, label: "Min'ha", icon: "🌇", desc: "Office de l'après-midi" },
          { key: "arvit_time" as const, label: "Arvit", icon: "🌙", desc: "Office du soir" },
        ].map((office) => (
          <div
            key={office.key}
            className="rounded-2xl border border-border bg-card p-4"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))",
                }}
              >
                {office.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-foreground">{office.label}</p>
                <p className="text-[10px] text-muted-foreground">{office.desc}</p>
              </div>
              <input
                type="time"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 w-[110px]"
                value={times[office.key]}
                onChange={(e) => setTimes((prev) => ({ ...prev, [office.key]: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          💡 Ces horaires seront affichés dans l'annuaire et l'onglet <strong>"Ma Synagogue"</strong> de vos fidèles,
          au même titre que les horaires de Chabbat.
        </p>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl border-none py-4 text-sm font-bold text-primary-foreground cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      >
        {saving ? "Enregistrement…" : "💾 Enregistrer les horaires"}
      </button>
    </motion.div>
  );
};

export default PrayerTimesWidget;
