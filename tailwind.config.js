/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: "#1f2937", // gray-800
        "chat-header": "#111827", // gray-900
        "chat-message": "#ffffff", // white for message input bg
        "chat-sent": "#2563eb", // blue-600 for sent messages
        "chat-online": "#10b981", // green-500 for online indicator
        primary: {
          DEFAULT: "#eab308", // yellow-500
          foreground: "#000000", // black text on yellow
        },
        secondary: {
          DEFAULT: "#374151", // gray-700
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#6b7280", // gray-500
          foreground: "#9ca3af", // gray-400
        },
        background: "#ffffff",
        foreground: "#111827", // gray-900
        border: "#374151", // gray-700
        destructive: {
          DEFAULT: "#ef4444", // red-500
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
}
