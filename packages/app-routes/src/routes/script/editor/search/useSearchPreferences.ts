import type {EditorSearchProps} from '@stagistic/editor';
import {isScriptBlockNodeType, type ScriptBlockNodeType} from '@stagistic/script';
import {useMemo} from 'react';

import {SEARCH_PREFERENCES_STORAGE_KEY} from '../../../../shared/storageKeys';
import {useLocalPreference} from '../../../../shared/useLocalPreference';

const NO_BLOCK_TYPES: readonly ScriptBlockNodeType[] = [];

export const parseSearchBlockTypes = (value: unknown): readonly ScriptBlockNodeType[] | undefined => (
    Array.isArray(value) ? value.filter(isScriptBlockNodeType) : undefined
);

export const getSearchBlockTypesKey = (scriptScope: string) => `${SEARCH_PREFERENCES_STORAGE_KEY}:block-types:script:${scriptScope}`;

/*
 * The block-type filter depends on one script's structure, so it is kept per
 * script and outlives a search: closing search or reloading keeps it.
 */
export const useSearchPreferences = (scriptScope: string): EditorSearchProps => {
    const [blockTypes, setBlockTypes] = useLocalPreference({
        key: getSearchBlockTypesKey(scriptScope),
        defaultValue: NO_BLOCK_TYPES,
        parse: parseSearchBlockTypes,
    });

    return useMemo(() => ({blockTypes, onBlockTypesChange: setBlockTypes}), [blockTypes, setBlockTypes]);
};
