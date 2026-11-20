import type {ScriptRepository} from '@stagistic/db';
import type {EditorSettingsOverride, FormatTemplateId} from '@stagistic/script';
import {useCallback, useMemo} from 'react';

import {useReactiveRecord} from '../collections';
import {getScriptEditorSettingsStore} from './scriptEditorSettingsStore';

export const useScriptEditorSettingsRecord = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptEditorSettingsStore(repository, scriptId)
        : null, [repository, scriptId]);

    const record = useReactiveRecord(store);
    const save = useCallback(
        (settings: EditorSettingsOverride, formatTemplateId?: FormatTemplateId | null) => store?.save(settings, formatTemplateId) ?? Promise.resolve(),
        [store],
    );

    return {...record, save};
};
