/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
          "on-primary-fixed-variant": "#930100",
          "inverse-primary": "#c00000",
          "surface": "#131313",
          "surface-container-high": "#2a2a2a",
          "tertiary-fixed": "#dae2ff",
          "surface-bright": "#3a3939",
          "tertiary": "#b1c5ff",
          "on-surface-variant": "#e9bcb5",
          "surface-container": "#201f1f",
          "on-secondary-container": "#dcb7ff",
          "surface-dim": "#131313",
          "inverse-surface": "#e5e2e1",
          "tertiary-fixed-dim": "#b1c5ff",
          "surface-container-lowest": "#0e0e0e",
          "on-tertiary-container": "#f8f7ff",
          "background": "#131313",
          "surface-container-highest": "#353534",
          "outline": "#b08781",
          "on-background": "#e5e2e1",
          "tertiary-container": "#0068f8",
          "on-tertiary-fixed-variant": "#0040a0",
          "on-secondary": "#480081",
          "on-primary": "#690000",
          "on-tertiary": "#002c72",
          "primary-fixed": "#ffdad4",
          "secondary-container": "#7701d0",
          "primary-fixed-dim": "#ffb4a8",
          "outline-variant": "#5f3f3a",
          "error-container": "#93000a",
          "primary-container": "#e50000",
          "on-surface": "#e5e2e1",
          "on-tertiary-fixed": "#001847",
          "secondary": "#dcb8ff",
          "primary": "#ffb4a8",
          "surface-variant": "#353534",
          "surface-container-low": "#1c1b1b",
          "on-primary-container": "#fff6f4",
          "on-error": "#690005",
          "on-error-container": "#ffdad6",
          "on-secondary-fixed-variant": "#6700b5",
          "inverse-on-surface": "#313030",
          "error": "#ffb4ab",
          "secondary-fixed": "#efdbff",
          "on-secondary-fixed": "#2c0051",
          "surface-tint": "#ffb4a8",
          "secondary-fixed-dim": "#dcb8ff",
          "on-primary-fixed": "#410000"
      },
      "borderRadius": {
          "DEFAULT": "0.25rem",
          "lg": "0.5rem",
          "xl": "0.75rem",
          "full": "9999px"
      },
      "spacing": {
          "container_padding": "2rem",
          "sidebar_width": "280px",
          "stack_lg": "3rem",
          "gutter": "1rem",
          "stack_md": "1.5rem",
          "stack_sm": "0.5rem"
      },
      "fontFamily": {
          "body-md": ["Inter", "sans-serif"],
          "display-lg": ["Hanken Grotesk", "sans-serif"],
          "body-lg": ["Inter", "sans-serif"],
          "mono-sm": ["Geist", "monospace"],
          "label-md": ["Geist", "monospace"],
          "headline-md": ["Hanken Grotesk", "sans-serif"],
          "headline-sm": ["Hanken Grotesk", "sans-serif"]
      },
      "fontSize": {
          "body-md": ["14px", {"lineHeight": "1.5", "fontWeight": "400"}],
          "display-lg": ["40px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "800"}],
          "body-lg": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}],
          "mono-sm": ["13px", {"lineHeight": "1.5", "fontWeight": "400"}],
          "label-md": ["12px", {"lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "500"}],
          "headline-md": ["24px", {"lineHeight": "1.2", "fontWeight": "700"}],
          "headline-sm": ["20px", {"lineHeight": "1.4", "fontWeight": "600"}]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
