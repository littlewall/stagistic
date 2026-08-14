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
    EditorMusicCreateRequest,
    EditorMusicRemoveRequest,
    PersistentCharacterRef,
    PersistentMusicRef,
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
    EditorRuntimeExtension,
    EmptyEnterChooserExtension,
    MusicCommandsExtension,
    MusicInputExtension,
    MusicNumberingExtension,
    MusicRailExtension,
    PlaceholderExtension,
    SceneNumberingExtension,
    ScriptBehaviorExtension,
} from './tiptap/extensions';
import {DocumentWithSettings} from './tiptap/extensions/DocumentExtension';
import {CharacterTagMark} from './tiptap/marks';
import {
    MusicOutNode,
    MusicStartNode,
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
    persistentMusicRef?: {current: readonly PersistentMusicRef[]},
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
    onOpenMusicManager?: (musicId: string) => void,
    onMusicAssigned?: (musicId: string) => void,
    onMusicUnassigned?: (musicId: string) => void,
    enableBlockUiEvents?: boolean,
};

export const useEditorExtensions = ({
    resolvedSettings,
    sizeScale,
    colorByCharacterIdRef,
    rememberedColorByKeyRef,
    persistentCharactersRef,
    persistentMusicRef,
    onRequestCreateMusic,
    onRequestRemoveMusic,
    onOpenMusicManager,
    onMusicAssigned,
    onMusicUnassigned,
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
    const musicInputExtension = useMemo(
        () => MusicInputExtension.configure({
            persistentMusicRef,
            onRequestCreateMusic,
            onMusicAssigned,
        }),
        [
            onMusicAssigned,
            onRequestCreateMusic,
            persistentMusicRef,
        ],
    );
    const musicCommandsExtension = useMemo(
        () => MusicCommandsExtension.configure({
            onMusicUnassigned,
        }),
        [onMusicUnassigned],
    );
    const musicStartNode = useMemo(
        () => MusicStartNode.configure({
            onMusicAssigned,
            onOpenMusicManager,
            onRequestCreateMusic,
            onRequestRemoveMusic,
            persistentMusicRef,
        }),
        [
            onMusicAssigned,
            onOpenMusicManager,
            onRequestCreateMusic,
            onRequestRemoveMusic,
            persistentMusicRef,
        ],
    );
    const musicOutNode = useMemo(
        () => MusicOutNode.configure({onOpenMusicManager}),
        [onOpenMusicManager],
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
            musicStartNode,
            musicOutNode,
            musicCommandsExtension,
            musicInputExtension,
            MusicNumberingExtension,
            MusicRailExtension,
            PlaceholderExtension,
            SceneNumberingExtension,
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
        musicCommandsExtension,
        musicInputExtension,
        musicOutNode,
        musicStartNode,
        emptyEnterChooserExtension,
        editorRuntimeExtension,
        enableBlockUiEvents,
        scriptBehaviorExtension,
        paginationExtension,
        uniqueIdExtension,
    ]);
};
