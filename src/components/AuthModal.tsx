import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
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

type SignupRole = "fidele" | "president";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Signup extra fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupRole, setSignupRole] = useState<SignupRole>("fidele");
  const [synagogueName, setSynagogueName] = useState("");
  const [city, setCity] = useState("Paris");
  const [presidentMessage, setPresidentMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setSuccess(null);
      setPassword("");
      setSignupRole("fidele");
      setSynagogueName("");
      setPresidentMessage("");
      setFirstName("");
      setLastName("");
    }
  }, [open]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();

    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Le prénom et le nom sont requis");
        setLoading(false);
        return;
      }
      if (signupRole === "president" && !synagogueName.trim()) {
        setError("Le nom de la synagogue est requis");
        setLoading(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        // If user chose president, create a pending request
        if (signupRole === "president" && signUpData.user) {
          // We need to wait until the user is confirmed to insert the request
          // Store the intent in localStorage and create request after email confirmation
          localStorage.setItem("pending_president_request", JSON.stringify({
            synagogue_name: synagogueName.trim(),
            city: city.trim() || "Paris",
            message: presidentMessage.trim(),
          }));
        }

        setSuccess(
          signupRole === "president"
            ? "Vérifiez votre email ! Après confirmation, votre demande de président sera envoyée pour validation."
            : "Vérifiez votre email pour confirmer votre inscription !"
        );
        setPassword("");
      }
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (loginError) {
        setError(loginError.message);
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
        className="w-full max-w-[420px] rounded-2xl border border-border p-7 max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <DialogHeader className="items-center text-center mb-4">
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

        {mode === "login" && (
          <>
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

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou par email</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={inputClass}
          />
          {mode === "signup" && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Prénom *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Nom *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-0"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Role selection for signup */}
          {mode === "signup" && (
            <>
              <div className="mt-1">
                <p className="text-xs font-bold text-foreground mb-2">Je suis :</p>
                <div className="flex rounded-xl overflow-hidden border border-border">
                  <button
                    type="button"
                    onClick={() => setSignupRole("fidele")}
                    className={`flex-1 py-2.5 text-xs font-bold border-none cursor-pointer transition-all ${
                      signupRole === "fidele"
                        ? "text-primary-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                    style={signupRole === "fidele" ? { background: "var(--gradient-gold)" } : {}}
                  >
                    🙏 Fidèle
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole("president")}
                    className={`flex-1 py-2.5 text-xs font-bold border-none cursor-pointer transition-all ${
                      signupRole === "president"
                        ? "text-primary-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                    style={signupRole === "president" ? { background: "var(--gradient-gold)" } : {}}
                  >
                    🏛️ Président de synagogue
                  </button>
                </div>
              </div>

              {signupRole === "president" && (
                <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <p className="text-[11px] text-muted-foreground">
                    ⚠️ Votre demande sera vérifiée par l'administrateur avant validation.
                  </p>
                  <input
                    value={synagogueName}
                    onChange={(e) => setSynagogueName(e.target.value)}
                    placeholder="Nom de votre synagogue *"
                    className={inputClass}
                    required
                  />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ville"
                    className={inputClass}
                  />
                  <textarea
                    value={presidentMessage}
                    onChange={(e) => setPresidentMessage(e.target.value)}
                    placeholder="Message pour l'admin (optionnel)"
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              )}
            </>
          )}

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

        <p className="text-center text-xs text-muted-foreground mt-4">
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
