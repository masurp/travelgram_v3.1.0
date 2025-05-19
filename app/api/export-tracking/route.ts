import { NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { getTrackingIndex } from "@/lib/tracking-index"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"
    const limit = Number.parseInt(searchParams.get("limit") || "10000", 10)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    // Parse date parameters if provided
    const startDate = startDateParam ? new Date(startDateParam) : null
    const endDate = endDateParam ? new Date(endDateParam) : null

    // Get the tracking index
    const index = await getTrackingIndex()

    if (!index) {
      return NextResponse.json({ error: "Failed to retrieve tracking index" }, { status: 500 })
    }

    // Get all events from all files
    const allEvents: any[] = []

    // Process files in order (newest first)
    for (const file of index.files) {
      // Stop if we've reached the limit
      if (allEvents.length >= limit) break

      try {
        // Get the blob
        const blob = await get(file.pathname)
        if (!blob) continue

        // Fetch the content
        const response = await fetch(blob.url)
        const fileEvents = await response.json()

        // Filter events by date if needed
        const filteredEvents = fileEvents.filter((event: any) => {
          const eventDate = new Date(event.timestamp)

          if (startDate && eventDate < startDate) return false
          if (endDate && eventDate > endDate) return false

          return true
        })

        // Add events to our collection
        allEvents.push(...filteredEvents)

        // Check if we've reached the limit
        if (allEvents.length >= limit) {
          allEvents.splice(limit) // Trim to limit
          break
        }
      } catch (error) {
        console.error(`Error processing file ${file.pathname}:`, error)
        // Continue with other files
      }
    }

    // Sort all events by timestamp (newest first)
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // If CSV format is requested, convert to CSV
    if (format === "csv") {
      // Generate CSV content
      const csvContent = generateCsv(allEvents)

      // Return as a downloadable file
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="tracking-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    // Return JSON by default
    return NextResponse.json({ events: allEvents })
  } catch (error) {
    console.error("Error exporting tracking data:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Helper function to generate CSV
function generateCsv(events: any[]): string {
  if (events.length === 0) return "No events found"

  // Get all possible headers from all events
  const allKeys = new Set<string>()
  events.forEach((event) => {
    Object.keys(event).forEach((key) => allKeys.add(key))
  })

  // Convert Set to Array and ensure timestamp and action are first
  const headers = Array.from(allKeys)
  headers.sort((a, b) => {
    if (a === "timestamp") return -1
    if (b === "timestamp") return 1
    if (a === "action") return -1
    if (b === "action") return 1
    if (a === "username") return -1
    if (b === "username") return 1
    return a.localeCompare(b)
  })

  // Create CSV header row
  let csv = headers.join(",") + "\n"

  // Add each event as a row
  events.forEach((event) => {
    const row = headers.map((header) => {
      const value = event[header]

      // Handle different value types
      if (value === null || value === undefined) return ""
      if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
      return value
    })

    csv += row.join(",") + "\n"
  })

  return csv
}
