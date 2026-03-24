import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUGGESTED_AMOUNTS = [1800, 3600, 5200, 10000]; // in cents

const DonationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [synagogue, setSynagogue] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [stripeReady, setStripeReady] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState(3600);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorAddress, setDonorAddress] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorPostal, setDonorPostal] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // Look up stripe account by slug
      const { data: sa } = await supabase
        .from("synagogue_stripe_accounts" as any)
        .select("synagogue_id, is_onboarded")
        .eq("custom_donation_slug", slug)
        .maybeSingle();

      if (!sa) {
        setLoading(false);
        return;
      }

      setStripeReady((sa as any).is_onboarded);

      // Get synagogue info
      const { data: profile } = await supabase
        .from("synagogue_profiles")
        .select("name, logo_url")
        .eq("id", (sa as any).synagogue_id)
        .single();

      if (profile) {
        setSynagogue({ name: profile.name, logo_url: profile.logo_url });
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleDonate = async () => {
    const amount = isCustom ? Math.round(parseFloat(customAmount) * 100) : selectedAmount;
    if (!amount || amount < 100) {
      toast.error("Montant minimum : 1€");
      return;
    }
    if (!donorEmail) {
      toast.error("Veuillez renseigner votre email");
      return;
    }
    if (!donorAddress || !donorCity || !donorPostal) {
      toast.error("L'adresse complète est obligatoire pour le reçu fiscal");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
      body: { slug, amount, donor_name: donorName, donor_email: donorEmail, donor_address: `${donorAddress}, ${donorPostal} ${donorCity}` },
    });

    if (error || data?.error) {
      toast.error(data?.error || "Erreur lors de la création du paiement");
      setSubmitting(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!synagogue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🏛️</p>
          <h1 className="text-xl font-bold text-foreground">Page introuvable</h1>
          <p className="text-sm text-muted-foreground mt-2">Cette page de don n'existe pas.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Merci pour votre don ! 💛</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Votre don à <strong>{synagogue.name}</strong> a été reçu avec succès.
            Un reçu fiscal (CERFA) vous sera envoyé par email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {synagogue.logo_url ? (
            <img
              src={synagogue.logo_url}
              alt={synagogue.name}
              className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4 border border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏛️</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{synagogue.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Faire un don sécurisé</p>
        </div>

        {!stripeReady ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Les dons ne sont pas encore activés pour cette synagogue.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            {/* Amount selection */}
            <div>
              <Label className="text-xs font-semibold mb-3 block">Montant du don</Label>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => { setSelectedAmount(amt); setIsCustom(false); }}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                      !isCustom && selectedAmount === amt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {amt / 100} €
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsCustom(true)}
                className={`mt-2 w-full py-3 px-4 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                  isCustom
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                Autre montant
              </button>
              {isCustom && (
                <div className="mt-2">
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Montant en €"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="text-center text-lg font-bold"
                  />
                </div>
              )}
            </div>

            {/* Donor info */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Votre nom</Label>
                <Input
                  placeholder="Prénom Nom"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Votre email *</Label>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Pour recevoir votre reçu fiscal (CERFA)
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Adresse postale *</Label>
                <Input
                  placeholder="12 rue de la Paix"
                  value={donorAddress}
                  onChange={(e) => setDonorAddress(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Code postal *</Label>
                  <Input
                    placeholder="75001"
                    value={donorPostal}
                    onChange={(e) => setDonorPostal(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Ville *</Label>
                  <Input
                    placeholder="Paris"
                    value={donorCity}
                    onChange={(e) => setDonorCity(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleDonate}
              disabled={submitting}
              className="w-full py-6 text-base font-bold rounded-xl"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Heart className="w-5 h-5 mr-2" />
              )}
              {submitting ? "Redirection…" : `Donner ${isCustom && customAmount ? `${customAmount} €` : `${selectedAmount / 100} €`}`}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground">
              🔒 Paiement sécurisé par Stripe. Reçu fiscal envoyé automatiquement.
            </p>

            {canceled && (
              <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-lg p-2">
                Le paiement a été annulé. Vous pouvez réessayer.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationPage;
