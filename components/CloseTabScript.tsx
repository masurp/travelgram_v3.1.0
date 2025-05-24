"use client"

import { useEffect } from "react"

export default function CloseTabScript() {
  useEffect(() => {
    // Ensure this runs only once or is idempotent if component remounts
    if (!(window as any).closeTabSetup) {
      const script = document.createElement("script")
      script.innerHTML = `
        window.closeTab = function() {
          console.log("Attempting window.close() via closeTab function");
          window.close();
          // No complex fallbacks here; the calling code will handle if close fails.
        }
      `
      document.body.appendChild(script)
      ;(window as any).closeTabSetup = true; // Mark as setup

      return () => {
        try {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          delete (window as any).closeTab;
          delete (window as any).closeTabSetup;
        } catch (e) {
          console.error("Error removing CloseTabScript:", e);
        }
      }
    }
  }, [])

  return null
}
