// Register service worker for caching and performance

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    })
  }
}

// Call this function in your app's entry point
if (typeof window !== "undefined") {
  registerServiceWorker()
}
