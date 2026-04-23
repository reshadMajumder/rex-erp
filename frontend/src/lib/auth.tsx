import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export type AppRole = "admin" | "employee";

interface AuthState {
  user: {
    id: string;
    email: string;
    display_name: string;
    roles: AppRole[];
  } | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (access: string, refresh: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<any>("/me/");
      setUser(data);
      setRoles(data.roles ?? []);
    } catch (err: any) {
      setUser(null);
      setRoles([]);
      // If it's an auth error, clear local storage to prevent loops
      if (err.message?.toLowerCase().includes("not found") || err.message?.toLowerCase().includes("unauthorized")) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUser();
  }, []);

  const login = async (access: string, refresh: string) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    await fetchUser();
  };

  const signOut = async () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setRoles([]);
  };

  const refreshRoles = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        isAdmin: roles.includes("admin"),
        isEmployee: roles.includes("employee"),
        login,
        signOut,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
