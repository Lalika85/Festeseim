/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'premium': '0 8px 30px rgba(0, 0, 0, 0.04)',
                'premium-lg': '0 20px 50px rgba(8, 112, 184, 0.07)',
                'button': '0 10px 20px -5px rgba(37, 99, 235, 0.3)',
                'button-hover': '0 15px 25px -5px rgba(37, 99, 235, 0.4)',
            },
        },
    },
    plugins: [],
}
