"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { connectWithAuth, getSocket } from "@/lib/socket"

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()

  useEffect(() => {
    if (status !== "authenticated") return

    // No token passing needed anymore
    connectWithAuth().catch(console.error)

    return () => {
      getSocket().disconnect()
    }
  }, [status])

  return <>{children}</>
}