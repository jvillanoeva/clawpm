import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        'surface-elevated': '#1a1a1a',
        border: '#2a2a2a',
        accent: '#f97316',
        'accent-hover': '#ea6c0a',
        'text-primary': '#f5f5f5',
        'text-secondary': '#a3a3a3',
        'text-muted': '#525252',
        'priority-urgent': '#ef4444',
        'priority-high': '#f97316',
        'priority-medium': '#eab308',
        'priority-low': '#22c55e',
        'status-todo': '#525252',
        'status-in-progress': '#3b82f6',
        'status-blocked': '#ef4444',
        'status-done': '#22c55e',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
