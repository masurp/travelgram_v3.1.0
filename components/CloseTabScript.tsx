"use client"

import { useEffect } from "react"

export default function CloseTabScript() {
  useEffect(() => {
    const script = document.createElement("script")
    script.innerHTML = `
      function closeTab() {
        window.open('', '_self');
        window.close();
      }
    `
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return null
}
