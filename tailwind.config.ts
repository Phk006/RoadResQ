import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fuel: {
          500: "#ed6a24",
          600: "#d95c1b",
          900: "#17212b"
        }
      }
    }
  },
  plugins: []
};
export default config;
