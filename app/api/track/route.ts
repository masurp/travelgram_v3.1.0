import { NextResponse } from "next/server"
import type { TrackingData } from "@/lib/tracking"

// Server-side storage for events (will reset on server restart)
const serverSideEvents: TrackingData[] = []

export async function POST(request: Request) {
  try {
    const { events } = (await request.json()) as { events: TrackingData[] }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 })
    }

    // Always log events locally first (this will always work)
    console.log("Tracking events received:", JSON.stringify(events, null, 2))

    // Store events in server-side variable
    const logData = events.map((event) => ({
      ...event,
      logged_at: new Date().toISOString(),
    }))

    serverSideEvents.push(...logData)
    console.log(`Successfully logged ${events.length} events locally. Total events: ${serverSideEvents.length}`)

    // Get the Google Apps Script URL from environment variables
    const scriptUrl = process.env.EXPORT_SHEET_URL

    // Only attempt to send to Google Apps Script if URL is configured
    if (scriptUrl) {
      try {
        console.log("Attempting to send events to Google Apps Script at:", scriptUrl)

        // Use a more robust fetch approach with proper error handling
        try {
          // Set a reasonable timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

          // Make the request with proper error handling
          const response = await fetch(scriptUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ events }),
            signal: controller.signal,
            // Add these options to help with CORS and other issues
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            redirect: "follow",
          }).finally(() => clearTimeout(timeoutId))

          if (!response.ok) {
            const errorText = await response.text().catch(() => "No error text available")
            console.error(`HTTP error ${response.status}: ${errorText}`)
          } else {
            const result = await response.text().catch(() => "No response text available")
            console.log("Successfully sent events to Google Apps Script:", result)
          }
        } catch (fetchError) {
          console.error("Fetch operation failed:", fetchError)
          // Don't rethrow - we want to continue even if fetch fails
        }
      } catch (error) {
        console.error("Failed to send events to Google Apps Script:", error)
        // Continue execution even if Google Apps Script fails
      }
    } else {
      console.log("EXPORT_SHEET_URL not configured, skipping Google Apps Script integration")
    }

    // Return success regardless of external service status
    return NextResponse.json({
      success: true,
      message: "Events processed locally",
      count: events.length,
    })
  } catch (error) {
    console.error("Error processing tracking events:", error)
    // Even if there's an error, return a 200 status to prevent client retries
    return NextResponse.json(
      {
        success: false,
        error: "Events logged but not processed",
        details: String(error),
      },
      { status: 200 },
    )
  }
}
