import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Donation {
  id: string;
  amount: number;
  created_at: string;
  fiscal_year: number;
  cerfa_number: string | null;
  cerfa_url: string | null;
  cerfa_token: string | null;
  synagogue_id: string;
  campaign_id: string | null;
  donor_email: string;
  synagogue_name?: string;
  campaign_title?: string;
}

const formatEUR = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export const MyDonations = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      // Récupère les dons par user_id OU par email (pour les dons faits avant connexion)
      const { data: donationsData, error } = await supabase
        .from("donations")
        .select("*")
        .or(`donor_user_id.eq.${user.id},donor_email.eq.${user.email}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement dons:", error);
        setLoading(false);
        return;
      }

      const list = (donationsData || []) as any[];

      // Enrichit avec les noms de synagogues et campagnes
      const synaIds = [...new Set(list.map((d) => d.synagogue_id).filter(Boolean))];
      const campIds = [...new Set(list.map((d) => d.campaign_id).filter(Boolean))];

      const [synasRes, campsRes] = await Promise.all([
        synaIds.length
          ? supabase.from("synagogue_profiles").select("id, name").in("id", synaIds)
          : Promise.resolve({ data: [] as any[] }),
        campIds.length
          ? supabase.from("donation_campaigns").select("id, title").in("id", campIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const synaMap = new Map((synasRes.data || []).map((s: any) => [s.id, s.name]));
      const campMap = new Map((campsRes.data || []).map((c: any) => [c.id, c.title]));

      setDonations(
        list.map((d) => ({
          ...d,
          synagogue_name: synaMap.get(d.synagogue_id) || "Synagogue",
          campaign_title: d.campaign_id ? campMap.get(d.campaign_id) : undefined,
        })),
      );
      setLoading(false);
    })();
  }, [user]);

  const handleDownloadCerfa = async (donation: Donation) => {
    if (donation.cerfa_url) {
      window.open(donation.cerfa_url, "_blank");
      return;
    }
    toast.info("Génération du reçu CERFA...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-cerfa", {
        body: { donation_id: donation.id, token: donation.cerfa_token },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error("Reçu indisponible");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur génération reçu");
    }
  };

  if (!user) return null;

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  const currentYear = new Date().getFullYear();
  const yearAmount = donations
    .filter((d) => d.fiscal_year === currentYear)
    .reduce((sum, d) => sum + d.amount, 0);

  const visibleDonations = expanded ? donations : donations.slice(0, 3);

  return (
    <div
      className="rounded-2xl bg-card p-4 border border-border space-y-3"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
          💝 Mes Dons
        </h4>
        {donations.length > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              background: "hsl(var(--gold) / 0.15)",
              color: "hsl(var(--gold-matte))",
            }}
          >
            {donations.length} don{donations.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Chargement...</p>
      ) : donations.length === 0 ? (
        <div className="text-center py-6">
          <span className="text-3xl">🤲</span>
          <p className="text-xs text-muted-foreground mt-2">
            Aucun don enregistré pour le moment.
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Vos dons apparaîtront ici avec leur reçu CERFA.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-xl p-3 border border-primary/15"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))",
              }}
            >
              <p className="text-[10px] text-muted-foreground font-semibold">
                Total {currentYear}
              </p>
              <p
                className="text-lg font-display font-bold"
                style={{ color: "hsl(var(--gold-matte))" }}
              >
                {formatEUR(yearAmount)}
              </p>
            </div>
            <div className="rounded-xl p-3 bg-muted/40">
              <p className="text-[10px] text-muted-foreground font-semibold">Total cumulé</p>
              <p className="text-lg font-display font-bold text-foreground">
                {formatEUR(totalAmount)}
              </p>
            </div>
          </div>

          {/* Liste */}
          <div className="space-y-2">
            {visibleDonations.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl bg-muted/30 p-3 border border-border/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-display font-bold"
                      style={{ color: "hsl(var(--gold-matte))" }}
                    >
                      {formatEUR(d.amount)}
                    </p>
                    <p className="text-[11px] text-foreground font-semibold truncate mt-0.5">
                      🏛️ {d.synagogue_name}
                    </p>
                    {d.campaign_title && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        🎯 {d.campaign_title}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      📅 {formatDate(d.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadCerfa(d)}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border-none cursor-pointer text-primary-foreground shrink-0"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    📄 CERFA
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {donations.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-[11px] font-bold text-primary py-2 border-none bg-transparent cursor-pointer"
            >
              {expanded ? "▲ Voir moins" : `▼ Voir tous les dons (${donations.length})`}
            </button>
          )}

          <p className="text-[9px] text-muted-foreground/70 text-center italic pt-1">
            Les reçus CERFA permettent une réduction d'impôt de 66% (article 200 du CGI)
          </p>
        </>
      )}
    </div>
  );
};
