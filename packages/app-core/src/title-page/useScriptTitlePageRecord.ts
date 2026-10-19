import type {ScriptRepository} from '@stagistic/db';
import {useMemo} from 'react';

import {useReactiveRecord} from '../collections';
import {getScriptTitlePageStore} from './scriptTitlePageStore';

export const useScriptTitlePageRecord = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptTitlePageStore(repository, scriptId)
        : null, [repository, scriptId]);

    return useReactiveRecord(store);
};
