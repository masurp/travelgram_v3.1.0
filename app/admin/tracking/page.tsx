"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Trash2, RefreshCw } from "lucide-react"
import type { TrackingIndex } from "@/lib/tracking-index"

interface TrackingFile {
  pathname: string
  url: string
  size: number
  uploadedAt: string
}

export default function TrackingDashboard() {
  const [files, setFiles] = useState<TrackingFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [totalFiles, setTotalFiles] = useState(0)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)
  const [lastIndexUpdate, setLastIndexUpdate] = useState<string | null>(null)
  const [indexLoading, setIndexLoading] = useState(false)

  // Export options
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json")
  const [exportLimit, setExportLimit] = useState(10000)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showExportOptions, setShowExportOptions] = useState(false)

  useEffect(() => {
    fetchTrackingIndex()
  }, [])

  async function fetchTrackingIndex(forceUpdate = false) {
    setLoading(true)
    setError(null)

    try {
      console.log("Fetching tracking index...")
      const response = await fetch(`/api/tracking-index${forceUpdate ? "?forceUpdate=true" : ""}`)

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = (await response.json()) as TrackingIndex
      console.log("Tracking index:", data)

      setFiles(data.files || [])
      setTotalFiles(data.files.length || 0)
      setLastIndexUpdate(data.lastUpdated)

      if (data.files.length === 0) {
        console.log("No files in tracking index")
      }
    } catch (error) {
      console.error("Failed to fetch tracking index:", error)
      setError(`Error fetching index: ${error instanceof Error ? error.message : String(error)}`)

      // Fall back to the old method if index fails
      fetchFilesLegacy()
    } finally {
      setLoading(false)
    }
  }

  // Legacy method as fallback
  async function fetchFilesLegacy() {
    try {
      console.log("Falling back to legacy file listing...")
      const response = await fetch("/api/tracking-data")

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = await response.json()
      console.log("Legacy API response:", data)

      setFiles(data.files || [])
      setTotalFiles(data.totalFiles || 0)
    } catch (error) {
      console.error("Failed to fetch tracking files (legacy):", error)
      setError(`Error fetching files: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

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

  async function exportAllEvents() {
    setExportLoading(true)
    setError(null)

    try {
      console.log("Exporting events...")

      // Build query parameters
      let url = `/api/export-tracking?format=${exportFormat}&limit=${exportLimit}`
      if (startDate) {
        url += `&startDate=${startDate.toISOString()}`
      }
      if (endDate) {
        url += `&endDate=${endDate.toISOString()}`
      }

      if (exportFormat === "csv") {
        // For CSV, download directly
        window.location.href = url
        setExportLoading(false)
        return
      }

      // For JSON, fetch and create a download
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = await response.json()
      console.log(`Exporting ${data.events?.length || 0} events`)

      // Create a downloadable JSON file
      const blob = new Blob([JSON.stringify(data.events || [], null, 2)], { type: "application/json" })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `tracking-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error("Failed to export events:", error)
      setError(`Error exporting events: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setExportLoading(false)
    }
  }

  // Function to manually update the index
  async function updateIndex() {
    setIndexLoading(true)
    setError(null)

    try {
      console.log("Manually updating tracking index...")
      await fetchTrackingIndex(true)
    } catch (error) {
      console.error("Failed to update tracking index:", error)
      setError(`Error updating index: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIndexLoading(false)
    }
  }

  // Function to delete all tracking files
  async function deleteAllFiles() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 5000) // Reset after 5 seconds
      return
    }

    setDeleteLoading(true)
    setError(null)
    setDeleteResult(null)

    try {
      // Get the cleanup key from the user
      const cleanupKey = prompt("Enter the cleanup secret key to confirm deletion:")

      if (!cleanupKey) {
        setDeleteLoading(false)
        return
      }

      console.log("Deleting all tracking files...")
      const response = await fetch(`/api/tracking-data/delete-all?key=${encodeURIComponent(cleanupKey)}`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `API responded with status ${response.status}`)
      }

      console.log("Delete response:", data)
      setDeleteResult(data.message)

      // Refresh the index after deletion
      await fetchTrackingIndex(true)

      // Reset the confirmation
      setDeleteConfirm(false)
    } catch (error) {
      console.error("Failed to delete tracking files:", error)
      setError(`Error deleting files: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tracking Data Dashboard</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {deleteResult && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{deleteResult}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => setShowExportOptions(!showExportOptions)} variant="outline">
          {showExportOptions ? "Hide Export Options" : "Show Export Options"}
        </Button>

        <Button onClick={updateIndex} disabled={indexLoading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${indexLoading ? "animate-spin" : ""}`} />
          {indexLoading ? "Updating..." : "Update Index"}
        </Button>

        <Button
          onClick={deleteAllFiles}
          disabled={deleteLoading || files.length === 0}
          variant="destructive"
          className="ml-auto"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleteLoading ? "Deleting..." : deleteConfirm ? "Click again to confirm" : "Delete All Tracking Data"}
        </Button>
      </div>

      {lastIndexUpdate && (
        <p className="text-sm text-gray-500 mb-4">Index last updated: {new Date(lastIndexUpdate).toLocaleString()}</p>
      )}

      {showExportOptions && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Export Options</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
              <label className="block text-sm font-medium mb-1">Max Events</label>
              <input
                type="number"
                value={exportLimit}
                onChange={(e) => setExportLimit(Number.parseInt(e.target.value) || 10000)}
                min="1"
                max="100000"
                className="w-full border rounded px-3 py-2"
              />
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
              onClick={exportAllEvents}
              disabled={exportLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {exportLoading ? "Exporting..." : `Export Events (${exportFormat.toUpperCase()})`}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setStartDate(null)
                setEndDate(null)
                setExportLimit(10000)
                setExportFormat("json")
              }}
            >
              Reset Options
            </Button>
          </div>
        </div>
      )}

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
                <li key={file.pathname} className="border-b pb-2">
                  <p className="text-sm text-gray-600">{new Date(file.uploadedAt).toLocaleString()}</p>
                  <p className="truncate">{file.pathname}</p>
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => fetchEvents(file.pathname)}>
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
