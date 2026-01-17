/** @type {import('tailwindcss').Config} */
  module.exports = {
    darkMode: 'class',
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
      "./packages/adnia-ui/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Janna', 'system-ui', 'sans-serif'],
        },
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          // Code highlighting colors for dev components
          code: {
            background: "hsl(var(--code-background))",
            foreground: "hsl(var(--code-foreground))",
          },
          // Diff colors for dev components
          diff: {
            "add-bg": "hsl(var(--diff-add-background))",
            "add-fg": "hsl(var(--diff-add-foreground))",
            "remove-bg": "hsl(var(--diff-remove-background))",
            "remove-fg": "hsl(var(--diff-remove-foreground))",
          },
          // Terminal colors for dev components
          terminal: {
            background: "hsl(var(--terminal-background))",
            foreground: "hsl(var(--terminal-foreground))",
          },
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        keyframes: {
          'fade-in': {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          'fade-in-up': {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          'fade-in-down': {
            '0%': { opacity: '0', transform: 'translateY(-10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          'scale-in': {
            '0%': { opacity: '0', transform: 'scale(0.95)' },
            '100%': { opacity: '1', transform: 'scale(1)' },
          },
          'slide-in-right': {
            '0%': { opacity: '0', transform: 'translateX(20px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
          },
          'slide-in-left': {
            '0%': { opacity: '0', transform: 'translateX(-20px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
          },
          'bounce-subtle': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-3px)' },
          },
          'shimmer': {
            '0%': { backgroundPosition: '-200% 0' },
            '100%': { backgroundPosition: '200% 0' },
          },
          'glow-pulse': {
            '0%, 100%': { boxShadow: '0 0 5px var(--primary)' },
            '50%': { boxShadow: '0 0 20px var(--primary), 0 0 30px var(--primary)' },
          },
        },
        animation: {
          'fade-in': 'fade-in 0.3s ease-out',
          'fade-in-up': 'fade-in-up 0.4s ease-out',
          'fade-in-down': 'fade-in-down 0.4s ease-out',
          'scale-in': 'scale-in 0.2s ease-out',
          'slide-in-right': 'slide-in-right 0.3s ease-out',
          'slide-in-left': 'slide-in-left 0.3s ease-out',
          'bounce-subtle': 'bounce-subtle 0.5s ease-in-out',
          'shimmer': 'shimmer 2s linear infinite',
          'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        },
      },
    },
    plugins: [],
  }