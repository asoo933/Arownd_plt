import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = { user: User | null; ready: boolean };
const Ctx = createContext<AuthCtx>({ user: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthCtx>({ user: null, ready: false });
  const router = useRouter();
  const qc = useQueryClient();
  const authRevision = useRef(0);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      authRevision.current += 1;
      setState({ user: session?.user ?? null, ready: true });
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;

      // Private queries such as ["my-orders"] are intentionally not reusable
      // across identities. Clear them synchronously on every identity boundary
      // to avoid briefly rendering the previous account's cached data.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        qc.clear();
      } else {
        void qc.invalidateQueries();
      }
      router.invalidate();
    });
    const initialRevision = authRevision.current;
    supabase.auth
      .getSession()
      .then(({ data: d }) => {
        if (authRevision.current === initialRevision) {
          setState({ user: d.session?.user ?? null, ready: true });
        }
      })
      .catch((error: unknown) => {
        console.warn("[auth] Could not restore the current session", error);
        if (authRevision.current === initialRevision) {
          setState({ user: null, ready: true });
        }
      });
    return () => data.subscription.unsubscribe();
  }, [router, qc]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
