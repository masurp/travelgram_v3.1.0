"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Download, RefreshCw } from "lucide-react"

interface TrackingFile {
  filename: string
  url: string
  size: number
  uploadedAt: string
}

interface ExportJob {
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

export default function TrackingDashboard() {
  const [files, setFiles] = useState<TrackingFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [totalFiles, setTotalFiles] = useState(0)

  // Export options
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showExportOptions, setShowExportOptions] = useState(false)

  // Export jobs
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [creatingJob, setCreatingJob] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [jobRefreshInterval, setJobRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function fetchFiles() {
      try {
        setError(null)
        console.log("Fetching tracking files...")
        const response = await fetch("/api/tracking-data")

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`)
        }

        const data = await response.json()
        console.log("API response:", data)

        setFiles(data.files || [])
        setTotalFiles(data.totalFiles || 0)

        if (data.files?.length === 0) {
          console.log("No files returned from API")
        }
      } catch (error) {
        console.error("Failed to fetch tracking files:", error)
        setError(`Error fetching files: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
    fetchExportJobs()

    // Clean up interval on unmount
    return () => {
      if (jobRefreshInterval) {
        clearInterval(jobRefreshInterval)
      }
    }
  }, [])

  // Set up polling for active job
  useEffect(() => {
    if (activeJobId) {
      // Clear any existing interval
      if (jobRefreshInterval) {
        clearInterval(jobRefreshInterval)
      }

      // Set up polling for the active job
      const interval = setInterval(() => {
        fetchJobStatus(activeJobId)
      }, 2000) // Poll every 2 seconds

      setJobRefreshInterval(interval)

      // Initial fetch
      fetchJobStatus(activeJobId)
    } else {
      // Clear interval if no active job
      if (jobRefreshInterval) {
        clearInterval(jobRefreshInterval)
        setJobRefreshInterval(null)
      }
    }

    // Clean up on unmount or when activeJobId changes
    return () => {
      if (jobRefreshInterval) {
        clearInterval(jobRefreshInterval)
      }
    }
  }, [activeJobId])

  async function fetchEvents(filename: string) {
    setLoadingEvents(true)
    setSelectedFile(filename)
    setError(null)

    try {
      console.log(`Fetching events from ${filename}`)
      const response = await fetch(`/api/tracking-data?file=${encodeURIComponent(filename)}`)

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = await response.json()
      console.log("Events data:", data)
      setEvents(data.events || [])
    } catch (error) {
      console.error("Failed to fetch events:", error)
      setError(`Error fetching events: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoadingEvents(false)
    }
  }

  async function fetchExportJobs() {
    setLoadingJobs(true)
    setError(null)

    try {
      const response = await fetch("/api/export-jobs")

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = await response.json()
      setExportJobs(data.jobs || [])

      // Check if we have an active job
      const activeJob = data.jobs?.find((job) => job.status === "pending" || job.status === "processing")

      if (activeJob) {
        setActiveJobId(activeJob.id)
      } else {
        setActiveJobId(null)
      }
    } catch (error) {
      console.error("Failed to fetch export jobs:", error)
      setError(`Error fetching export jobs: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoadingJobs(false)
    }
  }

  async function fetchJobStatus(jobId: string) {
    try {
      const response = await fetch(`/api/export-jobs/${jobId}`)

      if (!response.ok) {
        console.error(`Error fetching job status: ${response.status}`)
        return
      }

      const data = await response.json()

      // Update the job in our list
      setExportJobs((prev) => {
        const updated = [...prev]
        const index = updated.findIndex((job) => job.id === jobId)

        if (index >= 0) {
          updated[index] = data.job
        } else {
          updated.unshift(data.job)
        }

        return updated
      })

      // If job is no longer active, clear the active job ID
      if (data.job.status !== "pending" && data.job.status !== "processing") {
        setActiveJobId(null)
      }
    } catch (error) {
      console.error(`Error fetching job status for ${jobId}:`, error)
    }
  }

  async function createExportJob() {
    setCreatingJob(true)
    setError(null)

    try {
      const response = await fetch("/api/export-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: exportFormat,
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
        }),
      })

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = await response.json()

      // Add the new job to our list
      setExportJobs((prev) => [data.job, ...prev])

      // Set this as the active job
      setActiveJobId(data.job.id)

      // Hide export options
      setShowExportOptions(false)
    } catch (error) {
      console.error("Failed to create export job:", error)
      setError(`Error creating export job: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setCreatingJob(false)
    }
  }

  // Function to manually trigger a refresh
  async function refreshFiles() {
    setLoading(true)
    setError(null)

    try {
      console.log("Manually refreshing tracking files...")
      const response = await fetch("/api/tracking-data")

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = await response.json()
      console.log("Refresh response:", data)

      setFiles(data.files || [])
      setTotalFiles(data.totalFiles || 0)
    } catch (error) {
      console.error("Failed to refresh tracking files:", error)
      setError(`Error refreshing tracking files: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  function getJobStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      case "processing":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  function formatJobDate(dateString: string | null) {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  function getProgressPercentage(job: ExportJob) {
    if (job.status === "completed") return 100
    if (job.status === "failed") return 0
    if (job.progress.totalFiles === 0) return 0

    return Math.round((job.progress.filesProcessed / job.progress.totalFiles) * 100)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tracking Data Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => setShowExportOptions(!showExportOptions)} variant="outline">
          {showExportOptions ? "Hide Export Options" : "Show Export Options"}
        </Button>

        <Button onClick={refreshFiles} disabled={loading} variant="outline">
          {loading ? "Refreshing..." : "Refresh Files"}
        </Button>

        <Button onClick={fetchExportJobs} disabled={loadingJobs} variant="outline">
          {loadingJobs ? "Refreshing..." : "Refresh Jobs"}
        </Button>
      </div>

      {showExportOptions && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Export Options</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "json" | "csv")}
                className="w-full border rounded px-3 py-2"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={createExportJob}
              disabled={creatingJob || !!activeJobId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creatingJob ? "Creating..." : `Start Export (${exportFormat.toUpperCase()})`}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setStartDate(null)
                setEndDate(null)
                setExportFormat("json")
              }}
            >
              Reset Options
            </Button>
          </div>

          {activeJobId && (
            <div className="mt-3 text-sm text-blue-600">
              An export is currently in progress. Please wait for it to complete before starting a new one.
            </div>
          )}
        </div>
      )}

      {/* Export Jobs Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Export Jobs</h2>

        {exportJobs.length === 0 ? (
          <p className="text-gray-500">No export jobs found. Start a new export above.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exportJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)} bg-opacity-10`}
                      >
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        {(job.status === "pending" || job.status === "processing") && (
                          <RefreshCw className="ml-1 h-3 w-3 animate-spin" />
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.format.toUpperCase()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatJobDate(job.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${getProgressPercentage(job)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {job.status === "completed"
                          ? `${job.progress.eventsProcessed} events`
                          : `${job.progress.filesProcessed}/${job.progress.totalFiles} files, ${job.progress.eventsProcessed} events`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {job.status === "completed" && job.fileUrl ? (
                        <a
                          href={job.fileUrl}
                          download={`export-${job.id}.${job.format}`}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      ) : job.status === "failed" ? (
                        <span className="text-red-600">{job.error || "Export failed"}</span>
                      ) : (
                        <span className="text-gray-400">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Tracking Files</h2>
          <p className="text-sm text-gray-500 mb-2">Total files: {totalFiles}</p>

          {loading ? (
            <p>Loading files...</p>
          ) : files.length === 0 ? (
            <div>
              <p>No tracking files found</p>
              <p className="text-sm text-gray-500 mt-2">
                This could be because:
                <ul className="list-disc pl-5 mt-1">
                  <li>No tracking events have been generated yet</li>
                  <li>Events are being stored with a different prefix</li>
                  <li>There's a permission issue accessing the files</li>
                </ul>
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li key={file.filename} className="border-b pb-2">
                  <p className="text-sm text-gray-600">{new Date(file.uploadedAt).toLocaleString()}</p>
                  <p className="truncate">{file.filename}</p>
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => fetchEvents(file.filename)}>
                    View Events
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded p-4 md:col-span-2">
          <h2 className="text-xl font-semibold mb-2">
            {selectedFile ? `Events from ${selectedFile.split("/").pop()}` : "Select a file to view events"}
          </h2>

          {loadingEvents ? (
            <p>Loading events...</p>
          ) : !selectedFile ? (
            <p>No file selected</p>
          ) : events.length === 0 ? (
            <p>No events found in this file</p>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 text-left">Time</th>
                    <th className="px-2 py-1 text-left">Action</th>
                    <th className="px-2 py-1 text-left">User</th>
                    <th className="px-2 py-1 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-2 py-1 text-sm">{new Date(event.timestamp).toLocaleTimeString()}</td>
                      <td className="px-2 py-1">{event.action}</td>
                      <td className="px-2 py-1">{event.username}</td>
                      <td className="px-2 py-1">
                        <details>
                          <summary>View</summary>
                          <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto">
                            {JSON.stringify(event, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
