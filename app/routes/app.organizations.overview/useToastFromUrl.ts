import {useSearchParams} from '@remix-run/react';
import {useEffect} from 'react';

import {useToast} from '~components/ToastProvider';

export function useToastFromUrl() {
    const [searchParams] = useSearchParams();
    const {showToast} = useToast();

    const message = searchParams.get('toast');
    const type = searchParams.get('type') as 'error' | 'success' | 'info' | undefined;

    useEffect(() => {
        if (message) {
            showToast(message, type || 'info');

            // Remove the toast params from the URL to prevent showing it again on refresh
            searchParams.delete('toast');
            searchParams.delete('type');
            window.history.replaceState(
                {},
                '',
                `${window.location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`,
            );
        }
    }, [
        message,
        type,
        searchParams,
        showToast,
    ]);
}
