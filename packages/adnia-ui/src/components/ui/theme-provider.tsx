import * as React from "react"

export type Theme = "light" | "dark" | "blue" | "green" | "purple" | "dexteria" | "dexteria-dark" | "system"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeContextType {
  theme: Theme
  resolvedTheme: Exclude<Theme, "system">
  setTheme: (theme: Theme) => void
  themes: Theme[]
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): Exclude<Theme, "system"> {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "adnia-ui-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    const stored = localStorage.getItem(storageKey)
    return (stored as Theme) || defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = React.useState<Exclude<Theme, "system">>(() => {
    if (theme === "system") return getSystemTheme()
    return theme as Exclude<Theme, "system">
  })

  // Listen for system theme changes
  React.useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      setResolvedTheme(getSystemTheme())
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  // Update resolved theme when theme changes
  React.useEffect(() => {
    if (theme === "system") {
      setResolvedTheme(getSystemTheme())
    } else {
      setResolvedTheme(theme as Exclude<Theme, "system">)
    }
  }, [theme])

  // Apply theme to document
  React.useEffect(() => {
    const root = window.document.documentElement

    // Remove all theme classes
    root.classList.remove("light", "dark", "blue", "green", "purple", "dexteria")
    root.removeAttribute("data-theme")

    // Add new theme - handle dexteria-dark specially
    if (resolvedTheme === "dexteria-dark") {
      root.classList.add("dexteria", "dark")
      root.setAttribute("data-theme", "dexteria-dark")
    } else {
      root.classList.add(resolvedTheme)
      root.setAttribute("data-theme", resolvedTheme)
    }
  }, [resolvedTheme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, newTheme)
    }
  }, [storageKey])

  const themes: Theme[] = ["light", "dark", "blue", "green", "purple", "dexteria", "dexteria-dark", "system"]

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

// Theme toggle button component
interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showLabel?: boolean
}

export function ThemeToggle({ showLabel = false, className, ...props }: ThemeToggleProps) {
  const { theme, setTheme, themes } = useTheme()

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const icons: Record<Theme, React.ReactNode> = {
    light: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    dark: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    blue: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" className="text-blue-500" />
      </svg>
    ),
    green: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" className="text-green-500" />
      </svg>
    ),
    purple: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" className="text-purple-500" />
      </svg>
    ),
    dexteria: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    "dexteria-dark": (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    system: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  }

  const labels: Record<Theme, string> = {
    light: "Light",
    dark: "Dark",
    blue: "Blue",
    green: "Green",
    purple: "Purple",
    dexteria: "Dexteria",
    "dexteria-dark": "Dexteria Dark",
    system: "System",
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`inline-flex items-center gap-2 rounded-md p-2 text-sm transition-colors cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className || ""}`}
      title={`Current: ${labels[theme]}. Click to switch.`}
      {...props}
    >
      {icons[theme]}
      {showLabel && <span>{labels[theme]}</span>}
    </button>
  )
}

export { ThemeContext }
