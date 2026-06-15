import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/30";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setLinkError(null);
      }
    });

    const init = async () => {
      // 1) Check hash for explicit errors (expired / invalid link)
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(hash);
      const hashError =
        hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        setLinkError(decodeURIComponent(hashError.replace(/\+/g, " ")));
        return;
      }

      // 2) PKCE flow: ?code=... → exchange for a session
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exErr) {
          setLinkError(
            "Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau ci-dessous."
          );
          return;
        }
        // Clean the URL
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search);
        setReady(true);
        return;
      }

      // 3) Already have a session (hash tokens auto-detected)
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady(true);
        return;
      }

      // 4) After a short delay, if still nothing, show error
      setTimeout(() => {
        if (cancelled) return;
        setReady((r) => {
          if (!r) {
            setLinkError(
              "Lien de réinitialisation manquant ou expiré. Demandez un nouveau lien ci-dessous."
            );
          }
          return r;
        });
      }, 2500);
    };

    init();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResending(true);
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(
      resendEmail.trim(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setResending(false);
    if (rErr) {
      toast.error(rErr.message);
    } else {
      setResent(true);
      toast.success("Email envoyé ✅ Vérifiez votre boîte de réception.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    toast.success("Mot de passe mis à jour ✅");
    setTimeout(() => navigate("/"), 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div
        className="w-full max-w-[420px] rounded-2xl border border-border p-7 bg-card"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="text-center mb-5">
          <span className="text-4xl">🔐</span>
          <h1 className="font-display text-xl font-bold mt-2 text-foreground">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ready
              ? "Choisissez un nouveau mot de passe pour votre compte."
              : "Vérification du lien de réinitialisation…"}
          </p>
        </div>

        {ready && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-muted-foreground"
                tabIndex={-1}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={show ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
            >
              {loading ? "⏳" : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;