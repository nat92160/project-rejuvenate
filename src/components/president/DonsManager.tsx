import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, Loader2, Check, CreditCard, Download, Copy, Link2, BarChart3, Settings, List, Megaphone, FileCheck, BellRing } from "lucide-react";
import { jsPDF } from "jspdf";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CampaignsManager from "./CampaignsManager";
import DonsStats from "./DonsStats";
import CerfaConfig from "./CerfaConfig";
import DonationReminders from "./DonationReminders";

interface Donation {
  id: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  donor_address: string;
  cerfa_generated: boolean;
  created_at: string;
}

const DonsManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [synagogueName, setSynagogueName] = useState("");
  const [synagogueAddress, setSynagogueAddress] = useState("");
  const [cerfaInfo, setCerfaInfo] = useState<{ legalName: string; rna: string; siret: string; article: string; presidentName: string; signature: string }>({ legalName: "", rna: "", siret: "", article: "200", presidentName: "", signature: "" });

  // Stripe Connect state
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [stripeExists, setStripeExists] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [donationSlug, setDonationSlug] = useState("");

  // Donations list
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  // Legacy donation link
  const [donationLink, setDonationLink] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase
        .from("synagogue_profiles")
        .select("id, name, address, donation_link") as any)
        .eq("president_id", user.id)
        .maybeSingle();
      if (data) {
        setProfileId(data.id);
        setSynagogueName(data.name || "");
        setSynagogueAddress(data.address || "");
        setDonationLink(data.donation_link || "");
        // Check Stripe onboarding
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
    // Get slug
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
      .select("id, amount, donor_name, donor_email, donor_address, cerfa_generated, created_at") as any)
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

  const donationUrl = donationSlug
    ? `${window.location.origin}/don/${donationSlug}`
    : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(donationUrl);
    toast.success("Lien copié !");
  };

  const generateCerfa = (donation: Donation) => {
    const doc = new jsPDF();
    const d = new Date(donation.created_at);
    const fiscalYear = d.getFullYear();
    const cerfaNum = donation.id.slice(0, 8).toUpperCase();
    const legalName = cerfaInfo.legalName || synagogueName;

    doc.setFontSize(16);
    doc.text("REÇU AU TITRE DES DONS", 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.text("à certains organismes d'intérêt général — Cerfa n° 11580*04", 105, 28, { align: "center" });
    doc.text(`Article ${cerfaInfo.article} du Code Général des Impôts`, 105, 33, { align: "center" });

    doc.setFontSize(9);
    doc.setDrawColor(200);
    doc.rect(20, 38, 170, 8);
    doc.text(`Reçu N° ${cerfaNum}`, 25, 43.5);
    doc.text(`Année fiscale ${fiscalYear}`, 95, 43.5);
    doc.text(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, 145, 43.5);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("BÉNÉFICIAIRE DES VERSEMENTS", 20, 56);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(legalName, 20, 63);
    doc.setFontSize(9);
    doc.text(`Adresse : ${synagogueAddress || "—"}`, 20, 70);
    doc.text("Objet : Exercice du culte", 20, 76);
    if (cerfaInfo.rna) doc.text(`N° RNA : ${cerfaInfo.rna}`, 20, 82);
    if (cerfaInfo.siret) doc.text(`N° SIRET : ${cerfaInfo.siret}`, 110, 82);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("DONATEUR", 20, 95);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(donation.donor_name || "—", 20, 102);
    doc.setFontSize(9);
    doc.text(`Adresse : ${donation.donor_address || "—"}`, 20, 109);
    doc.text(`Courriel : ${donation.donor_email}`, 20, 115);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("DON EFFECTUÉ", 20, 128);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Date du versement : ${d.toLocaleDateString("fr-FR")}`, 20, 135);
    doc.setFont(undefined, "bold");
    doc.text(`Montant : ${(donation.amount / 100).toFixed(2)} €`, 20, 142);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text("Forme du don : Déclaration de don manuel", 20, 149);
    doc.text("Nature : Numéraire — Mode : Carte bancaire (paiement sécurisé en ligne)", 20, 155);

    doc.setFontSize(8);
    doc.setFont(undefined, "italic");
    const mention = `Le bénéficiaire reconnaît, conformément à l'article ${cerfaInfo.article} du CGI, que les dons et versements qu'il reçoit ouvrent droit à une réduction d'impôt${cerfaInfo.article.includes("200") ? " égale à 66% de leur montant pour les particuliers (dans la limite de 20% du revenu imposable)" : ""}.`;
    const splitMention = doc.splitTextToSize(mention, 170);
    doc.text(splitMention, 20, 170);

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    const city = synagogueAddress ? synagogueAddress.split(",").pop()?.trim() : "—";
    doc.text(`Fait à ${city}, le ${new Date().toLocaleDateString("fr-FR")}`, 20, 195);
    if (cerfaInfo.presidentName) {
      doc.setFont(undefined, "bold");
      doc.text(`Le Président : ${cerfaInfo.presidentName}`, 20, 203);
      doc.setFont(undefined, "normal");
    }
    if (cerfaInfo.signature) {
      doc.setFont(undefined, "italic");
      doc.setFontSize(8);
      doc.text(cerfaInfo.signature, 20, 210);
    }

    doc.setFont(undefined, "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text("Reçu établi conformément aux dispositions des articles 200 et 238 bis du CGI et à l'arrêté du 1er décembre 2003.", 20, 280);
    doc.text(`Réf. interne : ${donation.id}`, 20, 285);

    doc.save(`cerfa-${fiscalYear}-${cerfaNum}.pdf`);
  };

  const exportCsv = () => {
    if (!donations.length) return;
    const header = "Date,Donateur,Email,Montant (€),CERFA\n";
    const rows = donations.map((d) =>
      `${new Date(d.created_at).toLocaleDateString("fr-FR")},"${d.donor_name}","${d.donor_email}",${(d.amount / 100).toFixed(2)},${d.cerfa_generated ? "Oui" : "Non"}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dons-${synagogueName || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Chargement…</div>;
  if (!profileId) return <div className="text-center py-8 text-muted-foreground text-sm">Créez d'abord votre profil synagogue.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Heart className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Module Dons</h3>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1">
          <TabsTrigger value="stats" className="text-[10px] py-1.5 gap-1">
            <BarChart3 className="w-3.5 h-3.5" /> Stats
          </TabsTrigger>
          <TabsTrigger value="campagnes" className="text-[10px] py-1.5 gap-1">
            <Megaphone className="w-3.5 h-3.5" /> Camp.
          </TabsTrigger>
          <TabsTrigger value="historique" className="text-[10px] py-1.5 gap-1">
            <List className="w-3.5 h-3.5" /> Dons
          </TabsTrigger>
          <TabsTrigger value="cerfa" className="text-[10px] py-1.5 gap-1">
            <FileCheck className="w-3.5 h-3.5" /> CERFA
          </TabsTrigger>
          <TabsTrigger value="config" className="text-[10px] py-1.5 gap-1">
            <Settings className="w-3.5 h-3.5" /> Stripe
          </TabsTrigger>
        </TabsList>

        {/* Stats tab */}
        <TabsContent value="stats" className="mt-4">
          {!stripeOnboarded ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Configurez Stripe (onglet Config) pour activer les statistiques.</p>
            </div>
          ) : (
            <DonsStats synagogueId={profileId} />
          )}
        </TabsContent>

        {/* Campagnes tab */}
        <TabsContent value="campagnes" className="mt-4">
          {!stripeOnboarded ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Configurez Stripe (onglet Config) avant de créer des campagnes.</p>
            </div>
          ) : (
            <CampaignsManager synagogueId={profileId} />
          )}
        </TabsContent>

        {/* Historique tab */}
        <TabsContent value="historique" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Historique des dons</Label>
              {donations.length > 0 && (
                <Button variant="ghost" size="sm" onClick={exportCsv} className="text-xs h-7">
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              )}
            </div>

            {loadingDonations ? (
              <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
            ) : donations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun don reçu pour le moment.</p>
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
                        <td className="py-2 pr-2 max-w-[100px] truncate">{d.donor_name || d.donor_email}</td>
                        <td className="py-2 pr-2 font-semibold">{(d.amount / 100).toFixed(2)} €</td>
                        <td className="py-2">
                          <button
                            onClick={() => generateCerfa(d)}
                            className="text-primary hover:underline cursor-pointer bg-transparent border-none text-xs"
                          >
                            📄 Télécharger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* CERFA tab */}
        <TabsContent value="cerfa" className="mt-4">
          <CerfaConfig synagogueId={profileId} />
        </TabsContent>

        {/* Config tab */}
        <TabsContent value="config" className="mt-4 space-y-4">
          {/* Stripe Connect Setup */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <Label className="text-xs font-semibold">Configuration Stripe Connect</Label>
            </div>

            {stripeOnboarded ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                <Check className="w-4 h-4" />
                <span className="text-xs font-semibold">Paiements activés ✓</span>
              </div>
            ) : stripeExists ? (
              <div className="space-y-2">
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                  ⏳ L'onboarding Stripe n'est pas terminé. Cliquez ci-dessous pour le compléter.
                </p>
                <Button onClick={handleStripeOnboard} disabled={onboarding} variant="outline" className="w-full">
                  {onboarding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
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
                  {onboarding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Configurer mes paiements (Stripe)
                </Button>
              </div>
            )}
          </div>

          {/* Donation Link - Create */}
          {stripeOnboarded && !donationSlug && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
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
                  {savingSlug ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}
                </Button>
              </div>
            </div>
          )}

          {/* Donation Link - Display */}
          {donationSlug && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <Label className="text-xs font-semibold">Lien de don unique</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input value={donationUrl} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={copyUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={donationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Voir la page
                </a>
                <button
                  onClick={() => {
                    const text = `🕍 ${synagogueName} — Faire un don\n\n💛 Soutenez notre communauté en faisant un don sécurisé :\n${donationUrl}\n\nMerci pour votre générosité !`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:underline bg-transparent border-none cursor-pointer"
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
