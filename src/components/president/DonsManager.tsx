import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, Loader2, Check, CreditCard, Download, Copy, Link2 } from "lucide-react";
import { jsPDF } from "jspdf";

interface Donation {
  id: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  cerfa_generated: boolean;
  created_at: string;
}

const DonsManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [synagogueName, setSynagogueName] = useState("");
  const [synagogueAddress, setSynagogueAddress] = useState("");

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
      .select("id, amount, donor_name, donor_email, cerfa_generated, created_at") as any)
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

    doc.setFontSize(18);
    doc.text("REÇU FISCAL - DON", 105, 25, { align: "center" });

    doc.setFontSize(10);
    doc.text("Cerfa n° 11580*04", 105, 32, { align: "center" });

    doc.setFontSize(12);
    doc.text("ORGANISME BÉNÉFICIAIRE", 20, 50);
    doc.setFontSize(10);
    doc.text(`Nom : ${synagogueName}`, 20, 58);
    doc.text(`Adresse : ${synagogueAddress || "—"}`, 20, 65);

    doc.setFontSize(12);
    doc.text("DONATEUR", 20, 85);
    doc.setFontSize(10);
    doc.text(`Nom : ${donation.donor_name || "—"}`, 20, 93);
    doc.text(`Email : ${donation.donor_email}`, 20, 100);

    doc.setFontSize(12);
    doc.text("INFORMATIONS DU DON", 20, 120);
    doc.setFontSize(10);
    doc.text(`Date du don : ${d.toLocaleDateString("fr-FR")}`, 20, 128);
    doc.text(`Montant : ${(donation.amount / 100).toFixed(2)} €`, 20, 135);
    doc.text("Mode de versement : Paiement en ligne (Carte bancaire)", 20, 142);
    doc.text("Nature du don : Numéraire", 20, 149);

    doc.setFontSize(9);
    doc.text(
      "Le bénéficiaire certifie sur l'honneur que les dons et versements qu'il reçoit",
      20, 170
    );
    doc.text(
      "ouvrent droit à la réduction d'impôt prévue à l'article 200 du CGI.",
      20, 177
    );

    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 20, 200);
    doc.text(`Signature : ${synagogueName}`, 20, 210);

    doc.save(`cerfa-don-${d.toISOString().split("T")[0]}-${donation.id.slice(0, 8)}.pdf`);
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
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Heart className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Module Dons</h3>
      </div>

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

      {/* Donation Link - Create or Display */}
      {stripeOnboarded && !donationSlug && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <Label className="text-xs font-semibold">Créer votre lien de don</Label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Choisissez un identifiant court pour votre page de don (ex: beth-yaakov, synagogue-paris).
            Il sera utilisé dans l'URL : {window.location.origin}/don/<strong>votre-slug</strong>
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

      {/* Donations Table */}
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
    </div>
  );
};

export default DonsManager;
