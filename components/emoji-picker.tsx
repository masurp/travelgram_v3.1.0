"use client"

import { useState, useRef, useEffect } from "react"
import { Smile } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  position?: "top" | "bottom"
}

// Common emojis that would be useful for a travel social media app
const commonEmojis = [
  "😀",
  "😍",
  "🥰",
  "😎",
  "🤩",
  "👍",
  "❤️",
  "🔥",
  "✈️",
  "🏝️",
  "🏖️",
  "🌅",
  "🌄",
  "🌊",
  "🏔️",
  "🗻",
  "🌴",
  "🌲",
  "🍹",
  "🥂",
  "🍽️",
  "📸",
  "🎉",
  "🌍",
  "🚗",
  "🚂",
  "🚢",
  "🏨",
  "🏰",
  "🗽",
  "🏛️",
  "🏞️",
]

export default function EmojiPicker({ onEmojiSelect, position = "top" }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    setIsOpen(false)
  }

  // Close the picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open emoji picker"
      >
        <Smile className="h-5 w-5 text-gray-500" />
      </Button>

      {isOpen && (
        <div
          className={`absolute ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"} right-0 bg-white rounded-lg shadow-lg border p-2 z-50 w-64 max-w-[90vw]`}
          style={{ maxHeight: "200px", overflowY: "auto" }}
        >
          <div className="grid grid-cols-8 gap-1">
            {commonEmojis.map((emoji, index) => (
              <button
                key={`emoji-${index}`}
                className="text-xl p-1 hover:bg-gray-100 rounded cursor-pointer"
                onClick={() => handleEmojiClick(emoji)}
                aria-label={`Emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
