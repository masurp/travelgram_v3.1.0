import type { Condition } from "./types"

// Define the types of actions we want to track
export type TrackingAction =
  | "view_post"
  | "click_post"
  | "view_profile"
  | "follow_user"
  | "unfollow_user"
  | "save_post"
  | "unsave_post"
  | "like_post"
  | "unlike_post"
  | "comment_post"
  | "create_post"
  | "update_profile"
  | "report_post"
  | "view_ad"
  | "click_ad"
  | "search"
  | "register_username"
  | "register_fullname"
  | "register_bio"
  | "register_browser_info"
  | "register_profile_photo"
  | "upload_profile_photo"
  | "delete_post"
  | "edit_post"

// Define the tracking data structure
export interface TrackingData {
  action: TrackingAction
  username: string
  postId?: string
  postOwner?: string
  timestamp: string
  text?: string
  condition: Condition | null
  contentUrl?: string // Add this field to store image data
  participantId?: string | null // Add this line
}

// Queue to store tracking events before sending
let trackingQueue: TrackingData[] = []
let isSending = false
let isTrackingEnabled = true // Flag to disable tracking if it's causing issues
let failedAttempts = 0 // Track failed attempts to implement backoff
let sendTimer: ReturnType<typeof setTimeout> | null = null

// Maximum number of failed attempts before backing off
const MAX_FAILED_ATTEMPTS = 3
// Backoff time in milliseconds (5 minutes)
const BACKOFF_TIME = 5 * 60 * 1000
// Debounce time for sending events (500ms)
const DEBOUNCE_TIME = 500
// Maximum batch size
const MAX_BATCH_SIZE = 25
// Force send interval (30 seconds)
const FORCE_SEND_INTERVAL = 30 * 1000

// Add a new variable for the force send timer
let forceTimer: ReturnType<typeof setTimeout> | null = null

// Local storage for events if sending fails
let localEvents: TrackingData[] = []

// Function to track an event with debouncing
export function trackEvent(data: Omit<TrackingData, "timestamp">) {
  // If tracking is disabled, just log locally and return
  if (!isTrackingEnabled) {
    console.log("Tracking disabled, event logged locally:", data)
    return
  }

  // Add timestamp
  const trackingData: TrackingData = {
    ...data,
    timestamp: new Date().toISOString(),
    // participantId is already included in data if provided
  }

  // Always store locally first
  localEvents.push(trackingData)

  // Keep local storage from growing too large
  if (localEvents.length > 1000) {
    localEvents = localEvents.slice(-1000)
  }

  // Add to queue
  trackingQueue.push(trackingData)

  // Clear existing debounce timer if any
  if (sendTimer) {
    clearTimeout(sendTimer)
  }

  // Set a new timer to process the queue after a delay
  sendTimer = setTimeout(() => {
    void processQueue()
  }, DEBOUNCE_TIME)

  // Start the force send timer if it's not already running
  if (!forceTimer && trackingQueue.length > 0) {
    startForceSendTimer()
  }
}

// Add a new function to start the force send timer
function startForceSendTimer() {
  // Clear any existing timer
  if (forceTimer) {
    clearTimeout(forceTimer)
  }

  // Set a new timer to force send events after the interval
  forceTimer = setTimeout(() => {
    console.log("Force sending tracking events due to time interval")
    void processQueue(true) // Pass true to indicate this is a forced send
    forceTimer = null

    // If there are still events in the queue, start the timer again
    if (trackingQueue.length > 0) {
      startForceSendTimer()
    }
  }, FORCE_SEND_INTERVAL)
}

// Process the tracking queue with batching
async function processQueue(force = false) {
  // If already sending or queue is empty or tracking disabled, return
  if (isSending || trackingQueue.length === 0 || !isTrackingEnabled) return

  // Only process if we have enough events or if forced
  if (trackingQueue.length < MAX_BATCH_SIZE && !force) {
    return
  }

  // If we've had too many failures, implement backoff
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    console.log(`Too many failed attempts (${failedAttempts}). Backing off for ${BACKOFF_TIME / 1000} seconds.`)

    // Re-enable tracking after backoff period
    setTimeout(() => {
      console.log("Backoff period ended. Re-enabling tracking.")
      failedAttempts = 0
      void processQueue() // Try again after backoff
    }, BACKOFF_TIME)

    return
  }

  isSending = true

  try {
    // Get the next batch of events (up to MAX_BATCH_SIZE)
    const batch = trackingQueue.slice(0, MAX_BATCH_SIZE)

    try {
      // Try to send to the API, but don't wait for it or let it block
      const success = await sendToApi(batch).catch((error) => {
        console.error("Background API send failed:", error)
        return false
      })

      if (success) {
        // Reset failed attempts counter on success
        failedAttempts = 0
      } else {
        // Increment failed attempts counter
        failedAttempts++
      }

      // Remove sent events from queue regardless of API success
      // This prevents the queue from growing indefinitely if the API is down
      trackingQueue = trackingQueue.slice(batch.length)
    } catch (error) {
      console.error("Error processing tracking events:", error)
      // Don't retry, just remove the batch to prevent blocking
      trackingQueue = trackingQueue.slice(batch.length)
      // Increment failed attempts counter
      failedAttempts++
    }
  } finally {
    isSending = false

    // If there are more events in the queue, process them
    if (trackingQueue.length > 0 && isTrackingEnabled) {
      // If we have enough events for another batch, process immediately
      if (trackingQueue.length >= MAX_BATCH_SIZE) {
        setTimeout(() => void processQueue(), 100)
      }
      // Otherwise, wait for more events or the force timer
    }
  }
}

// Send events to API without blocking or throwing
async function sendToApi(events: TrackingData[]): Promise<boolean> {
  try {
    // Use a longer timeout if we've had failures
    const timeout = failedAttempts > 0 ? 8000 : 5000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events }),
        signal: controller.signal,
        // Add these options to help with potential issues
        cache: "no-cache",
        credentials: "same-origin",
        redirect: "follow",
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`Successfully sent ${events.length} tracking events to API`)
        return true
      } else {
        console.warn(`API responded with status ${response.status}`)
        return false
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    console.error("Error sending to API:", error)
    return false
  }
}

// Flush the queue before the page unloads, but don't block page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (event) => {
    // Add it right here:
    console.log("beforeunload fired. Timestamp:", new Date().toISOString()) // Added timestamp for more context

    if (trackingQueue.length > 0 && isTrackingEnabled) {
      try {
        // Log the number of events being sent
        console.log(`Sending ${trackingQueue.length} remaining events before unload`)
        const currentQueueContentForLog = JSON.stringify(trackingQueue.slice(0, 5)) // Log first 5 events for inspection
        console.log(`Sample of queue: ${currentQueueContentForLog}`)

        // Use sendBeacon which is designed for this purpose
        const data = JSON.stringify({ events: trackingQueue })
        console.log(`Beacon data size: ${data.length} bytes`) // Log data size

        const success = navigator.sendBeacon("/api/track", data)

        if (success) {
          console.log("Successfully initiated sendBeacon for remaining events")
        } else {
          console.warn("sendBeacon failed, attempting fetch as fallback")

          // Fallback to synchronous fetch if sendBeacon fails
          const xhr = new XMLHttpRequest()
          xhr.open("POST", "/api/track", false) // false makes it synchronous
          xhr.setRequestHeader("Content-Type", "application/json")

          // It's good practice to wrap xhr.send in a try-catch as well,
          // as it can throw errors in some environments or if network is down.
          try {
            xhr.send(data)
            console.log(`Fallback XHR status: ${xhr.status}, Response: ${xhr.responseText}`)
          } catch (xhrError) {
            console.error("Error during synchronous XHR send:", xhrError)
            console.log(`Fallback XHR status after error: ${xhr.status}`) // Status might be 0
          }
        }

        // Clear the queue optimistically
        // Consider if you ONLY want to clear if beacon/XHR was successful or initiated.
        // For sendBeacon, "success" means it was queued by the browser, not that the server got it.
        // For synchronous XHR, status 2xx usually means server got it.
        // Your current optimistic clear is probably fine for this use case.
        trackingQueue = []
      } catch (error) {
        console.error("Error in beforeunload handler:", error)
      }
    } else {
      // Log why it didn't proceed
      if (trackingQueue.length === 0) {
        console.log("beforeunload: No events in trackingQueue to send.")
      }
      if (!isTrackingEnabled) {
        console.log("beforeunload: Tracking is not enabled.")
      }
    }
  })
}

// Export function to get local events (for debugging)
export function getLocalEvents() {
  return [...localEvents]
}

// Export function to enable/disable tracking
export function setTrackingEnabled(enabled: boolean) {
  isTrackingEnabled = enabled
  console.log(`Tracking ${enabled ? "enabled" : "disabled"}`)
  return isTrackingEnabled
}

// Export function to reset failed attempts counter (for debugging/testing)
export function resetFailedAttempts() {
  failedAttempts = 0
  return failedAttempts
}

// Add a cleanup function to clear timers when needed
export function cleanupTracking() {
  if (sendTimer) {
    clearTimeout(sendTimer)
    sendTimer = null
  }

  if (forceTimer) {
    clearTimeout(forceTimer)
    forceTimer = null
  }
}
