"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { trackEvent, forceFlushAllEvents } from "@/lib/tracking" // Import forceFlushAllEvents
import { useIsMobile } from "@/hooks/use-mobile"
import { usePathname } from "next/navigation"

// Assuming CloseTabScript makes window.closeTab available globally
declare global {
  interface Window {
    closeTab?: () => void;
  }
}

export default function SessionTimer() {
  const [sessionStartTime] = useState(Date.now())
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [beforeUnloadActive, setBeforeUnloadActive] = useState(true)
  const [showReturnButton, setShowReturnButton] = useState(false)
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const [isTimerActive, setIsTimerActive] = useState(true)

  // New state for the 8-minute flow
  const [isInExtendedMode, setIsInExtendedMode] = useState(false)
  const [showForceCloseModal, setShowForceCloseModal] = useState(false)
  const [forceCloseCountdown, setForceCloseCountdown] = useState(10)

  // Refs for timers to ensure cleanup
  const threeMinuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const extendedSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)


  // Don't show session timer on admin pages
  if (pathname.startsWith("/admin")) {
    return null
  }

  const getUserData = () => {
    if (typeof window === "undefined") return { username: "unknown", condition: null, participantId: null }
    try {
      const userDataString = localStorage.getItem("userData")
      if (!userDataString) return { username: "unknown", condition: null, participantId: null }
      const parsedData = JSON.parse(userDataString)
      return {
        username: parsedData.username || "unknown",
        condition: parsedData.condition || null,
        participantId: parsedData.participantId || null,
      }
    } catch (error) {
      console.error("Error reading user data from localStorage:", error)
      return { username: "unknown", condition: null, participantId: null }
    }
  }

  const performCloseActions = () => {
    if (typeof window.closeTab === 'function') {
      window.closeTab();
    } else {
      window.close();
      // Fallback if window.close is blocked or doesn't work reliably
      setTimeout(() => {
        if (!window.closed) { // Check if window actually closed
            window.location.href = "about:blank";
        }
      }, 100); // Small delay
    }
  }

  // Handle beforeunload event for the first 3 minutes
  useEffect(() => {
    if (!isTimerActive) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const timeElapsed = Date.now() - sessionStartTime
      if (timeElapsed < 3 * 60 * 1000 && beforeUnloadActive) {
        const message = "Are you sure you want to leave? Please complete the 3-minute interaction."
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [sessionStartTime, beforeUnloadActive, isTimerActive])

  // Timer for 3-minute popup
  useEffect(() => {
    if (!isTimerActive) return

    threeMinuteTimerRef.current = setTimeout(() => {
      setShowCompletionModal(true)
      setBeforeUnloadActive(false)
      setIsTimerActive(false) // Stop this phase of the timer

      const userData = getUserData()
      trackEvent({
        action: "session_milestone",
        username: userData.username,
        text: "3-minute session mark reached",
        condition: userData.condition,
        participantId: userData.participantId,
      })
    }, 3 * 60 * 1000)

    return () => {
      if (threeMinuteTimerRef.current) clearTimeout(threeMinuteTimerRef.current)
    }
  }, [sessionStartTime, isTimerActive])


  // Timer for 5 additional minutes if "Continue Exploring"
  useEffect(() => {
    if (!isInExtendedMode) return

    console.log("SessionTimer: Extended mode activated. Starting 5-minute timer.");
    extendedSessionTimerRef.current = setTimeout(() => {
      const userData = getUserData()
      trackEvent({
        action: "session_extended_time_limit_reached",
        username: userData.username,
        text: "8-minute total session mark (3+5) reached, initiating force close warning",
        condition: userData.condition,
        participantId: userData.participantId,
      })
      setShowForceCloseModal(true)
      setForceCloseCountdown(10) // Reset countdown for display
    }, 5 * 60 * 1000) // 5 minutes

    return () => {
      if (extendedSessionTimerRef.current) clearTimeout(extendedSessionTimerRef.current)
    }
  }, [isInExtendedMode])

  // Countdown timer for forced closure (10 seconds)
  useEffect(() => {
    if (!showForceCloseModal) return

    if (forceCloseCountdown <= 0) {
      console.log("SessionTimer: Force close countdown finished. Flushing events and closing.");
      const userData = getUserData()
      trackEvent({
        action: "session_force_closed_due_to_timeout",
        username: userData.username,
        text: "Session force closed after 8-min warning + 10s countdown",
        condition: userData.condition,
        participantId: userData.participantId,
      })
      
      // Clean up interval if it's still running
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      void forceFlushAllEvents(() => {
        performCloseActions();
      })
      return // Stop further execution in this effect
    }

    countdownIntervalRef.current = setInterval(() => {
      setForceCloseCountdown((prevCountdown) => prevCountdown - 1)
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [showForceCloseModal, forceCloseCountdown])


  const handleReturnToSurvey = async () => {
    console.log("SessionTimer: User clicked 'Return to Survey'.")
    const userData = getUserData()
    trackEvent({
      action: "return_to_survey",
      username: userData.username,
      text: "User clicked return to survey",
      condition: userData.condition,
      participantId: userData.participantId,
    })

    // Disable any active timers to prevent them from firing during/after close
    setIsTimerActive(false)
    setBeforeUnloadActive(false)
    setIsInExtendedMode(false) // Stop extended mode if active
    setShowForceCloseModal(false) // Hide force close modal if somehow visible
    if (threeMinuteTimerRef.current) clearTimeout(threeMinuteTimerRef.current)
    if (extendedSessionTimerRef.current) clearTimeout(extendedSessionTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    
    setShowCompletionModal(false); // Hide initial modal
    setShowReturnButton(false); // Hide persistent button

    await forceFlushAllEvents(() => {
      performCloseActions();
    })
  }

  const handleContinueExploring = () => {
    console.log("SessionTimer: User chose to 'Continue Exploring'.")
    setShowCompletionModal(false)
    setShowReturnButton(true)
    setIsInExtendedMode(true) // Activate the 5-minute additional timer flow

    const userData = getUserData()
    trackEvent({
      action: "continue_exploring",
      username: userData.username,
      text: "User chose to continue exploring after 3 minutes",
      condition: userData.condition,
      participantId: userData.participantId,
    })
  }

  const ReturnButton = () => {
    if (!showReturnButton) return null
    const buttonPosition = isMobile ? "fixed bottom-20 right-4 z-[1000]" : "fixed bottom-4 right-4 z-50"
    return createPortal(
      <button
        onClick={handleReturnToSurvey}
        className={`${buttonPosition} bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg transition-all`}
      >
        Return to Survey
      </button>,
      document.body,
    )
  }

  const CompletionModal = () => {
    if (!showCompletionModal) return null
    return createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001]">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full m-4">
          <h2 className="text-xl font-bold mb-4">Time Check</h2>
          <p className="mb-6">
            You've been using the app for 3 minutes. You can keep exploring or return to the survey. If you continue, a 'Return to Survey' button will appear at the bottom right for easy access anytime.
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

  const ForceCloseModal = () => {
    if (!showForceCloseModal) return null
    return createPortal(
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1002]"> {/* Higher z-index */}
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full m-4">
          <h2 className="text-xl font-bold mb-4">Time Limit Reached</h2>
          <p className="mb-6">
            The allocated time for this task is now over.
            The application will close in <span className="font-bold">{forceCloseCountdown}</span> seconds.
          </p>
          {/* No buttons needed, it will auto-close */}
        </div>
      </div>,
      document.body
    );
  };

  // Cleanup all timers on component unmount
  useEffect(() => {
    return () => {
      if (threeMinuteTimerRef.current) clearTimeout(threeMinuteTimerRef.current);
      if (extendedSessionTimerRef.current) clearTimeout(extendedSessionTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);


  return (
    <>
      <CompletionModal />
      <ReturnButton />
      <ForceCloseModal />
    </>
  )
}
