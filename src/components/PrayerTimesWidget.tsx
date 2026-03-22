import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PrayerTimesPosterTemplate from "@/components/poster/PrayerTimesPosterTemplate";
import { exportPosterPng } from "@/components/poster/usePosterExport";
import { useSynaProfile } from "@/hooks/useSynaProfile";

interface PrayerTimes {
  shacharit_time: string;
  shacharit_time_2: string;
  minha_time: string;
  minha_time_2: string;
  arvit_time: string;
  arvit_time_2: string;
}

interface PrayerTimeInputProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}

const EMPTY: PrayerTimes = {
  shacharit_time: "",
  shacharit_time_2: "",
  minha_time: "",
  minha_time_2: "",
  arvit_time: "",
  arvit_time_2: "",
};

const offices = [
  { key: "shacharit_time" as const, key2: "shacharit_time_2" as const, label: "Cha'harit", icon: "🌅", desc: "Office du matin" },
  { key: "minha_time" as const, key2: "minha_time_2" as const, label: "Min'ha", icon: "🌇", desc: "Office de l'après-midi" },
  { key: "arvit_time" as const, key2: "arvit_time_2" as const, label: "Arvit", icon: "🌙", desc: "Office du soir" },
];

function formatTimeDraft(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function PrayerTimeInput({ label, value, onCommit }: PrayerTimeInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitValue = () => {
    const normalized = formatTimeDraft(draft);
    setDraft(normalized);
    onCommit(normalized);
  };

  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[10px] font-medium text-muted-foreground/60">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:MM"
        value={draft}
        onChange={(e) => setDraft(formatTimeDraft(e.target.value))}
        onBlur={commitValue}
        className="block h-11 w-full min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-sm text-center text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/40"
      />
    </div>
  );
}

const PrayerTimesWidget = () => {
  const { user } = useAuth();
  const [times, setTimes] = useState<PrayerTimes>(EMPTY);
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

        const { data: extra } = await supabase
          .from("synagogue_profiles")
          .select("shacharit_time_2, minha_time_2, arvit_time_2" as any)
          .eq("id", data.id)
          .maybeSingle();

        setTimes({
          shacharit_time: data.shacharit_time || "",
          shacharit_time_2: (extra as any)?.shacharit_time_2 || "",
          minha_time: data.minha_time || "",
          minha_time_2: (extra as any)?.minha_time_2 || "",
          arvit_time: data.arvit_time || "",
          arvit_time_2: (extra as any)?.arvit_time_2 || "",
        });
      }

      setLoading(false);
    })();
  }, [user]);

  const update = (key: keyof PrayerTimes, value: string) => {
    setTimes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!synaId) return;

    setSaving(true);

    const { error } = await supabase
      .from("synagogue_profiles")
      .update({
        shacharit_time: times.shacharit_time || null,
        minha_time: times.minha_time || null,
        arvit_time: times.arvit_time || null,
        shacharit_time_2: times.shacharit_time_2 || null,
        minha_time_2: times.minha_time_2 || null,
        arvit_time_2: times.arvit_time_2 || null,
      } as any)
      .eq("id", synaId);

    setSaving(false);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      return;
    }

    toast.success("Horaires mis à jour ✅");
  };

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!synaId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">🏛️</span>
        <p className="mt-3 text-sm text-muted-foreground">
          Créez d'abord votre profil dans "Infos Syna" pour gérer les horaires.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 overflow-x-hidden">
      <div
        className="rounded-2xl border border-primary/15 p-5 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <span className="text-3xl">🕐</span>
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Horaires des Offices</h3>
        <p className="mt-1 text-xs text-muted-foreground">Définissez les horaires quotidiens de votre synagogue</p>
      </div>

      <div className="space-y-3">
        {offices.map((office) => (
          <div
            key={office.key}
            className="overflow-hidden rounded-2xl border border-border bg-card p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))" }}
              >
                {office.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-foreground">{office.label}</p>
                <p className="text-[10px] text-muted-foreground">{office.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PrayerTimeInput
                label="Horaire 1"
                value={times[office.key]}
                onCommit={(value) => update(office.key, value)}
              />
              <PrayerTimeInput
                label="Horaire 2 (opt.)"
                value={times[office.key2]}
                onCommit={(value) => update(office.key2, value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          💡 Ces horaires seront affichés dans l'annuaire et l'onglet <strong>"Ma Synagogue"</strong> de vos fidèles.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full cursor-pointer rounded-2xl border-none py-4 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      >
        {saving ? "Enregistrement…" : "💾 Enregistrer les horaires"}
      </button>
    </motion.div>
  );
};

export default PrayerTimesWidget;
