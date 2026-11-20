import react from '@astrojs/react';
import {validateReleasesPlugin} from '@stagistic/release-notes/validate-plugin';
import {defineConfig} from 'astro/config';

export default defineConfig({
    site: 'https://stagistic.com',
    integrations: [react()],
    trailingSlash: 'never',
    build: {
        format: 'file',
    },
    vite: {
        plugins: [validateReleasesPlugin()],
        css: {
            modules: {
                localsConvention: 'camelCase',
            },
        },
    },
});
