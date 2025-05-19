"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface TrackingFile {
  filename: string
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
  }, [])

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
      console.log("Exporting all events...")
      const response = await fetch("/api/export-tracking")

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`)
      }

      const data = await response.json()
      console.log(`Exporting ${data.events?.length || 0} events`)

      // Create a downloadable JSON file
      const blob = new Blob([JSON.stringify(data.events || [], null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tracking-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export events:", error)
      setError(`Error exporting events: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setExportLoading(false)
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
      setError(`Error refreshing files: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
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

      <div className="mb-4 flex gap-2">
        <Button onClick={exportAllEvents} disabled={exportLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {exportLoading ? "Exporting..." : "Export All Events"}
        </Button>

        <Button onClick={refreshFiles} disabled={loading} variant="outline">
          {loading ? "Refreshing..." : "Refresh Files"}
        </Button>
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
