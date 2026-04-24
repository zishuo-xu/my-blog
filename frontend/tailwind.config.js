/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      /* 品牌主色，可通过环境变量配置，默认#165DFF */
      colors: {
        brand: {
          DEFAULT: "#165DFF",
          50: "#E8F0FF",
          100: "#D1E0FF",
          200: "#A3C1FF",
          300: "#75A3FF",
          400: "#4784FF",
          500: "#165DFF",
          600: "#0E4ADB",
          700: "#0A37B5",
          800: "#062490",
          900: "#03116B",
        },
      },
      /* 中性灰阶，统一色板，从浅到深 */
      gray: {
        50: "#f8f9fa",
        100: "#e9ecef",
        200: "#dee2e6",
        300: "#ced4da",
        400: "#adb5bd",
        500: "#6c757d",
        600: "#495057",
        700: "#343a40",
        800: "#212529",
        900: "#1a1a1a",
      },
      /* 字号阶梯：统一规范，禁止零散字号 */
      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.75" }],
        lg: ["18px", { lineHeight: "1.75" }],
        xl: ["20px", { lineHeight: "1.6" }],
        "2xl": ["24px", { lineHeight: "1.5" }],
        "3xl": ["32px", { lineHeight: "1.4" }],
      },
      /* 圆角规范 */
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
      },
      /* 过渡时长：所有动效≤0.3s */
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "150ms",
        slow: "300ms",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
        mono: ['"Fira Code"', "Consolas", "Monaco", "monospace"],
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
}
