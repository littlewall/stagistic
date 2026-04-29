import {
    createNodeId,
    type EditorSettings,
} from '@stagistic/script';
import {type Extensions} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import UniqueID from '@tiptap/extension-unique-id';
import {useMemo} from 'react';

import type {PersistentCharacterRef} from './contracts';
import {
    getBlockCasing,
    getBlockNextElements,
    getBlockShortcuts,
} from './model/blockSettingMaps';
import {
    BlockUiEventsExtension,
    CharacterRefSyncExtension,
    createPaginationExtension,
    EditorRuntimeExtension,
    EmptyEnterChooserExtension,
    FountainBehaviorExtension,
    FountainColumnExtension,
    FountainColumnGroupExtension,
    PlaceholderExtension,
    StructureMarkerDecorationsExtension,
} from './tiptap/extensions';
import {DocumentWithSettings} from './tiptap/extensions/DocumentExtension';
import characterTagStyles from './tiptap/fountainBlock/CharacterTagDecorations.module.css';
import {
    FountainBlockNodes,
    SCRIPT_BLOCK_NODE_NAMES,
} from './tiptap/nodes';

type UseEditorExtensionsArgs = {
    resolvedSettings: EditorSettings,
    sizeScale: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
    enableBlockUiEvents?: boolean,
};

export const useEditorExtensions = ({
    resolvedSettings,
    sizeScale,
    colorByCharacterIdRef,
    rememberedColorByKeyRef,
    persistentCharactersRef,
    enableBlockUiEvents,
}: UseEditorExtensionsArgs): Extensions => {
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
    const fountainBehaviorExtension = useMemo(
        () => FountainBehaviorExtension.configure({
            blockShortcuts,
            blockNextElements,
            blockCasing,
        }),
        [
            blockCasing,
            blockNextElements,
            blockShortcuts,
        ],
    );
    const emptyEnterChooserExtension = useMemo(
        () => EmptyEnterChooserExtension.configure({
            blockNextElements,
        }),
        [blockNextElements],
    );
    const structureMarkerDecorationsExtension = useMemo(
        () => StructureMarkerDecorationsExtension.configure({
            structureSettings: resolvedSettings.structure,
        }),
        [resolvedSettings.structure],
    );
    const editorRuntimeExtension = useMemo(
        () => EditorRuntimeExtension.configure({
            characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
            colorByCharacterIdRef,
            rememberedColorByKeyRef,
            persistentCharactersRef,
            characterTagClassNames: {
                tag: characterTagStyles.characterTag,
                separator: characterTagStyles.characterSeparator,
            },
        }),
        [
            characterTagStyles.characterSeparator,
            characterTagStyles.characterTag,
            colorByCharacterIdRef,
            rememberedColorByKeyRef,
            persistentCharactersRef,
            resolvedSettings.visual.characterColorSaturation,
        ],
    );
    const characterRefSyncExtension = useMemo(
        () => CharacterRefSyncExtension.configure({
            persistentCharactersRef,
        }),
        [persistentCharactersRef],
    );
    const uniqueIdExtension = useMemo(() => {
        const uniqueIdTypes = [...SCRIPT_BLOCK_NODE_NAMES];

        return UniqueID.configure({
            types: uniqueIdTypes,
            attributeName: 'id',
            generateID: () => createNodeId(),
        });
    }, []);

    return useMemo(() => {
        const extensions: Extensions = [
            DocumentWithSettings,
            paginationExtension,
            Text,
            History,
            Bold,
            Italic,
            Underline,
            FountainColumnGroupExtension,
            FountainColumnExtension,
            ...FountainBlockNodes,
            PlaceholderExtension,
            emptyEnterChooserExtension,
            fountainBehaviorExtension,
            structureMarkerDecorationsExtension,
            characterRefSyncExtension,
            editorRuntimeExtension,
            uniqueIdExtension,
        ];

        if (enableBlockUiEvents) {
            extensions.push(BlockUiEventsExtension);
        }

        return extensions;
    }, [
        characterRefSyncExtension,
        emptyEnterChooserExtension,
        editorRuntimeExtension,
        enableBlockUiEvents,
        fountainBehaviorExtension,
        paginationExtension,
        structureMarkerDecorationsExtension,
        uniqueIdExtension,
    ]);
};
