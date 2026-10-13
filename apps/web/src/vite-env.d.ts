/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string,
    /** Cloud sync; all three unset = local only (no account UI). */
    readonly VITE_AUTH_URL?: string,
    readonly VITE_SYNC_URL?: string,
    readonly VITE_TURNSTILE_SITE_KEY?: string,
}

interface ImportMeta {
    readonly env: ImportMetaEnv,
}
