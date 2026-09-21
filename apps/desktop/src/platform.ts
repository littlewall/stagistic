// The shared UI header reserves space for the macOS window controls ("traffic
// lights") and enables its drag region only when the document carries the
// `platform-macos` class (see @stagistic/ui AppHeader.module.css). Web never
// sets it; the desktop shell does, on macOS.
//
// TODO: when Windows/Linux desktop builds land, switch to @tauri-apps/plugin-os
// `platform()` for accurate detection instead of the user-agent sniff.
export const applyPlatformClass = (): void => {
    const isMac = /Mac/i.test(navigator.userAgent);

    if (isMac) {
        document.documentElement.classList.add('platform-macos');
    }
};
