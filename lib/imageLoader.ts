// Create a new utility for optimized image loading
import { getImageUrl, getAvatarUrl } from "./imageUtils"

// Cache for preloaded images
const imageCache = new Map<string, boolean>()

// Preload an image and return a promise that resolves when the image is loaded
export function preloadImage(url: string): Promise<boolean> {
  // Check if the image is already in the cache
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url) || false)
  }

  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      imageCache.set(url, true)
      resolve(true)
    }

    img.onerror = () => {
      imageCache.set(url, false)
      resolve(false)
    }

    img.src = url
  })
}

// Preload a batch of images
export async function preloadImages(urls: string[]): Promise<void> {
  // Use Promise.allSettled to continue even if some images fail to load
  await Promise.allSettled(urls.map((url) => preloadImage(url)))
}

// Get an image URL with fallback
export function getImageUrlWithFallback(filename: string, fallback = "/placeholder.svg"): string {
  if (!filename) return fallback
  const url = getImageUrl(filename)

  // Preload the image in the background
  preloadImage(url)

  return url
}

// Get an avatar URL with fallback
export function getAvatarUrlWithFallback(filename: string, fallback = "/placeholder.svg"): string {
  if (!filename) return fallback
  const url = getAvatarUrl(filename)

  // Preload the image in the background
  preloadImage(url)

  return url
}

// Check if an image is in the cache and valid
export function isImageCached(url: string): boolean {
  return imageCache.get(url) === true
}
