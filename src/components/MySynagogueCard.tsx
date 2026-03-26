import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import { useCity } from "@/hooks/useCity";
import { MapPin, ChevronRight } from "lucide-react";

interface SynaInfo {
  id: string;
  name: string;
  shacharit_time: string | null;
  minha_time: string | null;
  arvit_time: string | null;
}

type NextOffice = { label: string; time: string };

function getNextOffice(syna: SynaInfo): NextOffice | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const offices: { key: keyof SynaInfo; label: string }[] = [
    { key: "shacharit_time", label: "Cha'harit" },
    { key: "minha_time", label: "Min'ha" },
    { key: "arvit_time", label: "Arvit" },
  ];

  for (const o of offices) {
    const t = syna[o.key] as string | null;
    if (t && t > hhmm) return { label: o.label, time: t };
  }

  for (const o of offices) {
    const t = syna[o.key] as string | null;
    if (t) return { label: `${o.label} (demain)`, time: t };
  }

  return null;
}

/** Returns the current prayer name based on time of day */
export function getCurrentPrayer(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Cha'harit";
  if (hour >= 12 && hour < 18) return "Min'ha";
  return "Arvit";
}

interface Props {
  onNavigate: (tab: string) => void;
}

const MySynagogueCard = ({ onNavigate }: Props) => {
  const { user } = useAuth();
  const { subIds, loading } = useSubscribedSynaIds();
  const { city } = useCity();
  const [syna, setSyna] = useState<SynaInfo | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);

  useEffect(() => {
    if (loading || subIds.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("synagogue_profiles")
        .select("id, name, shacharit_time, minha_time, arvit_time")
        .eq("id", subIds[0])
        .single();
      if (data) setSyna(data as SynaInfo);
    })();
  }, [subIds, loading]);

  // Fetch nearby synagogue count when no subscription
  useEffect(() => {
    if (loading || subIds.length > 0) return;
    if (!city?.lat || !city?.lng) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("nearby-synagogues", {
          body: { lat: city.lat, lon: city.lng },
        });
        if (data?.results) setNearbyCount(data.results.length);
      } catch { /* ignore */ }
    })();
  }, [loading, subIds, city?.lat, city?.lng]);

  if (loading) return null;

  // No synagogue → engagement CTA
  if (!syna) {
    return (
      <motion.div
        className="rounded-3xl mb-6 overflow-hidden cursor-pointer"
        style={{ boxShadow: "var(--shadow-elevated)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => onNavigate("chooser")}
      >
        <div
          className="p-8 text-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--card)))",
          }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))",
            }}
          >
            <MapPin className="w-7 h-7" style={{ color: "hsl(var(--gold-matte))" }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            Ne manquez plus aucun office
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[280px] mx-auto leading-relaxed">
            {nearbyCount && nearbyCount > 0
              ? `${nearbyCount} synagogues proches de vous`
              : "Recevez les horaires de votre communauté"}
          </p>
          <div
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold text-primary-foreground"
            style={{
              background: "var(--gradient-gold)",
              boxShadow: "var(--shadow-gold)",
            }}
          >
            Choisir ma Synagogue
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    );
  }

  const next = getNextOffice(syna);

  return (
    <motion.div
      className="rounded-3xl mb-6 overflow-hidden border border-border bg-card"
      style={{ boxShadow: "var(--shadow-elevated)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Synagogue identity */}
      <button
        onClick={() => onNavigate("synagogue")}
        className="w-full flex items-center gap-4 bg-transparent border-none cursor-pointer p-5 pb-0 text-left group"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--gold) / 0.04))",
          }}
        >
          🏛️
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-[2px] text-muted-foreground/70 font-medium mb-0.5">
            Ma synagogue
          </div>
          <div className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {syna.name}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
      </button>

      {/* Next office — hero display */}
      {next && (
        <div
          className="mx-5 my-4 p-4 rounded-2xl flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))",
          }}
        >
          <div>
            <div className="text-[9px] uppercase tracking-[2px] text-muted-foreground/60 font-medium">
              Prochain office
            </div>
            <div className="text-sm font-semibold text-foreground mt-1">{next.label}</div>
          </div>
          <div
            className="text-3xl font-extrabold font-display tabular-nums"
            style={{ color: "hsl(var(--gold-matte))" }}
          >
            {next.time}
          </div>
        </div>
      )}

      {/* Prayer times summary */}
      <div className="flex divide-x divide-border border-t border-border">
        {[
          { label: "Cha'harit", time: syna.shacharit_time },
          { label: "Min'ha", time: syna.minha_time },
          { label: "Arvit", time: syna.arvit_time },
        ]
          .filter((o) => o.time)
          .map((o) => (
            <div key={o.label} className="flex-1 text-center py-3">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                {o.label}
              </div>
              <div className="text-sm font-bold text-foreground mt-0.5">{o.time}</div>
            </div>
          ))}
      </div>
    </motion.div>
  );
};

export default MySynagogueCard;
