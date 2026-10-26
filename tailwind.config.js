/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f17',
        panel: '#141a26',
        panel2: '#1c2433',
        line: '#2a3446',
        hero: '#ffd400',
        punch: '#ff3b3b',
        ok: '#22d39b',
        info: '#3ea6ff',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang TC"', '"Noto Sans TC"', '"Microsoft JhengHei"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
