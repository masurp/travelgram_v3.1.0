"use client"

import { useEffect } from "react"

export default function CloseTabScript() {
  useEffect(() => {
    const script = document.createElement("script")
    // Ensure the function is unequivocally global
    script.innerHTML = `
      window.closeTab = function() {
        // Try to close the current tab
        window.open('', '_self', ''); // The empty string for URL and target _self is important
        window.close();
        
        // Fallback for browsers that are picky about window.close()
        // This is often more a signal to the user if direct close fails.
        // setTimeout(() => {
        //  if (!window.closed) { // Check if it actually closed
        //    // document.body.innerHTML = "<h1>Please close this tab manually.</h1>"; // Or redirect
        //    // window.location.href = 'about:blank'; // Can be disruptive if not intended as final action
        //  }
        // }, 500);
      }
    `
    document.body.appendChild(script)

    return () => {
      try {
        document.body.removeChild(script);
        delete (window as any).closeTab; // Clean up global function
      } catch (e) {
        // ignore if script already removed or body is not available
      }
    }
  }, [])

  return null
}
