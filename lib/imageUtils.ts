const BASE_URL = "https://philippmasur.de/research/photogram/"

// Add a cache for image URLs
const imageUrlCache = new Map<string, string>()
const avatarUrlCache = new Map<string, string>()

export function getImageUrl(filename: string): string {
  if (!filename) return "/placeholder.svg"

  // Check cache first
  if (imageUrlCache.has(filename)) {
    return imageUrlCache.get(filename)!
  }

  const url = `${BASE_URL}${filename}.jpg`
  imageUrlCache.set(filename, url)
  return url
}

export function getAvatarUrl(filename: string): string {
  if (!filename) return "/placeholder.svg"

  // Check cache first
  if (avatarUrlCache.has(filename)) {
    return avatarUrlCache.get(filename)!
  }

  const url = `${BASE_URL}${filename}.jpg`
  avatarUrlCache.set(filename, url)
  return url
}

// Add a function to preload common images
export function preloadCommonImages(): void {
  if (typeof window === "undefined") return

  // Create an array of common image filenames
  const commonImages = [
    "placeholder.svg",
    // Add other common images here
  ]

  // Preload each image
  commonImages.forEach((filename) => {
    const img = new Image()
    img.src = getImageUrl(filename)
  })
}

// Call preloadCommonImages when the module is imported
if (typeof window !== "undefined") {
  // Use requestIdleCallback if available, otherwise use setTimeout
  if ("requestIdleCallback" in window) {
    ;(window as any).requestIdleCallback(() => preloadCommonImages())
  } else {
    setTimeout(preloadCommonImages, 1000)
  }
}
