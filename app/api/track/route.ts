import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import type { TrackingData } from "@/lib/tracking"

export async function POST(request: Request) {
  try {
    const { events } = (await request.json()) as { events: TrackingData[] }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 })
    }

    // Log events for debugging
    console.log(`Received ${events.length} tracking events`)

    // Create a unique filename with date-based prefix for better organization
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const batchId = Math.random().toString(36).substring(2, 10)
    const filename = `tracking-events/${today}/${timestamp}-${batchId}.json`

    try {
      // Store events as JSON in Vercel Blob
      const blob = await put(filename, JSON.stringify(events), {
        access: "public", // This is required
        contentType: "application/json",
      })

      console.log(`Successfully stored ${events.length} events in Blob: ${blob.url}`)

      return NextResponse.json({
        success: true,
        message: "Events stored in Blob",
        count: events.length,
        blobUrl: blob.url,
      })
    } catch (error) {
      console.error("Failed to store events in Blob:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to store events",
          details: String(error),
        },
        { status: 200 }, // Still return 200 to prevent client retries
      )
    }
  } catch (error) {
    console.error("Error processing tracking events:", error)
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
