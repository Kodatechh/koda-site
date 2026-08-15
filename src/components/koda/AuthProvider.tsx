import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "support_agent" | "support_advanced";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isFactoryAdmin: boolean;
  isSupportAgent: boolean;
  isSupportAdvanced: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  async function loadRole(userId?: string) {
    if (!userId) {
      setRoles([]);
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.warn("[KodaCloud] Não foi possível carregar as funções da conta:", error.message);
      setRoles([]);
      return;
    }

    setRoles((data ?? []).map((item) => item.role as AppRole));
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      loadRole(data.session?.user.id).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(true);
      loadRole(nextSession?.user.id).finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => {
      const isFactoryAdmin = roles.includes("admin");
      const isSupportAdvanced = isFactoryAdmin || roles.includes("support_advanced");
      const isSupportAgent = isSupportAdvanced || roles.includes("support_agent");

      return {
        user: session?.user ?? null,
        session,
        loading,
        roles,
        isFactoryAdmin,
        isSupportAgent,
        isSupportAdvanced,
        refreshRole: () => loadRole(session?.user.id),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      };
    },
    [session, loading, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return value;
}
