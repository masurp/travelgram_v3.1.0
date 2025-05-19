import { NextResponse } from "next/server"
import { put, list } from "@vercel/blob"
import { v4 as uuidv4 } from "uuid"

// Define export job types
export interface ExportJob {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  format: "json" | "csv"
  startDate: string | null
  endDate: string | null
  createdAt: string
  completedAt: string | null
  fileUrl: string | null
  error: string | null
  progress: {
    filesProcessed: number
    totalFiles: number
    eventsProcessed: number
  }
}

// In-memory store for active jobs (will reset on server restart)
// In production, you'd use a database for this
const activeJobs = new Map<string, ExportJob>()

// GET - List all export jobs
export async function GET() {
  try {
    // Get all jobs from memory
    const jobs = Array.from(activeJobs.values())

    // Also check blob storage for completed jobs that might not be in memory
    const blobs = await list({ prefix: "exports/metadata/" })

    // Load metadata for jobs not in memory
    const additionalJobs: ExportJob[] = []

    for (const blob of blobs.blobs) {
      const jobId = blob.pathname.replace("exports/metadata/", "").replace(".json", "")

      // Skip jobs we already have in memory
      if (activeJobs.has(jobId)) continue

      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          const jobData = await response.json()
          additionalJobs.push(jobData)
        }
      } catch (error) {
        console.error(`Error loading job metadata for ${jobId}:`, error)
      }
    }

    // Combine and sort all jobs by creation date (newest first)
    const allJobs = [...jobs, ...additionalJobs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    return NextResponse.json({ jobs: allJobs })
  } catch (error) {
    console.error("Error listing export jobs:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST - Create a new export job
export async function POST(request: Request) {
  try {
    const { format = "json", startDate = null, endDate = null } = await request.json()

    // Create a new job
    const jobId = uuidv4()
    const job: ExportJob = {
      id: jobId,
      status: "pending",
      format: format as "json" | "csv",
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      completedAt: null,
      fileUrl: null,
      error: null,
      progress: {
        filesProcessed: 0,
        totalFiles: 0,
        eventsProcessed: 0,
      },
    }

    // Store the job
    activeJobs.set(jobId, job)

    // Store job metadata in blob storage
    await put(`exports/metadata/${jobId}.json`, JSON.stringify(job), {
      access: "public",
      contentType: "application/json",
    })

    // Start processing the job in the background
    // Note: This doesn't block the response
    void processExportJob(jobId)

    return NextResponse.json({ job })
  } catch (error) {
    console.error("Error creating export job:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Function to process an export job in the background
async function processExportJob(jobId: string) {
  // Get the job
  const job = activeJobs.get(jobId)
  if (!job) return

  try {
    // Update job status
    job.status = "processing"
    await updateJobMetadata(job)

    // List all tracking files
    const blobs = await list({ prefix: "tracking-events/" })

    // Update progress
    job.progress.totalFiles = blobs.blobs.length
    await updateJobMetadata(job)

    // Sort blobs by uploadedAt (newest first)
    blobs.blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    // Process all events
    const allEvents: any[] = []

    for (const blob of blobs.blobs) {
      try {
        // Fetch events from this file
        const response = await fetch(blob.url)

        if (!response.ok) {
          console.error(`Error response from ${blob.pathname}: ${response.status}`)
          continue
        }

        const events = await response.json()

        // Filter events by date if needed
        const filteredEvents = events.filter((event: any) => {
          const eventDate = new Date(event.timestamp)
          if (job.startDate && eventDate < new Date(job.startDate)) return false
          if (job.endDate && eventDate > new Date(job.endDate)) return false
          return true
        })

        // Add events to our collection
        allEvents.push(...filteredEvents)

        // Update progress
        job.progress.filesProcessed++
        job.progress.eventsProcessed += filteredEvents.length
        await updateJobMetadata(job)
      } catch (error) {
        console.error(`Error processing file ${blob.pathname}:`, error)
      }

      // Give the event loop a chance to breathe
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Sort events by timestamp
    allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Generate the export file based on format
    let exportBlob

    if (job.format === "csv") {
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
          if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          return value
        })
        csv += row.join(",") + "\n"
      }

      exportBlob = await put(`exports/data/${jobId}.csv`, csv, {
        access: "public",
        contentType: "text/csv",
      })
    } else {
      // Generate JSON
      exportBlob = await put(`exports/data/${jobId}.json`, JSON.stringify(allEvents), {
        access: "public",
        contentType: "application/json",
      })
    }

    // Update job with completion info
    job.status = "completed"
    job.completedAt = new Date().toISOString()
    job.fileUrl = exportBlob.url
    await updateJobMetadata(job)

    console.log(`Export job ${jobId} completed successfully`)
  } catch (error) {
    console.error(`Error processing export job ${jobId}:`, error)

    // Update job with error info
    if (job) {
      job.status = "failed"
      job.error = String(error)
      await updateJobMetadata(job)
    }
  }
}

// Helper to update job metadata in blob storage
async function updateJobMetadata(job: ExportJob) {
  try {
    await put(`exports/metadata/${job.id}.json`, JSON.stringify(job), {
      access: "public",
      contentType: "application/json",
    })
  } catch (error) {
    console.error(`Error updating job metadata for ${job.id}:`, error)
  }
}
