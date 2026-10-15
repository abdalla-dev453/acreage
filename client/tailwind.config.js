/** @type {import('tailwindcss').Config}

   ACREAGE — "Warm Harvest" design system.

   A premium agricultural commerce platform: warm ivory paper, soft stone
   surfaces, deep forest green used sparingly for brand and primary actions,
   harvest amber reserved for commerce conversions, and muted olive for
   verified / success states. No decorative gradients — flat color, clean
   borders, soft shadows.

   The legacy scales (green / emerald / lime / slate / amber …) are remapped
   to this palette so every existing utility across the app resolves to the
   warm system instead of the old bright greens. */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic brand scale (use these for new work) ─────────────────
        brand: {
          ivory: '#FAF7F2',        // app background
          stone: '#F1EDE6',        // cards & section surfaces
          sand: '#E3DCD1',         // borders & dividers
          charcoal: '#1F241F',     // primary text
          muted: '#6B6459',        // secondary text
          forest: '#1E3A2F',       // brand: navbar, footer, primary buttons
          'forest-deep': '#172C23',// hover / pressed forest
          'forest-ink': '#101B16', // deepest forest slabs
          amber: '#C97B2D',        // conversion CTA only
          'amber-deep': '#AC6722', // hover amber
          olive: '#5F7A5A',        // verified / success
          'olive-deep': '#4A6146',
          brick: '#A63A2E',        // error
          'brick-deep': '#8C2F25',
        },

        // Forest family — brand green. Replaces the old bright green ramp:
        // 500 = muted olive, 600 = deep forest, the rest are tints/shades.
        green: {
          50: '#F2F4EE',
          100: '#E5E9DE',
          200: '#CBD2BF',
          300: '#A9B39B',
          400: '#7E9073',
          500: '#5F7A5A',
          600: '#1E3A2F',
          700: '#182C23',
          800: '#12211B',
          900: '#0D1712',
          950: '#080F0C',
        },

        // Olive family — verified / success states (badges, confirmations).
        emerald: {
          50: '#F1F3ED',
          100: '#E4E8DD',
          200: '#C9D0C0',
          300: '#A3AF97',
          400: '#7C8F73',
          500: '#5F7A5A',
          600: '#1E3A2F',
          700: '#182C23',
          800: '#12211B',
          900: '#0E1A14',
          950: '#0A120E',
        },

        // Legacy lime green usage folds into the olive family.
        lime: {
          50: '#F2F3EC',
          100: '#E6E8DB',
          200: '#CDD2BC',
          300: '#AAB294',
          400: '#87936E',
          500: '#5F7A5A',
          600: '#4C6349',
          700: '#41523D',
          800: '#364332',
          900: '#2C372C',
          950: '#171F18',
        },

        // Warm neutral ramp — ivory / stone / sand / grey-brown / charcoal.
        // Every slate utility in the app now renders warm instead of blue-grey.
        slate: {
          50: '#FAF7F2',
          100: '#F1EDE6',
          200: '#E3DCD1',
          300: '#CFC7B8',
          400: '#A79E8D',
          500: '#6B6459',
          600: '#57524A',
          700: '#3F3B35',
          800: '#2B2A26',
          900: '#1F241F',
          950: '#141712',
        },

        // Harvest amber — only for primary conversion actions.
        amber: {
          50: '#FBF4EA',
          100: '#F6E8D2',
          200: '#EDD3B0',
          300: '#E0B683',
          400: '#D2984F',
          500: '#C97B2D',
          600: '#AC6722',
          700: '#8D551E',
          800: '#6F4419',
          900: '#573513',
          950: '#311D08',
        },

        // Orange kept in the amber family (it anchored the old gradient chips).
        orange: {
          50: '#FBF4EA',
          100: '#F6E8D2',
          200: '#EDD3B0',
          300: '#E0B683',
          400: '#D2984F',
          500: '#C97B2D',
          600: '#AC6722',
          700: '#8D551E',
          800: '#6F4419',
          900: '#573513',
          950: '#311D08',
        },

        yellow: {
          50: '#FBF6EA',
          100: '#F5EBD2',
          200: '#EBD8AE',
          300: '#DFC285',
          400: '#D3AA5B',
          500: '#C2923A',
          600: '#A87A2E',
          700: '#8A6224',
          800: '#6C4C1C',
          900: '#543B16',
          950: '#2F2009',
        },

        gold: {
          50: '#FBF6EA',
          100: '#F5EBD2',
          200: '#EBD8AE',
          300: '#DFC285',
          400: '#D3AA5B',
          500: '#C2923A',
          600: '#A87A2E',
          700: '#8A6224',
          800: '#6C4C1C',
          900: '#543B16',
          950: '#2F2009',
        },

        // Deep brick red — errors and destructive actions.
        rose: {
          50: '#F9EFEC',
          100: '#F2DED8',
          200: '#E6C0B7',
          300: '#D59C90',
          400: '#C16C5D',
          500: '#A63A2E',
          600: '#8C2F25',
          700: '#73281F',
          800: '#5B2019',
          900: '#471A14',
          950: '#290D09',
        },

        red: {
          50: '#F9EFEC',
          100: '#F2DED8',
          200: '#E6C0B7',
          300: '#D59C90',
          400: '#C16C5D',
          500: '#A63A2E',
          600: '#8C2F25',
          700: '#73281F',
          800: '#5B2019',
          900: '#471A14',
          950: '#290D09',
        },

        // Primary/accent aliases keep older class names meaningful.
        primary: {
          50: '#F2F4EE',
          100: '#E5E9DE',
          200: '#CBD2BF',
          300: '#A9B39B',
          400: '#7E9073',
          500: '#5F7A5A',
          600: '#1E3A2F',
          700: '#182C23',
          800: '#12211B',
          900: '#0D1712',
          950: '#080F0C',
        },
        accent: {
          50: '#FBF4EA',
          100: '#F6E8D2',
          200: '#EDD3B0',
          300: '#E0B683',
          400: '#D2984F',
          500: '#C97B2D',
          600: '#AC6722',
          700: '#8D551E',
          800: '#6F4419',
          900: '#573513',
          950: '#311D08',
        },
      },
      fontFamily: {
        // index.html loads Fraunces (refined serif display) + IBM Plex Sans
        // (highly readable body) + IBM Plex Mono (labels / prices).
        sans: ['"IBM Plex Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['Fraunces', '"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Soft, warm, flat-design shadows — no colored glows.
        'premium': '0 1px 2px rgba(31, 36, 31, 0.04), 0 2px 8px rgba(31, 36, 31, 0.05)',
        'premium-lg': '0 2px 4px rgba(31, 36, 31, 0.04), 0 12px 28px rgba(31, 36, 31, 0.08)',
        'premium-xl': '0 4px 8px rgba(31, 36, 31, 0.05), 0 24px 48px rgba(31, 36, 31, 0.12)',
        'cta': '0 2px 6px rgba(172, 103, 34, 0.24)',
        'cta-hover': '0 6px 18px rgba(172, 103, 34, 0.3)',
        'forest': '0 2px 6px rgba(16, 27, 22, 0.18)',
        'forest-hover': '0 8px 22px rgba(16, 27, 22, 0.26)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'shake': 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}
