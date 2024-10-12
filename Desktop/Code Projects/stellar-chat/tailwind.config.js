const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config}*/
const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  darkMode: ["class"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      yellow: colors.yellow,
      black: colors.black,
      white: colors.white,
      gray: colors.gray,
      blue: colors.blue,
      red: colors.red,
      rose: colors.rose,
      slate: colors.slate,
      orange: colors.orange,
      green: colors.green,
      neutral: colors.neutral,
      primary: "rgb(var(--color-primary,neutral) / <alpha-value>)",
      secondary: "rgb(var(--color-secondary,neutral) / <alpha-value>)",
      accent: "rgb(var(--color-accent,neutral) / <alpha-value>)",
    },
    extend: {},
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/typography"),
  ],
};

module.exports = config;
