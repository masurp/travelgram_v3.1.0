"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { trackEvent } from "@/lib/tracking"
import { useUser } from "@/contexts/UserContext"
import AdLinkModal from "@/components/ad-link-modal"

interface AdPostProps {
  ad: {
    id: string
    username: string
    userAvatar?: string
    contentUrl: string
    caption: string
    link: string
    timestamp: string
  }
  onProfileClick: (username: string) => void
  authors: any[]
}

export default function AdPost({ ad, onProfileClick, authors = [] }: AdPostProps) {
  const [imageError, setImageError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [authorInfo, setAuthorInfo] = useState<any>(null)
  const { username, condition, participantId } = useUser()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const adRef = useRef<HTMLDivElement>(null)

  // Find author information from the authors array
  useEffect(() => {
    const adAuthor = authors.find((author) => author.username.toLowerCase() === ad.username.toLowerCase())

    if (adAuthor) {
      setAuthorInfo(adAuthor)
    }
  }, [ad.username, authors])

  // Set up intersection observer to track when ad is actually visible
  useEffect(() => {
    if (!adRef.current || hasTrackedView) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          // Only track the view when the ad is actually visible
          handleAdView()
          setHasTrackedView(true)
          // Once tracked, no need to keep observing
          observer.disconnect()
        }
      },
      {
        // Ad must be at least 50% visible for at least 1 second to count as viewed
        threshold: 0.5,
        rootMargin: "0px",
      },
    )

    observer.observe(adRef.current)

    return () => {
      observer.disconnect()
    }
  }, [adRef, hasTrackedView])

  const handleImageError = () => {
    setImageError(true)
  }

  const handleAvatarError = () => {
    setAvatarError(true)
  }

  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Track ad click
    if (condition) {
      trackEvent({
        action: "click_ad",
        username,
        postId: ad.id,
        postOwner: ad.username,
        condition,
        participantId,
      })
    }

    // Open the modal
    setIsModalOpen(true)
  }

  const handleAdView = () => {
    // Track ad view
    if (condition) {
      console.log(`Tracking ad view for ad ${ad.id} by ${ad.username}`)
      trackEvent({
        action: "view_ad",
        username,
        postId: ad.id,
        postOwner: ad.username,
        condition,
        participantId,
      })
    }
  }

  // Get the avatar URL - prioritize ad.userAvatar, then author avatar if available
  const avatarUrl = ad.userAvatar || authorInfo?.avatar || authorInfo?.userAvatar

  return (
    <div
      ref={adRef}
      className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative"
    >
      {/* Post header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 cursor-pointer" onClick={() => onProfileClick(ad.username)}>
            {avatarError ? (
              <AvatarFallback>{ad.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            ) : (
              <AvatarImage src={avatarUrl} alt={ad.username} onError={handleAvatarError} />
            )}
          </Avatar>
          <div>
            <p
              className="font-semibold text-sm cursor-pointer dark:text-white"
              onClick={() => onProfileClick(ad.username)}
            >
              {ad.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sponsored</p>
          </div>
        </div>
      </div>

      {/* Ad content */}
      <div className="relative aspect-square">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            Content not available
          </div>
        ) : (
          <Image
            src={ad.contentUrl || "/placeholder.svg"}
            alt={ad.caption || "Advertisement"}
            fill
            className="object-cover"
            onError={handleImageError}
          />
        )}

        {/* Learn More overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
          <Button
            className="bg-white hover:bg-gray-100 text-gray-800 px-6 py-2 rounded-full flex items-center"
            onClick={handleLearnMoreClick}
          >
            Learn More <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Ad caption */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="mb-1">
          <span
            className="font-semibold text-sm mr-2 dark:text-white cursor-pointer"
            onClick={() => onProfileClick(ad.username)}
          >
            {ad.username}
          </span>
          <span className="text-xs sm:text-sm dark:text-gray-300">{ad.caption}</span>
        </div>

        {/* Learn More button at the bottom */}
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center"
            onClick={handleLearnMoreClick}
          >
            Learn More <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </div>
      {/* Ad Link Modal */}
      <AdLinkModal url={ad.link} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
