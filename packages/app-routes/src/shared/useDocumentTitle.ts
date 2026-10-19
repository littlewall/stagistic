import {useLayoutEffect} from 'react';

import {formatDocumentTitle} from './documentTitle';

export const useDocumentTitle = (context?: string) => {
    useLayoutEffect(() => {
        const previousTitle = document.title;

        document.title = formatDocumentTitle(context);

        return () => {
            document.title = previousTitle;
        };
    }, [context]);
};
