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

import type {
    EditorCueCreateRequest,
    EditorCueRemoveRequest,
    PersistentCharacterRef,
    PersistentCueRef,
} from './contracts';
import {
    getBlockCasing,
    getBlockNextElements,
    getBlockShortcuts,
} from './model/blockSettingMaps';
import {
    BlockUiEventsExtension,
    CharacterRefSyncExtension,
    CharacterTagInputExtension,
    createPaginationExtension,
    CueCommandsExtension,
    CueInputExtension,
    CueNumberingExtension,
    EditorRuntimeExtension,
    EmptyEnterChooserExtension,
    PlaceholderExtension,
    ScriptBehaviorExtension,
} from './tiptap/extensions';
import {DocumentWithSettings} from './tiptap/extensions/DocumentExtension';
import {CharacterTagMark} from './tiptap/marks';
import {
    CueOutNode,
    CueStartNode,
    SCRIPT_BLOCK_NODE_NAMES,
    ScriptBlockNodes,
} from './tiptap/nodes';
import characterTagStyles from './tiptap/scriptBlock/CharacterTagDecorations.module.css';

type UseEditorExtensionsArgs = {
    resolvedSettings: EditorSettings,
    sizeScale: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
    persistentCuesRef?: {current: readonly PersistentCueRef[]},
    onRequestCreateCue?: (request: EditorCueCreateRequest) => void,
    onRequestRemoveCue?: (request: EditorCueRemoveRequest) => void,
    onCueAssigned?: (cueId: string) => void,
    onCueUnassigned?: (cueId: string) => void,
    enableBlockUiEvents?: boolean,
};

export const useEditorExtensions = ({
    resolvedSettings,
    sizeScale,
    colorByCharacterIdRef,
    rememberedColorByKeyRef,
    persistentCharactersRef,
    persistentCuesRef,
    onRequestCreateCue,
    onRequestRemoveCue,
    onCueAssigned,
    onCueUnassigned,
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
    const scriptBehaviorExtension = useMemo(
        () => ScriptBehaviorExtension.configure({
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
    const characterTagMark = useMemo(
        () => CharacterTagMark.configure({tagClassName: characterTagStyles.characterTag}),
        [],
    );
    const characterTagInputExtension = useMemo(
        () => CharacterTagInputExtension.configure({
            persistentCharactersRef,
        }),
        [persistentCharactersRef],
    );
    const cueInputExtension = useMemo(
        () => CueInputExtension.configure({
            persistentCuesRef,
            onRequestCreateCue,
            onCueAssigned,
        }),
        [
            onCueAssigned,
            onRequestCreateCue,
            persistentCuesRef,
        ],
    );
    const cueCommandsExtension = useMemo(
        () => CueCommandsExtension.configure({
            onCueUnassigned,
        }),
        [onCueUnassigned],
    );
    const cueStartNode = useMemo(
        () => CueStartNode.configure({
            onCueAssigned,
            onRequestCreateCue,
            onRequestRemoveCue,
        }),
        [onCueAssigned, onRequestCreateCue, onRequestRemoveCue],
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
            characterTagMark,
            characterTagInputExtension,
            ...ScriptBlockNodes,
            cueStartNode,
            CueOutNode,
            cueCommandsExtension,
            cueInputExtension,
            CueNumberingExtension,
            PlaceholderExtension,
            emptyEnterChooserExtension,
            scriptBehaviorExtension,
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
        characterTagMark,
        characterTagInputExtension,
        cueCommandsExtension,
        cueInputExtension,
        cueStartNode,
        emptyEnterChooserExtension,
        editorRuntimeExtension,
        enableBlockUiEvents,
        scriptBehaviorExtension,
        paginationExtension,
        uniqueIdExtension,
    ]);
};
