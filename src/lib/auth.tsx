import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { adminMe, clearToken, getToken } from "./api";

type AuthState = {
  email: string | null;
  loading: boolean;
  signOut: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  email: null,
  loading: true,
  signOut: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = getToken();
    if (!token) {
      setEmail(null);
      setLoading(false);
      return;
    }
    try {
      const { email } = await adminMe();
      setEmail(email);
    } catch {
      clearToken();
      setEmail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const signOut = () => {
    clearToken();
    setEmail(null);
    window.location.href = "/login";
  };

  return <Ctx.Provider value={{ email, loading, signOut, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
