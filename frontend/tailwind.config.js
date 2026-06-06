/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
            fontFamily: {
                display: ["'Cabinet Grotesk'", "'Bricolage Grotesque'", "ui-sans-serif", "system-ui"],
                sans: ["'Manrope'", "ui-sans-serif", "system-ui"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {
                sand: {
                    50: "#FBF9F4",
                    100: "#F9F6F0",
                    200: "#F2EBE1",
                    300: "#E5DFD3",
                },
                jungle: {
                    50: "#E8F0EC",
                    400: "#3A7868",
                    500: "#265448",
                    600: "#1C4037",
                    700: "#102E25",
                },
                sunset: {
                    400: "#E08066",
                    500: "#D46F4D",
                    600: "#C05E3E",
                },
                sun: {
                    400: "#F0C25C",
                    500: "#E8B241",
                    600: "#C99830",
                },
                ocean: {
                    100: "#BFE4E8",
                    500: "#006C7A",
                    700: "#004B56",
                },
                ink: {
                    900: "#1A2E2A",
                    700: "#4A5D58",
                },
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
                popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
                primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
                secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
                muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
                accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
                destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
            },
            boxShadow: {
                clay: "0 8px 32px rgba(38,84,72,0.08)",
                lift: "0 18px 60px -22px rgba(38,84,72,0.30)",
            },
            keyframes: {
                "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
                "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
                float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                float: "float 5s ease-in-out infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
