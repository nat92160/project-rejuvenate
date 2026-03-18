import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "fidele" | "president" | "guest";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isFidele: boolean;
  isPresident: boolean;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      return (localStorage.getItem("calj_role") as UserRole) || "guest";
    } catch {
      return "guest";
    }
  });

  const setRole = (r: UserRole) => {
    setRoleState(r);
    try { localStorage.setItem("calj_role", r); } catch {}
  };

  return (
    <RoleContext.Provider value={{ role, setRole, isFidele: role === "fidele", isPresident: role === "president" }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
