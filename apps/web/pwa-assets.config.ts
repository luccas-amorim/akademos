import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Ícones PNG (192, 512, maskable, apple-touch) gerados a partir do favicon SVG.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1e3a8a' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1e3a8a' } },
  },
  images: ['public/favicon.svg'],
});
