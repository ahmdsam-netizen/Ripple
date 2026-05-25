"use client"
import { useState } from "react";
import { signUp } from "../signUp"
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
 
export default function SignUpPage(){
    const [username , setUserName] = useState("") ;
    const [password , setPassword] = useState("") ;
    const [name , setName] = useState("") ;
    const [error , setError] = useState("")
    const router = useRouter()

    async function signUpButton(){
        try {
            setError("");
            console.log("Starting signup for:", username);
            
            // Create the user
            const newUser = await signUp( username , password , name )
            console.log("User created:", newUser?.name);
            
            // Sign in the newly created user
            const result = await signIn("credentials", { username: username, password, redirect: false })
            console.log("SignIn result:", result);
            
            if (result?.error) {
                setError("Signup successful but signin failed: " + result.error)
                return
            }
            
            if (!result?.ok) {
                setError("Signin failed after signup")
                return
            }
            
            router.push("/")
        } 
        catch (error : any) {
            console.error("Signup error:", error);
            setError(error.message || "Signup failed")
        }
    }
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
            <div className="p-8 bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-indigo-400 mb-2">Connect Me</h1>
                    <p className="text-slate-400 text-sm">Create your account</p>
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
                    value={username}
                    onChange={e => setUserName(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <button
                    onClick={signUpButton}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95 shadow-lg"
                >
                    Sign Up
                </button>

                <p className="text-sm text-center text-slate-400">
                    Already have an account?{" "}
                    <a href="/api/auth/signin" className="text-indigo-400 hover:text-indigo-300 underline font-semibold transition-colors">
                        Sign in
                    </a>
                </p>
            </div>
        </div>
    )
}