import {useSearchParams} from '@remix-run/react';
import {useEffect, useMemo} from 'react';

import {getMagicLinkErrorMessage} from './helpers';

export function useUrlErrorMessage(param: string): string | undefined {
    const [searchParams] = useSearchParams();
    const urlError = searchParams.get(param);
    const urlErrorMessage = useMemo(() => getMagicLinkErrorMessage(urlError), [urlError]);

    useEffect(() => {
        if (urlError) {
            searchParams.delete(param);
            window.history.replaceState(
                {},
                '',
                `${window.location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`,
            );
        }
    }, [
        param,
        urlError,
        searchParams,
    ]);

    return urlErrorMessage;
}
