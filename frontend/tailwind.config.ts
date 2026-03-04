import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'vb-black':  '#000000',
        'vb-white':  '#ffffff',
        'vb-gray':   '#111111',
        'vb-border': '#222222',
        'vb-muted':  '#888888',
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
