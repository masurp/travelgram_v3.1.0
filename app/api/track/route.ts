import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { updateTrackingIndex } from "@/lib/tracking-index"

export async function POST(request: Request) {
  try {
    const { events } = await request.json()

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 })
    }

    // Create a filename with timestamp and random string for uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const randomId = Math.random().toString(36).substring(2, 10)
    const filename = `tracking-events/${timestamp}-${randomId}.json`

    // Store the events in Vercel Blob
    const blob = await put(filename, JSON.stringify(events), {
      contentType: "application/json",
    })

    console.log(`Stored ${events.length} events at ${blob.url}`)

    // Update the tracking index (don't await to avoid blocking)
    updateTrackingIndex().catch((error) => {
      console.error("Failed to update tracking index:", error)
    })

    return NextResponse.json({ success: true, eventsStored: events.length, url: blob.url })
  } catch (error) {
    console.error("Error storing tracking events:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
