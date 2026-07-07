import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG icon set in public/ from the favicon source:
//   npm run generate:icons
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.35,
      resizeOptions: { background: '#09090b' },
    },
    apple: {
      sizes: [180],
      padding: 0.3,
      resizeOptions: { background: '#09090b' },
    },
  },
  images: ['public/favicon.svg'],
})
