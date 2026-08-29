// Tailwind v4: theme is defined in globals.css via @theme
// This file kept for compatibility with tooling that expects it
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
}

export default config
