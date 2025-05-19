import { NextResponse } from "next/server"
import { list } from "@vercel/blob"

export async function GET() {
  try {
    console.log("Exporting all tracking data...")

    // List all tracking files
    const blobs = await list({ prefix: "tracking-events/" })
    console.log(`Found ${blobs.blobs.length} tracking files`)

    // Fetch and combine all events
    const allEvents = []

    for (const blob of blobs.blobs) {
      try {
        console.log(`Fetching events from ${blob.pathname}`)
        const response = await fetch(blob.url)

        if (!response.ok) {
          console.error(`Error response from ${blob.pathname}: ${response.status}`)
          continue
        }

        const events = await response.json()
        console.log(`Retrieved ${events.length} events from ${blob.pathname}`)
        allEvents.push(...events)
      } catch (error) {
        console.error(`Error fetching events from ${blob.pathname}:`, error)
      }
    }

    console.log(`Total events collected: ${allEvents.length}`)

    // Sort events by timestamp
    allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json({ events: allEvents })
  } catch (error) {
    console.error("Error exporting tracking data:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
