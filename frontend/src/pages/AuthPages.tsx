import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function AuthCard({ signup }: { signup?: boolean }) {
  const { user, signIn, signUp } = useAuth(); const navigate = useNavigate();
  const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  if (user) return <Navigate to="/homepage" replace />;
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); try { signup ? await signUp(username, email, password) : await signIn(username, password); navigate("/homepage"); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } }
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950"><form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"><div className="text-center"><h1 className="text-3xl font-bold text-indigo-400">Ripple</h1><p className="mt-2 text-sm text-slate-400">{signup ? "Create your account" : "Welcome back"}</p></div>{error && <p className="rounded bg-red-500/20 p-3 text-sm text-red-300">{error}</p>}<input required value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="input" />{signup && <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input" />}<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="input" /><button className="rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500">{signup ? "Sign up" : "Sign in"}</button><p className="text-center text-sm text-slate-400">{signup ? "Already have an account?" : "No account?"} <Link className="text-indigo-400 underline" to={signup ? "/signin" : "/signup"}>{signup ? "Sign in" : "Sign up"}</Link></p></form></main>;
}
export const SignInPage = () => <AuthCard />;
export const SignUpPage = () => <AuthCard signup />;
