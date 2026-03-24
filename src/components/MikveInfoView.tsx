import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import { Droplets, Phone, MapPin, Snowflake, Sun } from "lucide-react";

const MikveInfoView = () => {
  const { subIds, loading: subLoading } = useSubscribedSynaIds();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subLoading || subIds.length === 0) { setLoading(false); return; }
    (async () => {
      const { data: d } = await (supabase
        .from("synagogue_profiles")
        .select("name, mikve_winter_hours, mikve_summer_hours, mikve_phone, mikve_maps_link") as any)
        .eq("id", subIds[0])
        .maybeSingle();
      setData(d);
      setLoading(false);
    })();
  }, [subIds, subLoading]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground text-sm">Aucune information disponible.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Droplets className="w-6 h-6 text-primary" />
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Mikvé</h3>
          <p className="text-xs text-muted-foreground">{data.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {data.mikve_winter_hours && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3" style={{ boxShadow: "var(--shadow-card)" }}>
            <Snowflake className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Horaires Hiver</p>
              <p className="text-sm text-muted-foreground mt-1">{data.mikve_winter_hours}</p>
            </div>
          </div>
        )}
        {data.mikve_summer_hours && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3" style={{ boxShadow: "var(--shadow-card)" }}>
            <Sun className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Horaires Été</p>
              <p className="text-sm text-muted-foreground mt-1">{data.mikve_summer_hours}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {data.mikve_phone && (
          <a
            href={`tel:${data.mikve_phone}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 no-underline transition-all active:scale-95"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Appeler</span>
          </a>
        )}
        {data.mikve_maps_link && (
          <a
            href={data.mikve_maps_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-none p-4 no-underline transition-all active:scale-95"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)", color: "hsl(var(--primary-foreground))" }}
          >
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-bold">Itinéraire</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default MikveInfoView;
