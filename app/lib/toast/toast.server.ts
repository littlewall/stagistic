import {redirect} from '@remix-run/node';

/**
 * Redirects to a URL with toast message parameters
 */
export const redirectWithToast = (
    url: string | URL,
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    init?: {headers?: HeadersInit},
) => {
    const redirectUrl = typeof url === 'string' ? new URL(url) : url;

    redirectUrl.searchParams.set('toast', message);
    redirectUrl.searchParams.set('type', type);

    return redirect(redirectUrl.toString(), init);
};
