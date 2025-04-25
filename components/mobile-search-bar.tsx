"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileSearchBarProps {
  onSearch: (keyword: string) => void
  onClose: () => void
  searchTerm?: string
}

export default function MobileSearchBar({ onSearch, onClose, searchTerm = "" }: MobileSearchBarProps) {
  const [searchValue, setSearchValue] = useState(searchTerm)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Update local state if the prop changes
  useEffect(() => {
    setSearchValue(searchTerm)
  }, [searchTerm])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    onSearch(value)
  }

  const handleClear = () => {
    setSearchValue("")
    onSearch("")
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="fixed top-12 left-0 right-0 bg-white dark:bg-gray-800 p-2 z-40 border-b border-gray-200 dark:border-gray-700 shadow-md animate-slide-down">
      <div className="relative flex items-center">
        <Button variant="ghost" size="icon" className="absolute left-0 h-8 w-8" onClick={onClose} aria-label="Back">
          <ArrowLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </Button>

        <Input
          ref={inputRef}
          type="text"
          placeholder="Search posts, users, or locations..."
          value={searchValue}
          onChange={handleSearch}
          className="pl-10 pr-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />

        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-0 h-8 w-8"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </Button>
        )}
      </div>
    </div>
  )
}
