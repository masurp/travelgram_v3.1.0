"use client"

import { useState, useEffect, memo } from "react"
import { useSearchParams } from "next/navigation"
import Feed from "@/components/feed"
import RegistrationForm from "@/components/RegistrationForm"
import { UserProvider, useUser } from "@/contexts/UserContext"
import { DarkModeProvider } from "@/contexts/DarkModeContext"
import { startTiming, endTiming } from "@/lib/performance"

// Memoize the Home component to prevent unnecessary re-renders
const Home = memo(function Home() {
  const { username, condition } = useUser()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    startTiming("home-component-mount")
    setIsClient(true)

    // Log the key environment variables
    console.log("Environment variables:")
    console.log("SHEET_ID:", process.env.NEXT_PUBLIC_SHEET_ID)
    console.log("AUTHORS_SHEET_NAME:", process.env.AUTHORS_SHEET_NAME || "Authors (default)")

    return () => {
      endTiming("home-component-mount")
    }
  }, [])

  if (!isClient) {
    return null // or a loading spinner
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {username && condition ? <Feed /> : <RegistrationForm />}
    </main>
  )
})

export default function HomeWrapper() {
  const searchParams = useSearchParams()
  const condParam = searchParams.get("cond")

  return (
    <DarkModeProvider>
      <UserProvider initialCondition={condParam || undefined}>
        <Home />
      </UserProvider>
    </DarkModeProvider>
  )
}
