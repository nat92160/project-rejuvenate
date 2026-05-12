import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "guest" | "fidele" | "president" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  dbRole: AppRole | null;
  dbRoles: AppRole[];
  isAdmin: boolean;
  isPresident: boolean;
  suspended: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const resolveRole = (roles: string[]): AppRole => {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("president")) return "president";
  if (roles.includes("fidele")) return "fidele";
  return "guest";
};

// Check if user is adjoint (has president role via adjoint assignment)
export const checkIsAdjoint = async (userId: string): Promise<boolean> => {
  const { data } = await (supabase
    .from("synagogue_profiles")
    .select("id") as any)
    .eq("adjoint_id", userId)
    .maybeSingle();
  return !!data;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbRole, setDbRole] = useState<AppRole | null>(null);
  const [dbRoles, setDbRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPresident, setIsPresident] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const lastSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const ensureUserBootstrap = async (authUser: User): Promise<{ role: AppRole; roles: AppRole[]; isAdmin: boolean; isPresident: boolean }> => {
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

      if (!profileError && !profileRows?.length) {
        const { error: insertProfileError } = await supabase.from("profiles").insert({
          user_id: authUser.id,
          display_name: fallbackDisplayName || null,
          first_name: authUser.user_metadata?.first_name || null,
          last_name: authUser.user_metadata?.last_name || null,
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
        throw rolesError;
      }

      if (!rolesData?.length) {
        const { error: insertRoleError } = await supabase.from("user_roles").insert({
          user_id: authUser.id,
          role: "guest",
        });

        if (insertRoleError) {
          console.error("Role bootstrap error:", insertRoleError);
          return { role: "guest", roles: ["guest"], isAdmin: false, isPresident: false };
        }

        return { role: "guest", roles: ["guest"], isAdmin: false, isPresident: false };
      }

      const roles = rolesData
        .map((entry) => entry.role)
        .filter((role): role is AppRole => ["guest", "fidele", "president", "admin"].includes(role));
      return {
        role: resolveRole(roles),
        roles,
        isAdmin: roles.includes("admin"),
        isPresident: roles.includes("president"),
      };
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
        setDbRoles([]);
        setIsAdmin(false);
        setIsPresident(false);
        setSuspended(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextAuth = await ensureUserBootstrap(authUser);
      setDbRole(nextAuth.role);
      setDbRoles(nextAuth.roles);
      setIsAdmin(nextAuth.isAdmin);
      setIsPresident(nextAuth.isPresident);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("suspended")
        .eq("user_id", authUser.id)
        .single();

      setSuspended(profileData?.suspended === true);

      try {
        const pendingStr = localStorage.getItem("pending_president_request");
        if (pendingStr) {
          const pending = JSON.parse(pendingStr);
          const { error: reqError } = await supabase
            .from("president_requests")
            .insert({
              user_id: authUser.id,
              synagogue_name: pending.synagogue_name,
              city: pending.city || "Paris",
              message: pending.message || "",
            });
          if (!reqError) {
            localStorage.removeItem("pending_president_request");
          }
        }
      } catch {
        // Silent fail
      }

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
    setDbRoles([]);
    setIsAdmin(false);
    setIsPresident(false);
    setSuspended(false);
    setLoading(false);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, dbRole, dbRoles, isAdmin, isPresident, suspended, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
