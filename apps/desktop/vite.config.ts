import {createEditorViteConfig} from '@stagistic/vite-config';

const host = process.env.TAURI_DEV_HOST;

export default createEditorViteConfig(import.meta.url, {
    host: host || true,
    port: 5173,
    strictPort: true,
    hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 5173,
        }
        : undefined,
});
