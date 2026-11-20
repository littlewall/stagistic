import {validateReleasesPlugin} from '@stagistic/release-notes/validate-plugin';
import {createEditorViteConfig} from '@stagistic/vite-config';
import {versionManifestPlugin} from '@stagistic/vite-config/version-manifest';

export default createEditorViteConfig(import.meta.url, {
    host: true,
    port: 3000,
    strictPort: true,
    hmr: {
        protocol: process.env.VITE_HMR_PROTOCOL || 'ws',
        host: process.env.VITE_HMR_HOST || 'localhost',
        port: process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : 3000,
        clientPort: process.env.VITE_HMR_CLIENT_PORT
            ? Number(process.env.VITE_HMR_CLIENT_PORT)
            : undefined,
    },
    proxy: {
        '/api': {
            target: process.env.VITE_API_URL || 'http://localhost:4000',
            changeOrigin: true,
        },
    },
}, [versionManifestPlugin(), validateReleasesPlugin()]);
