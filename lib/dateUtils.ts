// Add a cache for formatted timestamps
const timestampCache = new Map<string, string>()

export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) {
    return "Unknown date"
  }

  // Just return the timestamp as is, since it's already formatted
  // The timestamp is already in the format "X minutes ago", "X hours ago", etc.
  return timestamp
}

// Add a function to clear the cache if needed
export function clearTimestampCache() {
  timestampCache.clear()
}
