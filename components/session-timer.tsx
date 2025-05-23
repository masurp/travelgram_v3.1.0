"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/tracking"

export default function SessionTimer() {
  const [sessionStartTime] = useState(Date.now())
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [beforeUnloadActive, setBeforeUnloadActive] = useState(true)
  const [showReturnButton, setShowReturnButton] = useState(false)

  // Handle beforeunload event for the first 3 minutes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if we're still within the 3-minute window
      const timeElapsed = Date.now() - sessionStartTime
      if (timeElapsed < 3 * 60 * 1000 && beforeUnloadActive) {
        const message = "Are you sure you want to leave? Please complete the 3-minute interaction."
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [sessionStartTime, beforeUnloadActive])

  // Set timer for 3-minute popup
  useEffect(() => {
    const timer = setTimeout(
      () => {
        setShowCompletionModal(true)
        setBeforeUnloadActive(false) // Disable beforeunload after 3 minutes

        // Track that the 3-minute mark was reached
        trackEvent({
          action: "session_milestone",
          text: "3-minute session mark reached",
          timestamp: new Date().toISOString(),
        })
      },
      3 * 60 * 1000,
    )

    return () => {
      clearTimeout(timer)
    }
  }, [sessionStartTime])

  // Function to close window (return to survey)
  const handleReturnToSurvey = () => {
    // Track the return action
    trackEvent({
      action: "return_to_survey",
      text: "User clicked return to survey",
      timestamp: new Date().toISOString(),
    })

    // Try to close the window
    window.close()

    // Fallback if window.close() doesn't work (some browsers block it)
    window.location.href = "about:blank"
  }

  // Function to continue exploring
  const handleContinueExploring = () => {
    setShowCompletionModal(false)
    setShowReturnButton(true)

    // Track the continue action
    trackEvent({
      action: "continue_exploring",
      text: "User chose to continue exploring after 3 minutes",
      timestamp: new Date().toISOString(),
    })
  }

  // Render the persistent return button
  const ReturnButton = () => {
    if (!showReturnButton) return null

    return createPortal(
      <button
        onClick={handleReturnToSurvey}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg z-50 transition-all"
      >
        Return to Survey
      </button>,
      document.body,
    )
  }

  // Render the 3-minute completion modal
  const CompletionModal = () => {
    if (!showCompletionModal) return null

    return createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Time Check</h2>
          <p className="mb-6">
            You've explored the app for 3 minutes. You can continue exploring the app or return to the survey by
            clicking below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" onClick={handleContinueExploring}>
              Continue Exploring
            </Button>
            <Button onClick={handleReturnToSurvey}>Return to Survey</Button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <>
      <CompletionModal />
      <ReturnButton />
    </>
  )
}
