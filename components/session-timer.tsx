"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { trackEvent, forceFlushAllEvents } from "@/lib/tracking"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePathname } from "next/navigation"

declare global {
  interface Window {
    closeTab?: () => void;
    closeTabSetup?: boolean; // For idempotent script injection
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

  const [isInExtendedMode, setIsInExtendedMode] = useState(false)
  const [showForceCloseModal, setShowForceCloseModal] = useState(false)
  const [forceCloseCountdown, setForceCloseCountdown] = useState(10)

  const threeMinuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const extendedSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Function to attempt closing and handle fallback
  const attemptCloseAndFallback = (trackingTextPrefix: string) => {
    // Attempt to close the window immediately.
    // The 'beforeunload' handler in tracking.ts should fire if close is initiated,
    // using navigator.sendBeacon to send remaining events.
    if (typeof window.closeTab === 'function') {
      console.log(`${trackingTextPrefix}: Attempting synchronous close via window.closeTab()`);
      window.closeTab();
    } else {
      console.log(`${trackingTextPrefix}: Attempting synchronous close via window.close()`);
      window.close();
    }

    // If the close attempt didn't work (e.g., on mobile, or tab not script-opened),
    // the page will still be here. We'll then force flush and redirect/inform.
    // We use a short timeout to give the browser a chance to close.
    setTimeout(() => {
      if (document.visibilityState === "visible") { // Heuristic: if tab is still visible, close failed
        console.log(`${trackingTextPrefix}: Window did not close or is taking too long. Forcing event flush and providing fallback.`);
        const userData = getUserData();
        // Track the failure to close, or re-track the intent if appropriate
        trackEvent({
            action: "return_to_survey", // Or a more specific action like "window_close_failed_fallback_initiated"
            username: userData.username,
            text: `${trackingTextPrefix}: Window close failed/blocked, initiating force flush and fallback redirect.`,
            condition: userData.condition,
            participantId: userData.participantId,
        });

        forceFlushAllEvents(() => {
          console.log(`${trackingTextPrefix}: Fallback force flush completed. Redirecting to about:blank.`);
          window.location.href = "about:blank";
        });
      } else {
        console.log(`${trackingTextPrefix}: Window appears to have closed or is no longer visible.`);
        // 'beforeunload' in tracking.ts should have handled event flushing.
      }
    }, 750); // Delay to check if close was successful. Adjust if needed.
  };


  // Handle beforeunload event for the first 3 minutes (custom prompt)
  useEffect(() => {
    if (!isTimerActive) return // Only active during the initial 3-minute phase with the custom prompt

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const timeElapsed = Date.now() - sessionStartTime
      // Only show custom prompt if 'beforeUnloadActive' is true (i.e., user hasn't interacted with modals yet
      // or we haven't programmatically tried to close the tab)
      if (beforeUnloadActive && timeElapsed < 3 * 60 * 1000) {
        const message = "Are you sure you want to leave? Please complete the 3-minute interaction."
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [sessionStartTime, beforeUnloadActive, isTimerActive]) // isTimerActive ensures this specific prompt logic stops when timer completes

  // Timer for 3-minute popup
  useEffect(() => {
    if (!isTimerActive) return // This timer only runs once for the initial 3 minutes

    threeMinuteTimerRef.current = setTimeout(() => {
      setShowCompletionModal(true)
      setBeforeUnloadActive(false) // After 3 min, disable the custom "Are you sure" prompt
      setIsTimerActive(false) // Stop this specific timer phase

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
  }, [sessionStartTime, isTimerActive]) // Only depends on sessionStartTime and its active state

  // Timer for 5 additional minutes if "Continue Exploring"
  useEffect(() => {
    if (!isInExtendedMode) return // Only run if user chose to continue

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
      setForceCloseCountdown(10)
    }, 5 * 60 * 1000) // 5 minutes

    return () => {
      if (extendedSessionTimerRef.current) clearTimeout(extendedSessionTimerRef.current)
    }
  }, [isInExtendedMode])

  // Countdown timer for forced closure (10 seconds)
  useEffect(() => {
    if (!showForceCloseModal) return

    if (forceCloseCountdown <= 0) {
      console.log("SessionTimer: Force close countdown finished.");
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      const userData = getUserData();
      trackEvent({
        action: "session_force_closed_due_to_timeout",
        username: userData.username,
        text: "Auto-Close: Session force closed after 8-min warning + 10s countdown - initiating close",
        condition: userData.condition,
        participantId: userData.participantId,
      });
      
      setBeforeUnloadActive(false); // Ensure our custom prompt from early phase doesn't interfere
      attemptCloseAndFallback("Auto-Close");
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setForceCloseCountdown((prevCountdown) => prevCountdown - 1)
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [showForceCloseModal, forceCloseCountdown])


  const handleReturnToSurvey = () => {
    console.log("SessionTimer: User clicked 'Return to Survey'.");
    const userData = getUserData();
    trackEvent({
      action: "return_to_survey",
      username: userData.username,
      text: "ReturnToSurveyButton: User clicked button.",
      condition: userData.condition,
      participantId: userData.participantId,
    });

    // Clean up UI and state
    setIsTimerActive(false); // Stop any initial 3-min phase logic
    setBeforeUnloadActive(false); // IMPORTANT: Disable custom "Are you sure?" prompt
    setIsInExtendedMode(false); // Stop extended mode if active
    setShowForceCloseModal(false); // Hide force close modal if somehow visible

    // Clear all timers
    if (threeMinuteTimerRef.current) clearTimeout(threeMinuteTimerRef.current);
    if (extendedSessionTimerRef.current) clearTimeout(extendedSessionTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowCompletionModal(false); // Hide initial modal
    setShowReturnButton(false); // Hide persistent button

    attemptCloseAndFallback("ReturnToSurveyButton");
  };

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
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1002]">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full m-4">
          <h2 className="text-xl font-bold mb-4">Time Limit Reached</h2>
          <p className="mb-6">
            The allocated time for this task is now over.
            The application will close in <span className="font-bold">{forceCloseCountdown}</span> seconds.
          </p>
        </div>
      </div>,
      document.body
    );
  };

  // General cleanup for all timers on component unmount
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
