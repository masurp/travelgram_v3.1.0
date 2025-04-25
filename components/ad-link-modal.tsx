"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { X, ArrowLeft, ArrowRight, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdLinkModalProps {
  url: string
  isOpen: boolean
  onClose: () => void
}

export default function AdLinkModal({ url, isOpen, onClose }: AdLinkModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [currentUrl, setCurrentUrl] = useState(url)
  const [urlHistory, setUrlHistory] = useState<string[]>([])
  const [forwardHistory, setForwardHistory] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [displayUrl, setDisplayUrl] = useState("")
  const [iframeError, setIframeError] = useState(false)

  // Reset state when modal opens with a new URL
  useEffect(() => {
    if (isOpen) {
      setCurrentUrl(url)
      setUrlHistory([])
      setForwardHistory([])
      setIframeError(false)
      setDisplayUrl(url)
    }
  }, [isOpen, url])

  useEffect(() => {
    // Prevent scrolling on the body when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    // Cleanup function
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  const navigateTo = (newUrl: string) => {
    setIsLoading(true)
    // Add current URL to history before navigating
    setUrlHistory((prev) => [...prev, currentUrl])
    setForwardHistory([])
    setCurrentUrl(newUrl)
    setDisplayUrl(newUrl)
  }

  const goBack = () => {
    if (urlHistory.length > 0) {
      setIsLoading(true)
      const previousUrl = urlHistory[urlHistory.length - 1]
      const newHistory = urlHistory.slice(0, -1)

      setForwardHistory([currentUrl, ...forwardHistory])
      setCurrentUrl(previousUrl)
      setUrlHistory(newHistory)
      setDisplayUrl(previousUrl)
    }
  }

  const goForward = () => {
    if (forwardHistory.length > 0) {
      setIsLoading(true)
      const nextUrl = forwardHistory[0]
      const newForwardHistory = forwardHistory.slice(1)

      setUrlHistory([...urlHistory, currentUrl])
      setCurrentUrl(nextUrl)
      setForwardHistory(newForwardHistory)
      setDisplayUrl(nextUrl)
    }
  }

  const refresh = () => {
    setIsLoading(true)
    // Force iframe refresh by setting to empty and then back
    const current = currentUrl
    setCurrentUrl("")
    setTimeout(() => setCurrentUrl(current), 50)
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handleIframeError = () => {
    setIframeError(true)
    setIsLoading(false)
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayUrl(e.target.value)
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let newUrl = displayUrl

    // Add https:// if not present
    if (!/^https?:\/\//i.test(newUrl)) {
      newUrl = `https://${newUrl}`
    }

    navigateTo(newUrl)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="relative w-full h-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col"
      >
        {/* Browser-like header */}
        <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={urlHistory.length === 0}
                onClick={goBack}
                className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                disabled={forwardHistory.length === 0}
                onClick={goForward}
                className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">Forward</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* URL bar */}
          <form onSubmit={handleUrlSubmit} className="px-2 pb-2">
            <div className="flex items-center w-full bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
              <input
                type="text"
                value={displayUrl}
                onChange={handleUrlChange}
                className="flex-grow px-3 py-1.5 bg-transparent focus:outline-none text-sm"
                placeholder="Enter URL"
              />
              <Button type="submit" variant="ghost" size="sm" className="mr-1">
                Go
              </Button>
            </div>
          </form>
        </div>

        {/* Content area */}
        <div className="flex-grow overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-80 z-10">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-500 mb-2" />
                <p className="text-sm text-gray-500">Loading content...</p>
              </div>
            </div>
          )}

          {iframeError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-6">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Content cannot be displayed</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This website has security settings that prevent it from being displayed in our app.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={refresh} className="flex items-center justify-center">
                  Try Again <RefreshCw className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(currentUrl, "_blank", "noopener,noreferrer")}
                  className="flex items-center justify-center"
                >
                  Open in Browser <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            currentUrl && (
              <iframe
                src={currentUrl}
                className="w-full h-full border-0"
                title="Advertisement Content"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            )
          )}
        </div>

        {/* Status bar */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex justify-between items-center text-xs text-gray-500">
          <div>{isLoading ? "Loading..." : "Ready"}</div>
          <div className="flex items-center">
            <span className="mr-2">Viewing ad content</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClose}>
              Return to Feed
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
