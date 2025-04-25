"use client"

import { useEffect, useState } from "react"
import { CheckCircle } from "lucide-react"

interface ReportOverlayProps {
  onComplete: () => void
}

export default function ReportOverlay({ onComplete }: ReportOverlayProps) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    let timer: NodeJS.Timeout

    // Start the countdown
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    } else {
      // When countdown reaches 0, call onComplete
      onComplete()
    }

    // Cleanup function to clear the timer if component unmounts
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [countdown, onComplete])

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50 p-6 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      <h3 className="text-white text-xl font-semibold mb-2">Thanks for your feedback!</h3>
      <p className="text-white mb-4">We will not show this post again.</p>
      <p className="text-white text-sm opacity-70">Removing in {countdown}...</p>
    </div>
  )
}
