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
  | "session_milestone"
  | "return_to_survey"
  | "continue_exploring"
  | "session_extended_time_limit_reached" // New event for 8-min mark
  | "session_force_closed_due_to_timeout" // New event for final closure

// Define the tracking data structure
export interface TrackingData {
  action: TrackingAction
  username: string
  postId?: string
  postOwner?: string
  timestamp: string
  text?: string
  condition: Condition | null
  contentUrl?: string
  participantId?: string | null
}

let trackingQueue: TrackingData[] = []
let isSending = false
let isTrackingEnabled = true
let failedAttempts = 0
let sendTimer: ReturnType<typeof setTimeout> | null = null

const MAX_FAILED_ATTEMPTS = 3
const BACKOFF_TIME = 5 * 60 * 1000
const DEBOUNCE_TIME = 500
const MAX_BATCH_SIZE = 25
const FORCE_SEND_INTERVAL = 30 * 1000

let forceTimer: ReturnType<typeof setTimeout> | null = null
let localEvents: TrackingData[] = []
let isForceFlushingInProgress = false; // Flag for the new force flush mechanism

export function trackEvent(data: Omit<TrackingData, "timestamp" | "participantId"> & { participantId?: string | null }) {
  if (!isTrackingEnabled) {
    console.log("Tracking disabled, event logged locally:", data)
    return
  }

  const trackingData: TrackingData = {
    ...data,
    timestamp: new Date().toISOString(),
    participantId: data.participantId !== undefined ? data.participantId : null, // Ensure participantId is explicitly handled
  }

  localEvents.push(trackingData)
  if (localEvents.length > 1000) {
    localEvents = localEvents.slice(-1000)
  }

  trackingQueue.push(trackingData)

  if (sendTimer) {
    clearTimeout(sendTimer)
  }

  sendTimer = setTimeout(() => {
    void processQueue()
  }, DEBOUNCE_TIME)

  if (!forceTimer && trackingQueue.length > 0) {
    startForceSendTimer()
  }
}

function startForceSendTimer() {
  if (forceTimer) {
    clearTimeout(forceTimer)
  }
  forceTimer = setTimeout(() => {
    console.log("Force sending tracking events due to time interval")
    void processQueue(true)
    forceTimer = null
    if (trackingQueue.length > 0) {
      startForceSendTimer()
    }
  }, FORCE_SEND_INTERVAL)
}

async function processQueue(force = false) {
  if (isSending || trackingQueue.length === 0 || !isTrackingEnabled || isForceFlushingInProgress) {
    // If a force flush is in progress, let it handle the queue
    if (isForceFlushingInProgress) console.log("processQueue: Force flush in progress, deferring regular processing.");
    return;
  }

  if (trackingQueue.length < MAX_BATCH_SIZE && !force) {
    return
  }

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    console.log(`Too many failed attempts (${failedAttempts}). Backing off for ${BACKOFF_TIME / 1000} seconds.`)
    setTimeout(() => {
      console.log("Backoff period ended. Re-enabling tracking attempts.")
      failedAttempts = 0
      void processQueue()
    }, BACKOFF_TIME)
    return
  }

  isSending = true
  try {
    const batch = trackingQueue.slice(0, MAX_BATCH_SIZE)
    // IMPORTANT: Do not modify trackingQueue here yet if sendToApi might be slow
    // or if forceFlushAllEvents needs to see the full queue.
    // However, standard processQueue logic should remove after attempting send.

    const success = await sendToApi(batch); // sendToApi now returns boolean
    if (success) {
      failedAttempts = 0;
      trackingQueue = trackingQueue.slice(batch.length); // Remove successfully sent batch
    } else {
      failedAttempts++;
      // Do not remove batch from queue on failure, it will be retried by processQueue logic or backoff
      // unless a force flush takes it. This is a change from original.
      // Original: trackingQueue = trackingQueue.slice(batch.length); (removed regardless of success)
      // New: Only remove on success to allow retries.
      // However, for this specific problem, the original behavior of removing always might be
      // what was intended to prevent indefinite queue growth if API is truly broken.
      // Let's stick to original: remove batch after attempt.
      trackingQueue = trackingQueue.slice(batch.length);
      console.warn("Batch removed from queue after send attempt (success or failure).")
    }

  } catch (error) {
    console.error("Error processing tracking events in processQueue:", error)
    // To prevent blocking, remove the batch that caused error.
    trackingQueue = trackingQueue.slice(0, MAX_BATCH_SIZE); // Assuming batch was first MAX_BATCH_SIZE
    failedAttempts++;
  } finally {
    isSending = false
    if (trackingQueue.length > 0 && isTrackingEnabled && !isForceFlushingInProgress) {
      if (trackingQueue.length >= MAX_BATCH_SIZE) {
        setTimeout(() => void processQueue(), 100)
      }
    }
  }
}

async function sendToApi(events: TrackingData[]): Promise<boolean> {
  if (events.length === 0) return true; // No events to send
  try {
    const timeout = failedAttempts > 0 ? 8000 : 5000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      signal: controller.signal,
      cache: "no-cache",
      credentials: "same-origin",
      redirect: "follow",
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      console.log(`Successfully sent ${events.length} tracking events to API`)
      return true
    } else {
      console.warn(`API responded with status ${response.status} for ${events.length} events.`)
      return false
    }
  } catch (error) {
    // Check if error is AbortError for timeout
    if (error instanceof Error && error.name === 'AbortError') {
        console.error("Error sending to API: Request timed out.", error);
    } else {
        console.error("Error sending to API:", error);
    }
    return false
  }
}

/**
 * Force flushes all events in the tracking queue.
 * This function will attempt to send all queued events in batches.
 * It's intended for use before critical actions like closing the window.
 * @param callback - A function to execute after all flush attempts are made.
 */
export async function forceFlushAllEvents(callback?: () => void): Promise<void> {
  if (!isTrackingEnabled) {
    console.log("Tracking is disabled. Skipping force flush.");
    if (callback) callback();
    return;
  }

  if (isForceFlushingInProgress) {
    console.warn("Force flush already in progress. New request ignored or callback queued (currently ignored).");
    // Potentially queue callbacks or wait, but for now, first one wins.
    if (callback) {
        console.log("Executing additional callback immediately as a flush is already in progress.");
        callback(); // Or queue it. For now, execute.
    }
    return;
  }

  isForceFlushingInProgress = true;
  console.log("Force flushing all tracking events...");

  // Clear regular timers to prevent interference
  if (sendTimer) clearTimeout(sendTimer);
  sendTimer = null;
  if (forceTimer) clearTimeout(forceTimer);
  forceTimer = null;

  const eventsToFlush = [...trackingQueue]; // Take a snapshot
  trackingQueue = []; // Clear the main queue; these events are now handled by the flush

  if (eventsToFlush.length > 0) {
    console.log(`Attempting to send ${eventsToFlush.length} events during force flush.`);
    
    const tempQueue = [...eventsToFlush];
    let allSuccessfullySent = true;

    while (tempQueue.length > 0) {
      const batch = tempQueue.splice(0, MAX_BATCH_SIZE);
      console.log(`Force flushing batch of ${batch.length} events.`);
      const success = await sendToApi(batch);
      if (!success) {
        allSuccessfullySent = false;
        console.warn("A batch failed to send during force flush. These events might be lost.");
        // Events are already in localEvents. No re-queueing here for simplicity on "unload" type flush.
      }
    }
    if (allSuccessfullySent) {
        console.log("All queued events were force flushed successfully.");
    } else {
        console.warn("Some events failed to send during force flush.");
    }
  } else {
    console.log("No events in queue to force flush.");
  }
  
  // Any events added to trackingQueue *during* this async flush process
  // will be picked up by the next regular processQueue or beforeunload.
  // This is generally acceptable.

  isForceFlushingInProgress = false;
  console.log("Force flush process completed.");
  if (callback) {
    console.log("Executing callback after force flush.");
    callback();
  }

  // Restart force send timer if there are new events (unlikely if app is closing, but for completeness)
  // And if tracking is still enabled
  if (trackingQueue.length > 0 && isTrackingEnabled && !forceTimer) {
    startForceSendTimer();
  }
}


if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (event) => {
    console.log("beforeunload fired. Timestamp:", new Date().toISOString());

    if (isForceFlushingInProgress) {
        console.log("beforeunload: Force flush is already in progress. Relying on that.");
        // Optionally, try to give it a bit more time, but sendBeacon is best here.
        // For now, let the ongoing forceFlush attempt, or if it's quick, sendBeacon might still run.
    }

    if (trackingQueue.length > 0 && isTrackingEnabled) {
      try {
        console.log(`beforeunload: Sending ${trackingQueue.length} remaining events.`);
        const currentQueueContentForLog = JSON.stringify(trackingQueue.slice(0, 5));
        console.log(`beforeunload: Sample of queue: ${currentQueueContentForLog}`);

        const data = JSON.stringify({ events: trackingQueue });
        console.log(`beforeunload: Beacon data size: ${data.length} bytes`);
        const success = navigator.sendBeacon("/api/track", data);

        if (success) {
          console.log("beforeunload: Successfully initiated sendBeacon for remaining events.");
          trackingQueue = []; // Optimistically clear
        } else {
          console.warn("beforeunload: sendBeacon failed. Events might be lost if not using fallback or if page closes too fast.");
          // Fallback to synchronous XHR (original code had this, keeping it for robustness)
          // Note: Synchronous XHR on main thread is deprecated and can be blocked by browsers.
          // sendBeacon is preferred.
          try {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/track", false); // false makes it synchronous
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(data);
            console.log(`beforeunload: Fallback XHR status: ${xhr.status}, Response: ${xhr.responseText.substring(0,100)}`);
            if (xhr.status >= 200 && xhr.status < 300) {
                trackingQueue = []; // Clear if XHR seemed to work
            }
          } catch (xhrError) {
            console.error("beforeunload: Error during synchronous XHR send:", xhrError);
          }
        }
      } catch (error) {
        console.error("beforeunload: Error in handler:", error);
      }
    } else {
      if (trackingQueue.length === 0) {
        console.log("beforeunload: No events in trackingQueue to send.");
      }
      if (!isTrackingEnabled) {
        console.log("beforeunload: Tracking is not enabled.");
      }
    }
  });
}

export function getLocalEvents() {
  return [...localEvents];
}

export function setTrackingEnabled(enabled: boolean) {
  isTrackingEnabled = enabled;
  console.log(`Tracking ${enabled ? "enabled" : "disabled"}`);
  if (!enabled) {
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = null;
    if (forceTimer) clearTimeout(forceTimer);
    forceTimer = null;
  } else {
      // If enabling and queue has items, try to process
      if(trackingQueue.length > 0) {
          void processQueue();
          if(!forceTimer) startForceSendTimer();
      }
  }
  return isTrackingEnabled;
}

export function resetFailedAttempts() {
  failedAttempts = 0;
  return failedAttempts;
}

export function cleanupTracking() {
  if (sendTimer) {
    clearTimeout(sendTimer);
    sendTimer = null;
  }
  if (forceTimer) {
    clearTimeout(forceTimer);
    forceTimer = null;
  }
  // Potentially clear queue or localEvents if it's a hard reset,
  // but current use seems to be for component unmounts/navigation.
  console.log("Tracking timers cleaned up.");
}
