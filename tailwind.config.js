/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        critical: '#E24B4A',
        criticalLight: '#2D1515',
        urgent: '#EF9F27',
        urgentLight: '#2D2010',
        routine: '#1D9E75',
        routineLight: '#0D2018',
        primary: '#1D9E75',
        surface: '#1A1D27',
        surfaceLight: '#222536',
        border: '#2A2D3E',
        textPrimary: '#F1F5F9',
        textSecondary: '#94A3B8',
      },
    },
  },
  plugins: [],
}
