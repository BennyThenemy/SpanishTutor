import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG icons the manifest lists from public/logo.svg (`npm run icons`).
// The logo is full-bleed Banana Yellow, so maskable padding keeps the bubble in the safe zone.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#F2A900' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#F2A900' } },
  },
  images: ['public/logo.svg'],
})
