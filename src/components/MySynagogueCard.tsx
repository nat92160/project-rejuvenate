import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import { Zmanim as HebcalZmanim } from "@hebcal/core";
import { useCity } from "@/hooks/useCity";
import { cityToLocation } from "@/lib/hebcal";

interface SynaInfo {
  id: string;
  name: string;
  shacharit_time: string | null;
  minha_time: string | null;
  arvit_time: string | null;
  logo_url: string | null;
}

type NextOffice = { label: string; time: string; siddourTab: string };

function getNextOffice(syna: SynaInfo): NextOffice | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const offices: { key: keyof SynaInfo; label: string; tab: string }[] = [
    { key: "shacharit_time", label: "Cha'harit", tab: "siddour" },
    { key: "minha_time", label: "Min'ha", tab: "siddour" },
    { key: "arvit_time", label: "Arvit", tab: "siddour" },
  ];

  // Find the next office whose time hasn't passed
  for (const o of offices) {
    const t = syna[o.key] as string | null;
    if (t && t > hhmm) return { label: o.label, time: t, siddourTab: o.tab };
  }

  // All passed → show tomorrow's first
  for (const o of offices) {
    const t = syna[o.key] as string | null;
    if (t) return { label: `${o.label} (demain)`, time: t, siddourTab: o.tab };
  }

  return null;
}

interface Props {
  onNavigate: (tab: string) => void;
}

const MySynagogueCard = ({ onNavigate }: Props) => {
  const { user } = useAuth();
  const { subIds, loading } = useSubscribedSynaIds();
  const [syna, setSyna] = useState<SynaInfo | null>(null);

  useEffect(() => {
    if (loading || subIds.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("synagogue_profiles")
        .select("id, name, shacharit_time, minha_time, arvit_time, logo_url")
        .eq("id", subIds[0])
        .single();
      if (data) setSyna(data as SynaInfo);
    })();
  }, [subIds, loading]);

  if (loading) return null;

  // No synagogue → show CTA
  if (!syna) {
    return (
      <motion.div
        className="rounded-2xl p-6 mb-5 border border-border bg-card text-center"
        style={{ boxShadow: "var(--shadow-card)" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Horaires, siddour et communauté — tout en un.
        </p>
        <button
          onClick={() => onNavigate("synagogue")}
          className="px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-[0.97] border-none text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          Trouver une synagogue
        </button>
      </motion.div>
    );
  }

  const next = getNextOffice(syna);

  return (
    <motion.div
      className="rounded-2xl p-5 mb-5 border border-border bg-card"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Synagogue name */}
      <button
        onClick={() => onNavigate("synagogue")}
        className="w-full flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 text-left"
      >
        {syna.logo_url ? (
          <img src={syna.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: "hsl(var(--gold) / 0.08)" }}>🏛️</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-medium">Ma synagogue</div>
          <div className="text-base font-bold text-foreground truncate">{syna.name}</div>
        </div>
        <span className="text-muted-foreground text-sm">›</span>
      </button>

      {/* Next office */}
      {next && (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-medium">Prochain office</div>
            <div className="text-sm font-semibold text-foreground mt-0.5">{next.label}</div>
          </div>
          <div className="text-2xl font-extrabold font-display tabular-nums" style={{ color: "hsl(var(--gold-matte))" }}>
            {next.time}
          </div>
        </div>
      )}

      {/* Siddour button */}
      <button
        onClick={() => onNavigate("siddour")}
        className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-[0.97] border border-border bg-card text-foreground hover:bg-muted"
      >
        📖 Ouvrir le Siddour
      </button>
    </motion.div>
  );
};

export default MySynagogueCard;
