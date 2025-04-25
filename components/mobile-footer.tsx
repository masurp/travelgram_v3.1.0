"use client"

import { Home, PlusSquare, User, Search, Compass } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useUser } from "@/contexts/UserContext"

interface MobileFooterProps {
  onHomeClick: () => void
  onCreatePostClick: () => void
  onProfileClick: () => void
  onSearchClick: () => void
  onExploreClick: () => void
  onLogout: () => void
  onSearchClear?: () => void
}

export default function MobileFooter({
  onHomeClick,
  onCreatePostClick,
  onProfileClick,
  onSearchClick,
  onExploreClick,
  onLogout,
  onSearchClear,
}: MobileFooterProps) {
  const { username, profilePhoto } = useUser()

  const handleHomeClick = () => {
    // Clear search if provided
    if (onSearchClear) {
      onSearchClear()
    }
    onHomeClick()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md py-3 px-6 z-50 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex justify-center items-center gap-10">
        <button className="flex flex-col items-center" onClick={handleHomeClick} aria-label="Home">
          <Home className="h-6 w-6 dark:text-white" />
        </button>

        <button className="flex flex-col items-center" onClick={onSearchClick} aria-label="Search">
          <Search className="h-6 w-6 dark:text-white" />
        </button>

        <button className="flex flex-col items-center" onClick={onCreatePostClick} aria-label="Create post">
          <PlusSquare className="h-6 w-6 dark:text-white" />
        </button>

        <button className="flex flex-col items-center" onClick={onExploreClick} aria-label="Explore">
          <Compass className="h-6 w-6 dark:text-white" />
        </button>

        <button className="flex flex-col items-center" onClick={onProfileClick} aria-label="Profile">
          {profilePhoto ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={profilePhoto} alt={username} />
              <AvatarFallback>{username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-6 w-6 dark:text-white" />
          )}
        </button>
      </div>
    </div>
  )
}
