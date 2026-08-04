import react from '@astrojs/react';
import {defineConfig} from 'astro/config';

export default defineConfig({
    site: 'https://stagistic.com',
    integrations: [react()],
    vite: {
        css: {
            modules: {
                localsConvention: 'camelCase',
            },
        },
    },
});
