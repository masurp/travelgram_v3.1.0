// Simple performance monitoring utility

// Store performance marks
const marks = new Map<string, number>()

// Start timing an operation
export function startTiming(operation: string): void {
  if (typeof performance !== "undefined") {
    performance.mark(`${operation}-start`)
  } else {
    marks.set(`${operation}-start`, Date.now())
  }
}

// End timing an operation and log the result
export function endTiming(operation: string, logToConsole = true): number {
  let duration = 0

  if (typeof performance !== "undefined") {
    performance.mark(`${operation}-end`)
    performance.measure(operation, `${operation}-start`, `${operation}-end`)
    const entries = performance.getEntriesByName(operation)
    if (entries.length > 0) {
      duration = entries[0].duration
    }

    // Clean up marks and measures
    performance.clearMarks(`${operation}-start`)
    performance.clearMarks(`${operation}-end`)
    performance.clearMeasures(operation)
  } else {
    const startTime = marks.get(`${operation}-start`)
    if (startTime) {
      duration = Date.now() - startTime
      marks.delete(`${operation}-start`)
    }
  }

  if (logToConsole) {
    console.log(`Performance: ${operation} took ${duration.toFixed(2)}ms`)
  }

  return duration
}

// Track a component render
export function trackRender(componentName: string): () => void {
  const operation = `render-${componentName}`
  startTiming(operation)

  return () => {
    endTiming(operation)
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring(): void {
  if (typeof window !== "undefined") {
    // Track page load time
    window.addEventListener("load", () => {
      if (performance.timing) {
        const pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
        console.log(`Page loaded in ${pageLoadTime}ms`)
      }
    })

    // Track long tasks
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.warn(`Long task detected: ${entry.duration}ms`)
          }
        })

        observer.observe({ entryTypes: ["longtask"] })
      } catch (e) {
        console.error("PerformanceObserver for longtask not supported", e)
      }
    }
  }
}

// Call initPerformanceMonitoring when the module is imported
if (typeof window !== "undefined") {
  initPerformanceMonitoring()
}
