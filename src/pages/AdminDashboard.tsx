import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PresidentRequest {
  id: string;
  user_id: string;
  synagogue_name: string;
  city: string;
  message: string;
  status: string;
  created_at: string;
  user_email?: string;
}

const AdminDashboard = () => {
  const { user, dbRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PresidentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || dbRole !== "admin")) {
      navigate("/");
    }
  }, [user, dbRole, authLoading, navigate]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("president_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch emails for each request
      const enriched = await Promise.all(
        (data as PresidentRequest[]).map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", req.user_id)
            .single();
          return { ...req, user_email: profile?.display_name || req.user_id.slice(0, 8) };
        })
      );
      setRequests(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && dbRole === "admin") fetchRequests();
  }, [user, dbRole]);

  const handleDecision = async (requestId: string, userId: string, decision: "approved" | "rejected") => {
    setProcessing(requestId);

    // Update request status
    const { error: updateError } = await supabase
      .from("president_requests")
      .update({ status: decision, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateError) {
      toast.error("Erreur lors de la mise à jour");
      setProcessing(null);
      return;
    }

    // If approved, promote user to president role
    if (decision === "approved") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "president" as "fidele" | "president" | "guest" });

      if (roleError) {
        // Might already have the role
        console.error("Role insert error:", roleError);
      }
    }

    toast.success(decision === "approved" ? "✅ Président approuvé !" : "❌ Demande refusée");
    await fetchRequests();
    setProcessing(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user || dbRole !== "admin") return null;

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/")}
            className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-lg cursor-pointer hover:bg-muted transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">🛡️ Administration</h1>
            <p className="text-sm text-muted-foreground">Gestion des demandes de président</p>
          </div>
        </div>

        {/* Pending requests */}
        <div className="mb-8">
          <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            En attente ({pending.length})
          </h2>

          {pending.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm text-muted-foreground">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-amber-500/20 bg-card p-4"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground">{req.synagogue_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📍 {req.city} • 👤 {req.user_email}
                      </p>
                      {req.message && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg p-2">
                          💬 {req.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {new Date(req.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleDecision(req.id, req.user_id, "approved")}
                      disabled={processing === req.id}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 border-none cursor-pointer disabled:opacity-50 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                    >
                      {processing === req.id ? "⏳" : "✅ Approuver"}
                    </button>
                    <button
                      onClick={() => handleDecision(req.id, req.user_id, "rejected")}
                      disabled={processing === req.id}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 border-none cursor-pointer disabled:opacity-50 hover:bg-red-700 transition-all active:scale-[0.98]"
                    >
                      {processing === req.id ? "⏳" : "❌ Refuser"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Processed requests */}
        {processed.length > 0 && (
          <div>
            <h2 className="font-bold text-lg text-foreground mb-4">Historique</h2>
            <div className="space-y-2">
              {processed.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-border bg-card p-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{req.synagogue_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {req.user_email} • {req.city}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      req.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {req.status === "approved" ? "Approuvé" : "Refusé"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
