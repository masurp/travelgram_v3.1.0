"use client"

import { Pacifico } from "next/font/google"

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] })

export default function GlobalStyles() {
  return (
    <style jsx global>{`
      .logo-font {
        font-family: ${pacifico.style.fontFamily};
      }
    `}</style>
  )
}
