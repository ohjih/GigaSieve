// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://www.gigasievepages.com',
  trailingSlash: 'always',
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});
