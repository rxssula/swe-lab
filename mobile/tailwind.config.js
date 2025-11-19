/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./index.{js,jsx,ts,tsx}",
        "./app/**/*.{js,jsx,ts,tsx}",   // 👈 this is the important one
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors:{
                primary:'#A7A2A9',
                secondary:'#7C7C7C'
            }
        },
    },
    plugins: [],
};
