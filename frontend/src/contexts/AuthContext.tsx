import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";

export type User = { id: string; username: string; email: string };
type AuthContextValue = { user: User | null; loading: boolean; signIn: (username: string, password: string) => Promise<void>; signUp: (username: string, email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<{ user: User }>("/api/auth/me").then(({ user }) => setUser(user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const signIn = async (username: string, password: string) => { const { user } = await api<{ user: User }>("/api/auth/signin", { method: "POST", body: JSON.stringify({ username, password }) }); setUser(user); };
  const signUp = async (username: string, email: string, password: string) => { const { user } = await api<{ user: User }>("/api/auth/signup", { method: "POST", body: JSON.stringify({ username, email, password }) }); setUser(user); };
  const signOut = async () => { await api<void>("/api/auth/signout", { method: "POST" }); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used inside AuthProvider"); return context; }
