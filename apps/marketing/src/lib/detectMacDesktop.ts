/*
 * Decides whether a visitor is on a Mac (not an iPhone or iPad), so the home page can offer the Mac
 * app first. Pure: the browser values are passed in, so tests cover every case without a browser.
 */

export interface SystemHints {
    userAgent: string,
    /** `navigator.platform`; deprecated but still the only signal in Safari and Firefox. */
    platform: string,
    /** `navigator.userAgentData?.platform`, set in Chromium browsers. */
    userAgentDataPlatform?: string,
    maxTouchPoints: number,
    /** `navigator.userAgentData?.mobile`. */
    userAgentDataMobile?: boolean,
}

const MOBILE_PATTERN = /iPhone|iPad|iPod|Android|Mobile/i;

export const detectMacDesktop = (hints: SystemHints): boolean => {
    if (hints.userAgentDataMobile) return false;

    if (MOBILE_PATTERN.test(hints.userAgent)) return false;

    const claimsMac = hints.userAgentDataPlatform === 'macOS'
        || (/^Mac/i).test(hints.platform)
        || (/Macintosh/).test(hints.userAgent);

    // iPadOS asks for the desktop site and reports as a Mac, but it has a touch screen; Macs report none.
    return claimsMac && hints.maxTouchPoints <= 1;
};

interface NavigatorWithUserAgentData extends Navigator {
    userAgentData?: {platform?: string, mobile?: boolean},
}

export const readSystemHints = (navigatorLike: Navigator): SystemHints => {
    const {userAgentData} = navigatorLike as NavigatorWithUserAgentData;

    return {
        userAgent: navigatorLike.userAgent,
        platform: navigatorLike.platform,
        userAgentDataPlatform: userAgentData?.platform,
        userAgentDataMobile: userAgentData?.mobile,
        maxTouchPoints: navigatorLike.maxTouchPoints,
    };
};
