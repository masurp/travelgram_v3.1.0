export function isDesktop() {
  if (typeof window !== "undefined") {
    return window.innerWidth >= 768 // Consider devices with width >= 768px as desktop
  }
  return false // Default to false if window is not available (e.g., during SSR)
}
