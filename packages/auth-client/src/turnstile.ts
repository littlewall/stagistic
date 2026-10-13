/*
 * Cloudflare Turnstile widget (explicit rendering). The token goes with the
 * magic-link request in `x-captcha-response`.
 */

interface TurnstileApi {
    render(element: HTMLElement, options: Record<string, unknown>): string,
    remove(widgetId: string): void,
}

declare global {
    interface Window {
        turnstile?: TurnstileApi,
    }
}

/** Cloudflare's always-pass test site key (local dev). */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

const loadTurnstile = () => {
    loading ??= new Promise<TurnstileApi>((resolve, reject) => {
        if (window.turnstile) {
            resolve(window.turnstile);

            return;
        }

        const script = document.createElement('script');

        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')));
        script.onerror = () => {
            loading = null;
            reject(new Error('Turnstile could not be loaded'));
        };
        document.head.appendChild(script);
    });

    return loading;
};

/** Renders the widget into `element`; returns a cleanup. `onToken(null)` when the token expires. */
export const renderTurnstile = (element: HTMLElement, {siteKey, onToken}: {siteKey: string, onToken: (token: string | null) => void}) => {
    let widgetId: string | null = null;
    let cancelled = false;

    void loadTurnstile().then(api => {
        if (!cancelled) {
            widgetId = api.render(element, {
                sitekey: siteKey,
                callback: (token: string) => onToken(token),
                'expired-callback': () => onToken(null),
                'error-callback': () => onToken(null),
            });
        }
    }).catch(() => onToken(null));

    return () => {
        cancelled = true;

        if (widgetId && window.turnstile) {
            window.turnstile.remove(widgetId);
        }
    };
};
