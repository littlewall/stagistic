/** Cloud endpoints from the build env; null keeps the app local only. */
export const cloudConfig = (() => {
    const {
        VITE_AUTH_URL: authUrl,
        VITE_SYNC_URL: syncUrl,
        VITE_TURNSTILE_SITE_KEY: turnstileSiteKey,
    } = import.meta.env;

    return authUrl && syncUrl && turnstileSiteKey ? {
        authUrl,
        syncUrl,
        turnstileSiteKey,
    } : null;
})();
