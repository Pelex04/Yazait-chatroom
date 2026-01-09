/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: "#1f2937", 
        "chat-header": "#111827", 
        "chat-message": "#ffffff", 
        "chat-sent": "#2563eb", 
        "chat-online": "#10b981", 
        primary: {
          DEFAULT: "#eab308", 
          foreground: "#000000", 
        },
        secondary: {
          DEFAULT: "#374151", 
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#6b7280", 
          foreground: "#9ca3af", 
        },
        background: "#ffffff",
        foreground: "#111827", 
        border: "#374151", 
        destructive: {
          DEFAULT: "#ef4444", 
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
}
