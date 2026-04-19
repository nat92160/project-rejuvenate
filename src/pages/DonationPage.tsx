import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Check, Loader2, Target, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUGGESTED_AMOUNTS = [1800, 3600, 5200, 10000]; // in cents

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number | null;
  current_amount: number;
  cover_image_url: string | null;
  end_date: string | null;
}

const DonationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id");
  const canceled = searchParams.get("canceled") === "true";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [synagogue, setSynagogue] = useState<{ id: string; name: string; logo_url: string | null } | null>(null);
  const [cerfaReady, setCerfaReady] = useState(true);
  const [cerfaMissing, setCerfaMissing] = useState<string[]>([]);
  const [stripeReady, setStripeReady] = useState(true); // Platform model: always ready

  // CERFA download state (success screen)
  const [cerfaUrl, setCerfaUrl] = useState<string | null>(null);
  const [cerfaLoading, setCerfaLoading] = useState(false);
  const [cerfaError, setCerfaError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const [selectedAmount, setSelectedAmount] = useState(3600);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [donorType, setDonorType] = useState<"particulier" | "societe">("particulier");
  const [donorCompanyName, setDonorCompanyName] = useState("");
  const [donorSiret, setDonorSiret] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorAddress, setDonorAddress] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorPostal, setDonorPostal] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // Centralized model: single lookup on synagogue_profiles by donation_slug, or raw UUID fallback
      let synaId: string | null = null;
      let synaProfile: { id: string; name: string; logo_url: string | null; donation_slug: string | null } | null = null;

      const { data: sa } = await supabase
        .from("synagogue_profiles")
        .select("id, name, logo_url, donation_slug, association_legal_name, rna_number, siret_number, address, president_first_name, president_last_name")
        .eq("donation_slug", slug)
        .maybeSingle();

      if (sa?.id) {
        synaId = sa.id;
        synaProfile = sa as any;
        setStripeReady(true);
      } else {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        if (isUuid) {
          synaId = slug;
          setStripeReady(true);
        }
      }

      if (!synaId) {
        setLoading(false);
        return;
      }

      const campaignQuery = (supabase
          .from("donation_campaigns" as any)
          .select("id, title, description, goal_amount, current_amount, cover_image_url, end_date") as any)
          .eq("synagogue_id", synaId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

      const [{ data: camps }, { data: profileById }] = await Promise.all([
        campaignQuery,
        synaProfile
          ? Promise.resolve({ data: null })
          : supabase
              .from("synagogue_profiles")
              .select("id, name, logo_url, donation_slug, association_legal_name, rna_number, siret_number, address, president_first_name, president_last_name")
              .eq("id", synaId)
              .maybeSingle(),
      ]);

      const profile: any = synaProfile ?? profileById;

      if (profile) {
        setSynagogue({ id: profile.id, name: profile.name, logo_url: profile.logo_url });

        // ─── CERFA legal config check — block donations if missing
        const missing: string[] = [];
        if (!profile.association_legal_name) missing.push("Dénomination légale");
        if (!profile.rna_number && !profile.siret_number) missing.push("Numéro RNA ou SIRET");
        if (!profile.address) missing.push("Adresse de l'association");
        if (!profile.president_first_name && !profile.president_last_name) missing.push("Nom du président signataire");
        setCerfaMissing(missing);
        setCerfaReady(missing.length === 0);
      }
      setCampaigns((camps as Campaign[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  const handleDonate = async () => {
    if (!cerfaReady) {
      toast.error("Cette synagogue n'a pas finalisé sa configuration fiscale. Les dons sont temporairement indisponibles.");
      return;
    }
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
    if (donorType === "societe" && !donorCompanyName) {
      toast.error("La raison sociale est obligatoire pour une société");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
      body: {
        slug,
        amount,
        donor_name: donorName,
        donor_email: donorEmail,
        donor_address: `${donorAddress}, ${donorPostal} ${donorCity}`,
        campaign_id: selectedCampaignId,
        donor_type: donorType,
        donor_company_name: donorType === "societe" ? donorCompanyName : null,
        donor_siret: donorType === "societe" ? donorSiret : null,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || "Erreur lors de la création du paiement");
      setSubmitting(false);
      return;
    }

    if (data?.url) {
      // On native iOS/Android (Capacitor), open in system browser
      // so Stripe Checkout works (and can redirect back to the app via universal links / web URL).
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: data.url, presentationStyle: "fullscreen" });
          setSubmitting(false);
          return;
        }
      } catch (e) {
        console.warn("Capacitor browser fallback to window.location", e);
      }
      window.location.href = data.url;
      return;
    }

    toast.error("Impossible d'ouvrir la page de paiement");
    setSubmitting(false);
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
    const fetchCerfa = async () => {
      if (!sessionId) {
        setCerfaError("Identifiant de session manquant");
        return;
      }
      setCerfaLoading(true);
      setCerfaError(null);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/get-donation-cerfa?session_id=${sessionId}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setCerfaUrl(data.cerfa_url);
        // Auto-open in new tab
        window.open(data.cerfa_url, "_blank");
      } catch (e: any) {
        setCerfaError(e.message || "Reçu non disponible pour l'instant");
      } finally {
        setCerfaLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Merci pour votre don ! 💛</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Votre don à <strong>{synagogue.name}</strong> a été reçu avec succès.
            Vous pouvez télécharger votre reçu fiscal CERFA ci-dessous.
          </p>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-bold">Reçu fiscal CERFA</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Conservez ce document pour bénéficier d'une réduction d'impôt de 66% (article 200 du CGI).
            </p>

            {cerfaUrl ? (
              <a
                href={cerfaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button
                  className="w-full py-6 text-base font-bold rounded-xl"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Télécharger mon CERFA
                </Button>
              </a>
            ) : (
              <Button
                onClick={fetchCerfa}
                disabled={cerfaLoading}
                className="w-full py-6 text-base font-bold rounded-xl"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
              >
                {cerfaLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Préparation du reçu…
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Obtenir mon reçu CERFA
                  </>
                )}
              </Button>
            )}

            {cerfaError && (
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2">
                {cerfaError}
              </p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/70 mt-4 italic">
            Une copie du reçu vous sera également envoyée par email.
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
        ) : !cerfaReady ? (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center space-y-3">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-bold text-amber-900">Configuration fiscale incomplète</h2>
            <p className="text-sm text-amber-800">
              Cette synagogue n'a pas encore finalisé les informations légales requises pour émettre des reçus fiscaux conformes (CERFA 2041-RD).
            </p>
            <div className="text-left bg-white/60 rounded-lg p-3 text-xs text-amber-900">
              <p className="font-semibold mb-1">Informations manquantes :</p>
              <ul className="list-disc list-inside space-y-0.5">
                {cerfaMissing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
            <p className="text-xs text-amber-700">
              Les dons sont temporairement désactivés. Le président de cette synagogue doit compléter la configuration CERFA depuis son tableau de bord.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            {/* Campaign selection */}
            {campaigns.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Destination du don
                </Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCampaignId(null)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedCampaignId === null
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">Don général</div>
                    <div className="text-[10px] text-muted-foreground">
                      Soutien libre à la synagogue
                    </div>
                  </button>
                  {campaigns.map((c) => {
                    const pct = c.goal_amount
                      ? Math.min(100, Math.round((c.current_amount / c.goal_amount) * 100))
                      : 0;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCampaignId(c.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedCampaignId === c.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="text-sm font-bold text-foreground">{c.title}</div>
                        {c.description && (
                          <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                            {c.description}
                          </div>
                        )}
                        {c.goal_amount && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="font-semibold text-primary">
                                {(c.current_amount / 100).toFixed(0)} € collectés
                              </span>
                              <span className="text-muted-foreground">
                                {pct}% de {(c.goal_amount / 100).toFixed(0)} €
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
              {/* Type donateur */}
              <div>
                <Label className="text-xs font-semibold mb-2 block">Vous êtes</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDonorType("particulier")}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                      donorType === "particulier"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    👤 Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonorType("societe")}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                      donorType === "societe"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    🏢 Société
                  </button>
                </div>
              </div>

              {donorType === "societe" && (
                <>
                  <div>
                    <Label className="text-xs font-semibold">Raison sociale *</Label>
                    <Input
                      placeholder="Nom de la société"
                      value={donorCompanyName}
                      onChange={(e) => setDonorCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">SIRET</Label>
                    <Input
                      placeholder="14 chiffres"
                      value={donorSiret}
                      onChange={(e) => setDonorSiret(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <Label className="text-xs font-semibold">
                  {donorType === "societe" ? "Représentant (Prénom Nom)" : "Votre nom"}
                </Label>
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
