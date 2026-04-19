import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Loader2,
  Download,
  BarChart3,
  List,
  Megaphone,
  FileCheck,
  BellRing,
  Share2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CampaignsManager from "./CampaignsManager";
import DonsStats from "./DonsStats";
import CerfaConfig from "./CerfaConfig";
import DonationReminders from "./DonationReminders";
import { shareCerfaPdf, downloadCerfaPdf } from "@/lib/cerfaPdf";

interface Donation {
  id: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  donor_address: string;
  cerfa_generated: boolean;
  created_at: string;
  cerfa_token?: string | null;
}

const DonsManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [synagogueName, setSynagogueName] = useState("");
  const [synagogueAddress, setSynagogueAddress] = useState("");
  const [cerfaInfo, setCerfaInfo] = useState<{
    legalName: string;
    rna: string;
    siret: string;
    article: string;
    presidentName: string;
    signature: string;
  }>({ legalName: "", rna: "", siret: "", article: "200", presidentName: "", signature: "" });

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      let { data: rows } = await (supabase
        .from("synagogue_profiles")
        .select(
          "id, name, address, association_legal_name, rna_number, siret_number, article_cgi, president_first_name, president_last_name, signature",
        ) as any)
        .eq("president_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!rows || rows.length === 0) {
        const res = await (supabase
          .from("synagogue_profiles")
          .select(
            "id, name, address, association_legal_name, rna_number, siret_number, article_cgi, president_first_name, president_last_name, signature",
          ) as any)
          .eq("adjoint_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);
        rows = res.data;
      }

      const data = rows && rows[0];
      if (data) {
        setProfileId(data.id);
        setSynagogueName(data.name || "");
        setSynagogueAddress(data.address || "");
        setCerfaInfo({
          legalName: data.association_legal_name || "",
          rna: data.rna_number || "",
          siret: data.siret_number || "",
          article: data.article_cgi || "200",
          presidentName: `${data.president_first_name || ""} ${data.president_last_name || ""}`.trim(),
          signature: data.signature || "",
        });
        loadDonations(data.id);
      }

      setLoading(false);
    })();
  }, [user]);

  const loadDonations = async (synaId: string) => {
    setLoadingDonations(true);
    const { data } = await (supabase
      .from("donations" as any)
      .select(
        "id, amount, donor_name, donor_email, donor_address, cerfa_generated, cerfa_token, created_at",
      ) as any)
      .eq("synagogue_id", synaId)
      .order("created_at", { ascending: false })
      .limit(100);

    setDonations((data as Donation[]) || []);
    setLoadingDonations(false);
  };

  const cerfaConfigured = !!(
    (cerfaInfo.legalName || synagogueName) &&
    synagogueAddress &&
    (cerfaInfo.rna || cerfaInfo.siret) &&
    cerfaInfo.presidentName
  );

  const openOfficialCerfa = (donation: Donation) => {
    if (!cerfaConfigured) {
      toast.error(
        "Veuillez configurer les informations légales (onglet CERFA) avant d'émettre des reçus.",
      );
      return;
    }
    if (!donation.cerfa_token) {
      toast.error("Reçu indisponible (token manquant).");
      return;
    }
    window.location.assign(`/cerfa/${encodeURIComponent(donation.cerfa_token)}`);
  };

  const downloadCerfa = async (donation: Donation) => {
    if (!cerfaConfigured) {
      toast.error("Configurez d'abord l'onglet CERFA.");
      return;
    }
    if (!donation.cerfa_token) {
      toast.error("Reçu indisponible (token manquant).");
      return;
    }
    await downloadCerfaPdf(donation.cerfa_token);
  };

  const shareCerfa = async (donation: Donation) => {
    if (!cerfaConfigured) {
      toast.error("Configurez d'abord l'onglet CERFA.");
      return;
    }
    if (!donation.cerfa_token) {
      toast.error("Reçu indisponible (token manquant).");
      return;
    }
    await shareCerfaPdf(donation.cerfa_token);
  };

  const exportCsv = () => {
    if (!donations.length) return;
    const header = "Date,Donateur,Email,Montant (€),CERFA\n";
    const rows = donations
      .map(
        (d) =>
          `${new Date(d.created_at).toLocaleDateString("fr-FR")},"${d.donor_name}","${d.donor_email}",${(d.amount / 100).toFixed(2)},${d.cerfa_generated ? "Oui" : "Non"}`,
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dons-${synagogueName || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading)
    return <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>;
  if (!profileId)
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Créez d'abord votre profil synagogue.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center gap-3">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Module Dons</h3>
      </div>

      <Tabs defaultValue="historique" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-5 p-1">
          <TabsTrigger value="historique" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <List className="h-3.5 w-3.5" /> Dons
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <BarChart3 className="h-3.5 w-3.5" /> Stats
          </TabsTrigger>
          <TabsTrigger value="campagnes" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <Megaphone className="h-3.5 w-3.5" /> Camp.
          </TabsTrigger>
          <TabsTrigger value="relances" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <BellRing className="h-3.5 w-3.5" /> Relan.
          </TabsTrigger>
          <TabsTrigger value="cerfa" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <FileCheck className="h-3.5 w-3.5" /> CERFA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historique" className="mt-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Historique des dons</Label>
              {donations.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={exportCsv} className="h-7 text-xs">
                  <Download className="mr-1 h-3 w-3" /> CSV
                </Button>
              )}
            </div>

            {loadingDonations ? (
              <div className="py-4 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </div>
            ) : donations.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Aucun don reçu pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {donations.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-border/60 bg-background p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">
                          {d.donor_name || d.donor_email}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {d.donor_email}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(d.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-bold text-primary">
                        {(d.amount / 100).toFixed(2)} €
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openOfficialCerfa(d)}
                        disabled={!d.cerfa_token}
                        className="h-7 text-[10px]"
                      >
                        👁️ Aperçu
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCerfa(d)}
                        disabled={!d.cerfa_token}
                        className="h-7 text-[10px]"
                      >
                        <Download className="mr-1 h-3 w-3" /> Télécharger
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => shareCerfa(d)}
                        disabled={!d.cerfa_token}
                        className="h-7 text-[10px]"
                      >
                        <Share2 className="mr-1 h-3 w-3" /> Partager
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <DonsStats synagogueId={profileId} />
        </TabsContent>

        <TabsContent value="campagnes" className="mt-4">
          <CampaignsManager synagogueId={profileId} />
        </TabsContent>

        <TabsContent value="relances" className="mt-4">
          <DonationReminders synagogueId={profileId} synagogueName={synagogueName} />
        </TabsContent>

        <TabsContent value="cerfa" className="mt-4">
          <CerfaConfig synagogueId={profileId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DonsManager;
