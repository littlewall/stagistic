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
import {
    useMemo,
    useRef,
} from 'react';

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
    onOpenCueManager?: (cueId: string) => void,
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
    onOpenCueManager,
    onCueAssigned,
    onCueUnassigned,
    enableBlockUiEvents,
}: UseEditorExtensionsArgs): Extensions => {
    const paginationExtensionRef = useRef<ReturnType<typeof createPaginationExtension> | null>(
        null,
    );

    if (!paginationExtensionRef.current) {
        paginationExtensionRef.current = createPaginationExtension(resolvedSettings, sizeScale);
    }

    const paginationExtension = paginationExtensionRef.current;
    const blockShortcuts = useMemo(
        () => getBlockShortcuts(resolvedSettings.blocks),
        [resolvedSettings.blocks],
    );
    const blockNextElements = useMemo(
        () => getBlockNextElements(resolvedSettings.blocks),
        [resolvedSettings.blocks],
    );
    const blockCasing = useMemo(
        () => getBlockCasing(resolvedSettings.blocks),
        [resolvedSettings.blocks],
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
            onOpenCueManager,
            onRequestCreateCue,
            onRequestRemoveCue,
        }),
        [
            onCueAssigned,
            onOpenCueManager,
            onRequestCreateCue,
            onRequestRemoveCue,
        ],
    );
    const cueOutNode = useMemo(
        () => CueOutNode.configure({onOpenCueManager}),
        [onOpenCueManager],
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
            cueOutNode,
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
        cueOutNode,
        cueStartNode,
        emptyEnterChooserExtension,
        editorRuntimeExtension,
        enableBlockUiEvents,
        scriptBehaviorExtension,
        paginationExtension,
        uniqueIdExtension,
    ]);
};
