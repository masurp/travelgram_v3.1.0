"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"

interface LikeAnimationProps {
  isActive: boolean
  onAnimationComplete: () => void
}

export default function LikeAnimation({ isActive, onAnimationComplete }: LikeAnimationProps) {
  const [showHeart, setShowHeart] = useState(false)

  useEffect(() => {
    if (isActive) {
      setShowHeart(true)

      // Clean up after animation completes
      const timer = setTimeout(() => {
        setShowHeart(false)
        onAnimationComplete()
      }, 1500) // Animation duration increased to 1.5s

      return () => clearTimeout(timer)
    }
  }, [isActive, onAnimationComplete])

  if (!isActive && !showHeart) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      {showHeart && (
        <div className="animate-heart-fly">
          <Heart className="h-16 w-16 text-red-500 fill-red-500" />
        </div>
      )}
    </div>
  )
}
