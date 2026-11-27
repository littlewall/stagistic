/*
 * Marks the platform on <html>. src/index.css turns `platform-macos` into the
 * window-controls inset the shared UI header keeps clear of (see
 * @stagistic/ui AppHeader.module.css). Web never sets it.
 *
 * TODO: when Windows/Linux desktop builds land, switch to @tauri-apps/plugin-os
 * `platform()` for accurate detection instead of the user-agent sniff, and add
 * a class per platform (Windows: --window-controls-end).
 */
export const applyPlatformClass = (): void => {
    const isMac = (/Mac/i).test(navigator.userAgent);

    if (isMac) {
        document.documentElement.classList.add('platform-macos');
    }
};
