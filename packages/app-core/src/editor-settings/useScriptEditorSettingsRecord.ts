import type {ScriptRepository} from '@stagistic/db';
import {useMemo} from 'react';

import {useReactiveRecord} from '../collections';
import {getScriptEditorSettingsStore} from './scriptEditorSettingsStore';

export const useScriptEditorSettingsRecord = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptEditorSettingsStore(repository, scriptId)
        : null, [repository, scriptId]);

    return useReactiveRecord(store);
};
