"use client"

import type React from "react"
import { useState } from "react"
import { Search, Heart, PlusSquare, Compass, Home } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import CreatePostModal from "./create-post-modal"
import type { Post } from "@/lib/types"
import { useUser } from "@/contexts/UserContext"
import { isDesktop } from "@/lib/deviceUtils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, UserIcon, Settings, Bookmark } from "lucide-react"

interface HeaderProps {
  onSearch: (keyword: string) => void
  onHomeClick: () => void
  onCreatePost: (post: Omit<Post, "id" | "likes" | "comments">) => void
  onProfileClick: (username: string) => void
  onSavedClick?: () => void
  onSettingsClick?: () => void
  onExploreClick?: () => void // Add this new prop
}

export default function Header({
  onSearch,
  onHomeClick,
  onCreatePost,
  onProfileClick,
  onSavedClick,
  onSettingsClick,
  onExploreClick, // Add this new prop
}: HeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { username, profilePhoto, logout } = useUser()
  const desktop = isDesktop()

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(event.target.value)
  }

  const handleProfileClick = () => {
    onProfileClick(username)
  }

  const handleSavedClick = () => {
    if (onSavedClick) {
      onSavedClick()
    } else {
      // Fallback to profile click if no specific handler
      onProfileClick(username)
    }
  }

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick()
    }
  }

  const handleExploreClick = () => {
    if (onExploreClick) {
      onExploreClick()
    }
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <>
      <header className="w-full bg-white dark:bg-gray-800 border-b dark:border-gray-700 fixed top-0 left-0 right-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between">
          {/* Logo - now aligned left and smaller */}
          <div className="relative cursor-pointer h-8 sm:h-10" onClick={onHomeClick}>
            <h1 className={`logo-font ${desktop ? "text-2xl" : "text-xl"} font-bold tracking-wider dark:text-white`}>
              Travelgram
              <span className="absolute -top-1 -right-1 text-base">✈️</span>
            </h1>
          </div>

          {/* Search and Navigation - only on desktop */}
          {desktop && (
            <>
              <div className="hidden md:flex relative max-w-xs w-full mx-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white pl-10 rounded-lg border-none"
                    placeholder="Search captions, locations, users..."
                    onChange={handleSearch}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <Home
                  className="h-5 w-5 sm:h-6 sm:w-6 cursor-pointer hover:text-blue-500 transition-colors dark:text-white"
                  onClick={onHomeClick}
                />
                <PlusSquare
                  className="h-5 w-5 sm:h-6 sm:w-6 cursor-pointer hover:text-blue-500 transition-colors dark:text-white"
                  onClick={() => setShowCreateModal(true)}
                />
                <Compass
                  className="h-5 w-5 sm:h-6 sm:w-6 cursor-pointer hover:text-blue-500 transition-colors dark:text-white"
                  onClick={handleExploreClick}
                />
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 hidden sm:block hover:text-blue-500 transition-colors dark:text-white" />

                {/* Profile dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="cursor-pointer focus:outline-none">
                    <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                      {profilePhoto ? (
                        <AvatarImage
                          src={profilePhoto}
                          alt={username}
                          onError={(e) => {
                            console.error("Error loading profile photo in header:", e)
                            e.currentTarget.src = "" // Clear the src to trigger fallback
                          }}
                        />
                      ) : (
                        <AvatarFallback>{username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 z-50 dark:bg-gray-800 dark:border-gray-700">
                    <DropdownMenuItem
                      onClick={handleProfileClick}
                      className="cursor-pointer dark:text-white dark:hover:bg-gray-700"
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSavedClick}
                      className="cursor-pointer dark:text-white dark:hover:bg-gray-700"
                    >
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>Saved</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSettingsClick}
                      className="cursor-pointer dark:text-white dark:hover:bg-gray-700"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="dark:bg-gray-700" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-red-500 dark:text-red-400 dark:hover:bg-gray-700"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Create Post Modal */}
      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onCreatePost={onCreatePost} />}
    </>
  )
}
