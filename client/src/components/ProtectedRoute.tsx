import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Loading…</main>;
  return user ? <Outlet /> : <Navigate to="/signin" replace />;
}
