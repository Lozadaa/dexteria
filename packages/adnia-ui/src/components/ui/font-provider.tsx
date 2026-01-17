import * as React from "react"

export interface FontConfig {
  /** Sans-serif font family */
  sans?: string
  /** Monospace font family */
  mono?: string
  /** Display font family */
  display?: string
  /** Base font size */
  baseFontSize?: string
  /** Code font size */
  codeFontSize?: string
}

export interface FontProviderProps {
  children: React.ReactNode
  /** Font configuration */
  fonts?: FontConfig
  /** Storage key for persistence */
  storageKey?: string
}

export interface FontContextValue {
  fonts: FontConfig
  setFonts: (fonts: FontConfig) => void
  resetFonts: () => void
}

const defaultFonts: FontConfig = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  display: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  baseFontSize: "14px",
  codeFontSize: "13px",
}

const FontContext = React.createContext<FontContextValue | undefined>(undefined)

export function useFonts() {
  const context = React.useContext(FontContext)
  if (context === undefined) {
    throw new Error("useFonts must be used within a FontProvider")
  }
  return context
}

export function FontProvider({
  children,
  fonts: initialFonts,
  storageKey = "adnia-ui-fonts",
}: FontProviderProps) {
  const [fonts, setFontsState] = React.useState<FontConfig>(() => {
    // Try to load from storage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          return { ...defaultFonts, ...JSON.parse(stored) }
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
    return { ...defaultFonts, ...initialFonts }
  })

  // Apply fonts to CSS variables
  React.useEffect(() => {
    const root = document.documentElement

    if (fonts.sans) {
      root.style.setProperty("--font-family-sans", fonts.sans)
    }
    if (fonts.mono) {
      root.style.setProperty("--font-family-mono", fonts.mono)
    }
    if (fonts.display) {
      root.style.setProperty("--font-family-display", fonts.display)
    }
    if (fonts.baseFontSize) {
      root.style.setProperty("--font-size-base", fonts.baseFontSize)
    }
    if (fonts.codeFontSize) {
      root.style.setProperty("--font-size-code", fonts.codeFontSize)
    }

    return () => {
      // Reset on unmount
      root.style.removeProperty("--font-family-sans")
      root.style.removeProperty("--font-family-mono")
      root.style.removeProperty("--font-family-display")
      root.style.removeProperty("--font-size-base")
      root.style.removeProperty("--font-size-code")
    }
  }, [fonts])

  // Save to storage on change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(fonts))
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [fonts, storageKey])

  const setFonts = React.useCallback((newFonts: FontConfig) => {
    setFontsState((prev) => ({ ...prev, ...newFonts }))
  }, [])

  const resetFonts = React.useCallback(() => {
    setFontsState(defaultFonts)
  }, [])

  const value: FontContextValue = {
    fonts,
    setFonts,
    resetFonts,
  }

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}

// Font Selector Component
export interface FontSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show preview */
  showPreview?: boolean
}

const popularFonts = {
  sans: [
    { name: "System UI", value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { name: "Inter", value: '"Inter", system-ui, sans-serif' },
    { name: "Roboto", value: '"Roboto", system-ui, sans-serif' },
    { name: "Open Sans", value: '"Open Sans", system-ui, sans-serif' },
    { name: "Lato", value: '"Lato", system-ui, sans-serif' },
  ],
  mono: [
    { name: "System Mono", value: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' },
    { name: "JetBrains Mono", value: '"JetBrains Mono", ui-monospace, monospace' },
    { name: "Fira Code", value: '"Fira Code", ui-monospace, monospace' },
    { name: "Source Code Pro", value: '"Source Code Pro", ui-monospace, monospace' },
    { name: "IBM Plex Mono", value: '"IBM Plex Mono", ui-monospace, monospace' },
  ],
}

const fontSizes = [
  { name: "12px", value: "12px" },
  { name: "13px", value: "13px" },
  { name: "14px", value: "14px" },
  { name: "15px", value: "15px" },
  { name: "16px", value: "16px" },
]

export function FontSelector({ className, showPreview = true, ...props }: FontSelectorProps) {
  const { fonts, setFonts, resetFonts } = useFonts()

  return (
    <div className={className} {...props}>
      <div className="space-y-4">
        {/* Sans font */}
        <div>
          <label className="block text-sm font-medium mb-1">UI Font</label>
          <select
            value={fonts.sans}
            onChange={(e) => setFonts({ sans: e.target.value })}
            className="w-full p-2 text-sm bg-background border border-border rounded cursor-pointer"
          >
            {popularFonts.sans.map((font) => (
              <option key={font.name} value={font.value}>
                {font.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mono font */}
        <div>
          <label className="block text-sm font-medium mb-1">Code Font</label>
          <select
            value={fonts.mono}
            onChange={(e) => setFonts({ mono: e.target.value })}
            className="w-full p-2 text-sm bg-background border border-border rounded cursor-pointer"
          >
            {popularFonts.mono.map((font) => (
              <option key={font.name} value={font.value}>
                {font.name}
              </option>
            ))}
          </select>
        </div>

        {/* Base font size */}
        <div>
          <label className="block text-sm font-medium mb-1">UI Font Size</label>
          <select
            value={fonts.baseFontSize}
            onChange={(e) => setFonts({ baseFontSize: e.target.value })}
            className="w-full p-2 text-sm bg-background border border-border rounded cursor-pointer"
          >
            {fontSizes.map((size) => (
              <option key={size.name} value={size.value}>
                {size.name}
              </option>
            ))}
          </select>
        </div>

        {/* Code font size */}
        <div>
          <label className="block text-sm font-medium mb-1">Code Font Size</label>
          <select
            value={fonts.codeFontSize}
            onChange={(e) => setFonts({ codeFontSize: e.target.value })}
            className="w-full p-2 text-sm bg-background border border-border rounded cursor-pointer"
          >
            {fontSizes.map((size) => (
              <option key={size.name} value={size.value}>
                {size.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset button */}
        <button
          onClick={resetFonts}
          className="w-full p-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded transition-colors cursor-pointer"
        >
          Reset to defaults
        </button>

        {/* Preview */}
        {showPreview && (
          <div className="mt-4 p-3 border border-border rounded bg-muted/30">
            <p className="text-sm mb-2" style={{ fontFamily: fonts.sans, fontSize: fonts.baseFontSize }}>
              UI Font Preview: The quick brown fox jumps over the lazy dog.
            </p>
            <code
              className="text-sm block bg-muted p-2 rounded"
              style={{ fontFamily: fonts.mono, fontSize: fonts.codeFontSize }}
            >
              Code Font: const hello = "world";
            </code>
          </div>
        )}
      </div>
    </div>
  )
}
