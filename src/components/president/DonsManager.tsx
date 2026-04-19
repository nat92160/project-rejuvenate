import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, Loader2, Check, CreditCard, Download, Copy, Link2, BarChart3, Settings, List, Megaphone, FileCheck, BellRing, Share2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CampaignsManager from "./CampaignsManager";
import DonsStats from "./DonsStats";
import CerfaConfig from "./CerfaConfig";
import DonationReminders from "./DonationReminders";
import { shareCerfaPdf } from "@/lib/cerfaPdf";

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
  const [cerfaInfo, setCerfaInfo] = useState<{ legalName: string; rna: string; siret: string; article: string; presidentName: string; signature: string }>({ legalName: "", rna: "", siret: "", article: "200", presidentName: "", signature: "" });

  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [stripeExists, setStripeExists] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [donationSlug, setDonationSlug] = useState("");

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  const [donationLink, setDonationLink] = useState("");

  useEffect(() => {
    if (!user) return;

    (async () => {
      let { data: rows } = await (supabase
        .from("synagogue_profiles")
        .select("id, name, address, donation_link, association_legal_name, rna_number, siret_number, article_cgi, president_first_name, president_last_name, signature") as any)
        .eq("president_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!rows || rows.length === 0) {
        const res = await (supabase
          .from("synagogue_profiles")
          .select("id, name, address, donation_link, association_legal_name, rna_number, siret_number, article_cgi, president_first_name, president_last_name, signature") as any)
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
        setDonationLink(data.donation_link || "");
        setCerfaInfo({
          legalName: data.association_legal_name || "",
          rna: data.rna_number || "",
          siret: data.siret_number || "",
          article: data.article_cgi || "200",
          presidentName: `${data.president_first_name || ""} ${data.president_last_name || ""}`.trim(),
          signature: data.signature || "",
        });
        checkStripeStatus(data.id);
        loadDonations(data.id);
      }

      setLoading(false);
    })();
  }, [user]);

  const checkStripeStatus = async (synaId: string) => {
    const { data } = await supabase.functions.invoke("check-stripe-onboard", {
      body: { synagogue_id: synaId },
    });

    if (data) {
      setStripeOnboarded(data.onboarded || false);
      setStripeExists(data.exists || false);
    }

    const { data: sa } = await (supabase
      .from("synagogue_stripe_accounts" as any)
      .select("custom_donation_slug") as any)
      .eq("synagogue_id", synaId)
      .maybeSingle();

    if (sa?.custom_donation_slug) {
      setDonationSlug(sa.custom_donation_slug);
    }
  };

  const loadDonations = async (synaId: string) => {
    setLoadingDonations(true);
    const { data } = await (supabase
      .from("donations" as any)
      .select("id, amount, donor_name, donor_email, donor_address, cerfa_generated, cerfa_token, created_at") as any)
      .eq("synagogue_id", synaId)
      .order("created_at", { ascending: false })
      .limit(100);

    setDonations((data as Donation[]) || []);
    setLoadingDonations(false);
  };

  const handleStripeOnboard = async () => {
    if (!profileId) return;

    setOnboarding(true);
    const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
      body: {
        synagogue_id: profileId,
        return_url: window.location.origin,
      },
    });
    setOnboarding(false);

    if (error || data?.error) {
      toast.error(data?.error || "Erreur Stripe");
      return;
    }

    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const donationUrl = donationSlug ? `${window.location.origin}/don/${donationSlug}` : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(donationUrl);
    toast.success("Lien copié !");
  };

  const cerfaConfigured = !!((cerfaInfo.legalName || synagogueName) && synagogueAddress && (cerfaInfo.rna || cerfaInfo.siret) && cerfaInfo.presidentName);

  const openOfficialCerfa = async (donation: Donation) => {
    if (!cerfaConfigured) {
      toast.error("Veuillez configurer les informations légales de votre association dans l'onglet CERFA avant de pouvoir émettre des reçus fiscaux.");
      return;
    }
    if (!donation.cerfa_token) {
      toast.error("Reçu indisponible (token manquant).");
      return;
    }

    window.location.assign(`/cerfa/${encodeURIComponent(donation.cerfa_token)}`);
  };

  const shareCerfa = async (donation: Donation) => {
    if (!cerfaConfigured) {
      toast.error("Configurez d'abord les informations légales (onglet CERFA).");
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
    const rows = donations.map((d) =>
      `${new Date(d.created_at).toLocaleDateString("fr-FR")},"${d.donor_name}","${d.donor_email}",${(d.amount / 100).toFixed(2)},${d.cerfa_generated ? "Oui" : "Non"}`,
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dons-${synagogueName || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>;
  if (!profileId) return <div className="py-8 text-center text-sm text-muted-foreground">Créez d'abord votre profil synagogue.</div>;

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center gap-3">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Module Dons</h3>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-6 p-1">
          <TabsTrigger value="stats" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <BarChart3 className="h-3.5 w-3.5" /> Stats
          </TabsTrigger>
          <TabsTrigger value="campagnes" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <Megaphone className="h-3.5 w-3.5" /> Camp.
          </TabsTrigger>
          <TabsTrigger value="historique" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <List className="h-3.5 w-3.5" /> Dons
          </TabsTrigger>
          <TabsTrigger value="relances" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <BellRing className="h-3.5 w-3.5" /> Relan.
          </TabsTrigger>
          <TabsTrigger value="cerfa" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <FileCheck className="h-3.5 w-3.5" /> CERFA
          </TabsTrigger>
          <TabsTrigger value="config" className="flex flex-col gap-0.5 py-1.5 text-[10px]">
            <Settings className="h-3.5 w-3.5" /> Stripe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4">
          {!stripeOnboarded ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Configurez Stripe (onglet Config) pour activer les statistiques.</p>
            </div>
          ) : (
            <DonsStats synagogueId={profileId} />
          )}
        </TabsContent>

        <TabsContent value="campagnes" className="mt-4">
          {!stripeOnboarded ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Configurez Stripe (onglet Config) avant de créer des campagnes.</p>
            </div>
          ) : (
            <CampaignsManager synagogueId={profileId} />
          )}
        </TabsContent>

        <TabsContent value="historique" className="mt-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Historique des dons</Label>
              {donations.length > 0 && (
                <Button variant="ghost" size="sm" onClick={exportCsv} className="h-7 text-xs">
                  <Download className="mr-1 h-3 w-3" /> CSV
                </Button>
              )}
            </div>

            {loadingDonations ? (
              <div className="py-4 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
            ) : donations.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Aucun don reçu pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-2">Date</th>
                      <th className="pb-2 pr-2">Donateur</th>
                      <th className="pb-2 pr-2">Montant</th>
                      <th className="pb-2">CERFA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id} className="border-b border-border/50">
                        <td className="py-2 pr-2">{new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
                        <td className="max-w-[100px] truncate py-2 pr-2">{d.donor_name || d.donor_email}</td>
                        <td className="py-2 pr-2 font-semibold">{(d.amount / 100).toFixed(2)} €</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openOfficialCerfa(d)}
                              disabled={!cerfaConfigured}
                              className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                              title={cerfaConfigured ? "Télécharger / ouvrir le reçu CERFA" : "Configurez d'abord l'onglet CERFA"}
                            >
                              <Download className="h-3 w-3" /> CERFA
                            </button>
                            <button
                              onClick={() => shareCerfa(d)}
                              disabled={!cerfaConfigured || !d.cerfa_token}
                              className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                              title="Partager le CERFA en PDF"
                            >
                              <Share2 className="h-3 w-3" /> Partager
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="relances" className="mt-4">
          {!stripeOnboarded ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Configurez Stripe (onglet Stripe) avant d'envoyer des relances.</p>
            </div>
          ) : (
            <DonationReminders synagogueId={profileId} synagogueName={synagogueName} />
          )}
        </TabsContent>

        <TabsContent value="cerfa" className="mt-4">
          <CerfaConfig synagogueId={profileId} />
        </TabsContent>

        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold">Configuration Stripe Connect</Label>
            </div>

            {stripeOnboarded ? (
              <div className="rounded-lg border border-border bg-secondary p-3 text-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Paiements activés ✓</span>
                </div>
              </div>
            ) : stripeExists ? (
              <div className="space-y-2">
                <p className="rounded-lg border border-border bg-secondary p-3 text-xs text-muted-foreground">
                  ⏳ L'onboarding Stripe n'est pas terminé. Cliquez ci-dessous pour le compléter.
                </p>
                <Button onClick={handleStripeOnboard} disabled={onboarding} variant="outline" className="w-full">
                  {onboarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Compléter la configuration Stripe
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Connectez votre compte bancaire via Stripe pour recevoir les dons directement.
                  Une commission de 4% est prélevée automatiquement.
                </p>
                <Button onClick={handleStripeOnboard} disabled={onboarding} className="w-full">
                  {onboarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Configurer mes paiements (Stripe)
                </Button>
              </div>
            )}
          </div>

          {stripeOnboarded && !donationSlug && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <Label className="text-xs font-semibold">Créer votre lien de don</Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Choisissez un identifiant court pour votre page de don (ex: beth-yaakov, synagogue-paris).
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
                  placeholder="mon-synagogue"
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!newSlug.trim() || newSlug.length < 3) {
                      toast.error("Le slug doit faire au moins 3 caractères");
                      return;
                    }
                    setSavingSlug(true);
                    const { error } = await (supabase
                      .from("synagogue_stripe_accounts" as any)
                      .update({ custom_donation_slug: newSlug.trim() }) as any)
                      .eq("synagogue_id", profileId);
                    setSavingSlug(false);
                    if (error) {
                      toast.error("Erreur : ce slug est peut-être déjà pris");
                    } else {
                      setDonationSlug(newSlug.trim());
                      toast.success("Lien de don créé !");
                    }
                  }}
                  disabled={savingSlug || !newSlug.trim()}
                >
                  {savingSlug ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
                </Button>
              </div>
            </div>
          )}

          {donationSlug && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <Label className="text-xs font-semibold">Lien de don unique</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input value={donationUrl} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={copyUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={donationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Voir la page
                </a>
                <button
                  onClick={() => {
                    const text = `🕍 ${synagogueName} — Faire un don\n\n💛 Soutenez notre communauté en faisant un don sécurisé :\n${donationUrl}\n\nMerci pour votre générosité !`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs font-semibold text-primary hover:underline"
                >
                  📱 Partager sur WhatsApp
                </button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DonsManager;
