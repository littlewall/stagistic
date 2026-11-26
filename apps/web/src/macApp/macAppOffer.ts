/** The parts of `navigator` that decide whether the Mac app is on offer. Injected so the rule is testable. */
export type NavigatorLike = {
    userAgent?: string,
    platform?: string,
    maxTouchPoints?: number,
    userAgentData?: {platform?: string, mobile?: boolean},
};

const MOBILE_AGENT = /iPhone|iPad|iPod|Android|Mobi/;

/**
 * True only in a desktop browser on macOS. iPadOS reports itself as a Mac with a touch screen,
 * so touch points rule it out; phones and tablets are excluded by the mobile hints.
 */
export const isMacDesktopBrowser = (environment: NavigatorLike) => {
    const {userAgentData} = environment;
    const reportsMac = userAgentData?.platform === 'macOS' || (environment.platform ?? '').startsWith('Mac');

    if (!reportsMac) {
        return false;
    }

    if (userAgentData?.mobile || (environment.maxTouchPoints ?? 0) > 1) {
        return false;
    }

    return !MOBILE_AGENT.test(environment.userAgent ?? '');
};

const DISMISSED_STORAGE_KEY = 'stagistic.web.macAppCardDismissed';

export const readMacAppCardDismissed = () => {
    try {
        return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
};

export const storeMacAppCardDismissed = () => {
    try {
        window.localStorage.setItem(DISMISSED_STORAGE_KEY, '1');
    } catch {
        // Storage may be blocked; the card then returns next visit, which is harmless.
    }
};
