import { NextResponse } from "next/server"
import { list } from "@vercel/blob"

export const config = {
  runtime: "nodejs",
  maxDuration: 60, // Extend the function timeout to 60 seconds
}

export async function GET(request: Request) {
  try {
    console.log("Exporting all tracking data...")

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"
    const limit = Number.parseInt(searchParams.get("limit") || "10000", 10)
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate") as string) : null
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate") as string) : null

    // List all tracking files
    const blobs = await list({ prefix: "tracking-events/" })
    console.log(`Found ${blobs.blobs.length} tracking files`)

    // Sort blobs by uploadedAt (newest first) to prioritize recent data
    blobs.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    // Process files in chunks to avoid memory issues
    const allEvents = []
    let totalProcessed = 0
    let totalEvents = 0

    for (const blob of blobs.blobs) {
      // Stop if we've reached the limit
      if (totalEvents >= limit) {
        console.log(`Reached limit of ${limit} events, stopping`)
        break
      }

      try {
        console.log(`Fetching events from ${blob.pathname}`)
        const response = await fetch(blob.url)

        if (!response.ok) {
          console.error(`Error response from ${blob.pathname}: ${response.status}`)
          continue
        }

        // Parse events from this file
        const events = await response.json()
        console.log(`Retrieved ${events.length} events from ${blob.pathname}`)

        // Filter events by date if needed
        const filteredEvents = events.filter((event) => {
          const eventDate = new Date(event.timestamp)
          if (startDate && eventDate < startDate) return false
          if (endDate && eventDate > endDate) return false
          return true
        })

        // Add events to our collection, up to the limit
        const eventsToAdd = filteredEvents.slice(0, limit - totalEvents)
        allEvents.push(...eventsToAdd)
        totalEvents += eventsToAdd.length

        console.log(`Added ${eventsToAdd.length} events, total now: ${totalEvents}`)
      } catch (error) {
        console.error(`Error fetching events from ${blob.pathname}:`, error)
      }

      totalProcessed++

      // Process in batches of 10 files to avoid timeouts
      if (totalProcessed % 10 === 0) {
        console.log(`Processed ${totalProcessed}/${blobs.blobs.length} files`)
        // Give the event loop a chance to breathe
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`Total events collected: ${allEvents.length}`)

    // Sort events by timestamp
    allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Return based on requested format
    if (format === "csv") {
      // Generate CSV
      const headers = [
        "timestamp",
        "action",
        "username",
        "postId",
        "postOwner",
        "text",
        "condition",
        "contentUrl",
        "participantId",
      ]

      let csv = headers.join(",") + "\n"

      for (const event of allEvents) {
        const row = headers.map((header) => {
          const value = event[header]
          if (value === null || value === undefined) return ""
          // Escape commas and quotes in string values
          if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
          return value
        })
        csv += row.join(",") + "\n"
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="tracking-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    } else {
      // Return JSON (default)
      return NextResponse.json({
        events: allEvents,
        meta: {
          totalFiles: blobs.blobs.length,
          filesProcessed: totalProcessed,
          totalEvents: allEvents.length,
          limit,
        },
      })
    }
  } catch (error) {
    console.error("Error exporting tracking data:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
