import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "guest" | "fidele" | "president" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  dbRole: AppRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const resolveRole = (roles: string[]): AppRole => {
  if (roles.includes("president")) return "president";
  if (roles.includes("fidele")) return "fidele";
  return "guest";
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbRole, setDbRole] = useState<AppRole | null>(null);
  const lastSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const ensureUserBootstrap = async (authUser: User): Promise<AppRole> => {
      const fallbackDisplayName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "";

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", authUser.id)
        .limit(1);

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }

      if (!profileRows?.length) {
        const { error: insertProfileError } = await supabase.from("profiles").insert({
          user_id: authUser.id,
          display_name: fallbackDisplayName || null,
          city: "Paris",
        });

        if (insertProfileError) {
          console.error("Profile bootstrap error:", insertProfileError);
        }
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id)
        .limit(10);

      if (rolesError) {
        console.error("Role fetch error:", rolesError);
        return "guest";
      }

      if (!rolesData?.length) {
        const { error: insertRoleError } = await supabase.from("user_roles").insert({
          user_id: authUser.id,
          role: "guest",
        });

        if (insertRoleError) {
          console.error("Role bootstrap error:", insertRoleError);
          return "guest";
        }

        return "guest";
      }

      return resolveRole(rolesData.map((entry) => entry.role));
    };

    const syncAuthState = async (nextSession: Session | null) => {
      const sessionKey = nextSession?.access_token
        ? `${nextSession.user.id}:${nextSession.access_token}`
        : "signed-out";

      if (lastSessionKeyRef.current === sessionKey) {
        return;
      }

      lastSessionKeyRef.current = sessionKey;
      setSession(nextSession);

      const authUser = nextSession?.user ?? null;
      setUser(authUser);

      if (!authUser) {
        setDbRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextRole = await ensureUserBootstrap(authUser);
      setDbRole(nextRole);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void syncAuthState(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    lastSessionKeyRef.current = null;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    setUser(null);
    setSession(null);
    setDbRole(null);
    setLoading(false);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, dbRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
