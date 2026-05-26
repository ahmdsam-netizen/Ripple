"use client"
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react"

export default function SignInPage(){
    const [userName , setUserName] = useState("") ;
    const [password , setPassword] = useState("") ;
    const [error , setError] = useState("")
    const router = useRouter() 
    const { data: session } = useSession();

    // If already signed in, redirect to home
    useEffect(() => {
        if (session) {
            router.push("/");
        }
    }, [session, router]);

    const handleSignIn = async () => {
        try {
            setError("")
            
            // Clear all localStorage and sessionStorage before login
            localStorage.clear();
            sessionStorage.clear();

            const result = await signIn("credentials" , {
                username: userName,
                password: password,
                redirect : false
            })
            
            if (result?.ok) {
                // Force a hard refresh to clear all caches
                window.location.href = "/";
            } else {
                setError(result?.error || "Invalid userName or password")
            }
        } 
        catch (error) {
            setError("Invalid userName or password")
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
            <div className="p-8 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-indigo-400 mb-2">Connect Me</h1>
                    <p className="text-slate-400 text-sm">Welcome back</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <input
                    type="text"
                    placeholder="Username"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button
                    onClick={handleSignIn}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95 shadow-lg"
                >
                    Sign In
                </button>

                <p className="text-sm text-center text-slate-400">
                    No account?{" "}
                    <a href="/signup" className="text-indigo-400 hover:text-indigo-300 underline font-semibold transition-colors">Sign up</a>
                </p>
            </div>
        </div>
    )
}