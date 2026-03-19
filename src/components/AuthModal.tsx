import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setSuccess(null);
      setPassword("");
    }
  }, [open]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Vérifiez votre email pour confirmer votre inscription !");
        setPassword("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setPassword("");
        setEmail("");
        onClose();
      }
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);

    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });

    if (error) {
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="w-full max-w-[400px] rounded-2xl border border-border p-7"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <DialogHeader className="items-center text-center mb-6">
          <span className="text-4xl">🔑</span>
          <DialogTitle className="font-display text-xl font-bold mt-2 text-foreground">
            {mode === "login" ? "Connexion" : "Inscription"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Connectez-vous à votre compte"
              : "Créez votre compte Chabbat Chalom"}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm bg-card border border-border hover:border-primary/30 transition-all cursor-pointer disabled:opacity-50 text-foreground"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou par email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-xs text-primary bg-primary/10 p-2.5 rounded-lg">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            {loading ? "⏳" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setSuccess(null);
            }}
            className="text-primary font-bold bg-transparent border-none cursor-pointer hover:underline"
          >
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
