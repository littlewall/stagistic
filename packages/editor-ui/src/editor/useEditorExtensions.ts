import {
    createNodeId,
    type EditorSettings,
} from '@stagistic/script-core';
import Bold from '@tiptap/extension-bold';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import UniqueID from '@tiptap/extension-unique-id';
import {useMemo} from 'react';

import {DocumentWithSettings} from './editorDocument';
import {
    getBlockCasing,
    getBlockNextElements,
    getBlockShortcuts,
} from './model/blockSettingMaps';
import {
    BlockUiEventsExtension,
    createPaginationExtension,
    FountainBlockExtension,
    FountainColumnExtension,
    FountainColumnGroupExtension,
    ScriptSidebarProjectionExtension,
    ScriptBlockIndexExtension,
} from './tiptap/extensions';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
} from './tiptap/fountainCore';

type UseEditorExtensionsArgs = {
    resolvedSettings: EditorSettings,
    sizeScale: number,
};

export const useEditorExtensions = ({
    resolvedSettings,
    sizeScale,
}: UseEditorExtensionsArgs) => {
    const paginationExtension = useMemo(
        () => createPaginationExtension(resolvedSettings, sizeScale),
        [resolvedSettings, sizeScale],
    );
    const blockShortcuts = useMemo(
        () => getBlockShortcuts(resolvedSettings),
        [resolvedSettings],
    );
    const blockNextElements = useMemo(
        () => getBlockNextElements(resolvedSettings),
        [resolvedSettings],
    );
    const blockCasing = useMemo(
        () => getBlockCasing(resolvedSettings),
        [resolvedSettings],
    );
    const fountainBlockExtension = useMemo(
        () => FountainBlockExtension.configure({
            blockShortcuts,
            blockNextElements,
            blockCasing,
            characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
            structureSettings: resolvedSettings.structure,
        }),
        [
            blockCasing,
            blockNextElements,
            blockShortcuts,
            resolvedSettings.visual.characterColorSaturation,
            resolvedSettings.structure,
        ],
    );
    const uniqueIdExtension = useMemo(() => {
        return UniqueID.configure({
            types: [FOUNTAIN_BLOCK_NODE_NAME],
            attributeName: 'id',
            generateID: () => createNodeId(),
        });
    }, []);

    return useMemo(() => {
        return [
            DocumentWithSettings,
            paginationExtension,
            Text,
            History,
            Bold,
            Italic,
            Underline,
            FountainColumnGroupExtension,
            FountainColumnExtension,
            fountainBlockExtension,
            uniqueIdExtension,
            ScriptBlockIndexExtension,
            ScriptSidebarProjectionExtension,
            BlockUiEventsExtension,
        ];
    }, [
        fountainBlockExtension,
        paginationExtension,
        uniqueIdExtension,
    ]);
};
