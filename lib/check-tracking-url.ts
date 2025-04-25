/**
 * Utility function to check if the Google Apps Script URL is valid and accessible
 */
export async function checkTrackingUrl(url?: string): Promise<{
  valid: boolean
  message: string
  url?: string
}> {
  // If no URL provided, check environment variable
  const scriptUrl = url || process.env.EXPORT_SHEET_URL

  if (!scriptUrl) {
    return {
      valid: false,
      message: "No tracking URL provided or configured in environment variables",
    }
  }

  // Check if the URL is valid
  try {
    new URL(scriptUrl)
  } catch (error) {
    return {
      valid: false,
      message: "Invalid URL format",
      url: scriptUrl,
    }
  }

  // Try to make a simple HEAD request to check if the URL is accessible
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(scriptUrl, {
      method: "HEAD",
      signal: controller.signal,
      mode: "no-cors", // This allows us to at least check if the URL is reachable
    }).finally(() => clearTimeout(timeoutId))

    // With no-cors mode, we can't check status, but if we get here without an error, the URL is reachable
    return {
      valid: true,
      message: "URL is reachable",
      url: scriptUrl,
    }
  } catch (error) {
    return {
      valid: false,
      message: `URL is not accessible: ${error.message}`,
      url: scriptUrl,
    }
  }
}
