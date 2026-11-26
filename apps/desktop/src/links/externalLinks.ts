import {invoke} from '@tauri-apps/api/core';

type OpenExternal = (url: string) => unknown;

/** Opens an https URL in the default browser (narrow Rust command). */
export const openExternalUrl = (url: string): Promise<void> => invoke('desktop_open_external_url', {url});

/** The absolute URL when `href` leaves the app over http(s), else null. */
export const externalUrlFor = (href: string, base: string, appOrigin: string): string | null => {
    try {
        const url = new URL(href, base);
        const isWeb = url.protocol === 'https:' || url.protocol === 'http:';

        return isWeb && url.origin !== appOrigin ? url.href : null;
    } catch {
        return null;
    }
};

/*
 * Anchors that leave the app (http/https to another origin) open in the
 * system browser instead of navigating or spawning a webview window.
 */
export const installExternalLinkHandler = (
    doc: Document,
    open: OpenExternal = openExternalUrl,
): () => void => {
    const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || !(event.target instanceof Element)) {
            return;
        }

        const anchor = event.target.closest('a[href]');

        if (!anchor) {
            return;
        }

        const url = externalUrlFor(anchor.getAttribute('href') ?? '', doc.baseURI, doc.location.origin);

        if (!url) {
            return;
        }

        event.preventDefault();
        void Promise.resolve(open(url)).catch(() => undefined);
    };

    doc.addEventListener('click', onClick);

    return () => doc.removeEventListener('click', onClick);
};
