import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "@/hooks/useAuth";
import RefouaCampaignPlanner from "@/components/RefouaCampaignPlanner";

interface Patient {
  id: string;
  hebrew_name: string;
  mother_name: string;
  gender: "ben" | "bat";
}

const RefouaJoinContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("refoua_chelema")
        .select("id, hebrew_name, mother_name, gender")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setPatient(data as Patient);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="font-display text-xl font-bold text-foreground mb-2">Programme introuvable</h1>
        <p className="text-sm text-muted-foreground mb-6">Ce lien n'est plus valide.</p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer"
          style={{ background: "var(--gradient-gold)" }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const benBat = patient.gender === "bat" ? "בת" : "בן";

  return (
    <div className="min-h-screen bg-background pb-16">
      <div
        className="px-5 py-6 text-center border-b border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.10), hsl(var(--gold) / 0.03))" }}
      >
        <p className="text-[10px] uppercase tracking-[3px] font-bold text-muted-foreground mb-1">
          🙏 Refoua Chelema pour
        </p>
        <p className="font-hebrew text-2xl font-bold text-foreground" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
          <bdi>{patient.hebrew_name}</bdi>
          {patient.mother_name ? (
            <>
              {" "}
              <span dir="rtl" className="font-hebrew">{benBat}</span>{" "}
              <bdi>{patient.mother_name}</bdi>
            </>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground mt-3 italic">
          Réservez un créneau pour vous joindre au programme de prière.
        </p>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto">
        <RefouaCampaignPlanner refouaId={patient.id} hebrewName={patient.hebrew_name} />

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground underline bg-transparent border-none cursor-pointer"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

const RefouaJoin = () => (
  <AuthProvider>
    <RefouaJoinContent />
  </AuthProvider>
);

export default RefouaJoin;