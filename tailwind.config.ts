import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '320px',     // iPhone SE and smaller
      'sm': '375px',     // iPhone standard size
      'md': '768px',     // iPad and tablets
      'lg': '1024px',    // Desktop
      'xl': '1280px',    // Large desktop
      '2xl': '1536px',   // Extra large
      // iPhone specific breakpoints
      'iphone-se': '320px',
      'iphone': '375px',
      'iphone-plus': '414px',
      'iphone-max': '428px',
      // Orientation-based breakpoints
      'portrait': {'raw': '(orientation: portrait)'},
      'landscape': {'raw': '(orientation: landscape)'},
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Ghost White Color System
        "therapy": {
          "bg": "var(--therapy-bg)",
          "primary": "var(--therapy-primary)",
          "primary-light": "var(--therapy-primary-light)",
          "primary-dark": "var(--therapy-primary-dark)",
          "success": "var(--therapy-success)",
          "warning": "var(--therapy-warning)", 
          "error": "var(--therapy-error)",
          "border": "var(--therapy-border)",
          "text": "var(--therapy-text)",
          "accent": "var(--therapy-accent)",
        },
        // Additional new color system aliases
        "ghost": {
          "base": "var(--color-bg-base)",
          "default": "var(--color-bg-default)",
          "raised": "var(--color-bg-raised)",
          "overlay": "var(--color-bg-overlay)",
          "sunken": "var(--color-bg-sunken)",
        },
        "french-blue": {
          "50": "var(--french-blue-50)",
          "100": "var(--french-blue-100)",
          "200": "var(--french-blue-200)",
          "300": "var(--french-blue-300)",
          "400": "var(--french-blue-400)",
          "500": "var(--french-blue-500)",
          "600": "var(--french-blue-600)",
          "700": "var(--french-blue-700)",
          "800": "var(--french-blue-800)",
          "900": "var(--french-blue-900)",
        },
        "sage-green": {
          "50": "var(--sage-green-50)",
          "100": "var(--sage-green-100)",
          "200": "var(--sage-green-200)",
          "300": "var(--sage-green-300)",
          "400": "var(--sage-green-400)",
          "500": "var(--sage-green-500)",
          "600": "var(--sage-green-600)",
          "700": "var(--sage-green-700)",
        },
        "info-steel": {
          "50": "var(--info-steel-50)",
          "100": "var(--info-steel-100)",
          "200": "var(--info-steel-200)",
          "300": "var(--info-steel-300)",
          "400": "var(--info-steel-400)",
          "500": "var(--info-steel-500)",
          "600": "var(--info-steel-600)",
        },
        "slate-blue": {
          "50": "var(--slate-blue-50)",
          "100": "var(--slate-blue-100)",
          "200": "var(--slate-blue-200)",
          "300": "var(--slate-blue-300)",
          "400": "var(--slate-blue-400)",
          "500": "var(--slate-blue-500)",
          "600": "var(--slate-blue-600)",
        },
        "silver-sage": {
          "50": "var(--silver-sage-50)",
          "100": "var(--silver-sage-100)",
          "200": "var(--silver-sage-200)",
          "300": "var(--silver-sage-300)",
          "400": "var(--silver-sage-400)",
          "500": "var(--silver-sage-500)",
          "600": "var(--silver-sage-600)",
        },
      },
      spacing: {
        'safe-area-top': 'env(safe-area-inset-top)',
        'safe-area-bottom': 'env(safe-area-inset-bottom)',
        'safe-area-left': 'env(safe-area-inset-left)',
        'safe-area-right': 'env(safe-area-inset-right)',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.6' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
        'touch-xl': '52px',
      },
      minWidth: {
        'touch': '44px', 
        'touch-lg': '48px',
        'touch-xl': '52px',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        'ghost-xs': 'var(--shadow-xs)',
        'ghost-sm': 'var(--shadow-sm)',
        'ghost-md': 'var(--shadow-md)',
        'ghost-lg': 'var(--shadow-lg)',
        'ghost-xl': 'var(--shadow-xl)',
        'ghost-focus': 'var(--shadow-focus)',
      },
      transitionDuration: {
        'ghost-fast': 'var(--transition-fast)',
        'ghost-base': 'var(--transition-base)',
        'ghost-slow': 'var(--transition-slow)',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
