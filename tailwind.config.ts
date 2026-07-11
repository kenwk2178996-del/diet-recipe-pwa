import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF9F3",
        ivory: "#FFFEF9",
        beige: "#EFE7D8",
        sage: "#CADBB7",
        "sage-dark": "#7FA15A",
        mist: "#F1F2EE",
        ink: "#3A3A34"
      },
      fontFamily: { sans: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"] }
    }
  },
  plugins: []
};
export default config;
