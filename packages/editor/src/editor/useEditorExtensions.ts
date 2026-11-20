import {
    createNodeId,
    DEFAULT_SCENE_NUMBER_FORMAT,
    type EditorSettings,
} from '@stagistic/script';
import {type Extensions} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import UniqueID from '@tiptap/extension-unique-id';
import {useMemo, useState} from 'react';

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
    BlockFocusFlashExtension,
    BlockSpacingExtension,
    BlockUiEventsExtension,
    CharacterRefSyncExtension,
    CharacterTagInputExtension,
    CommentsExtension,
    type CommentsExtensionCallbacks,
    createPaginationExtension,
    EditorRuntimeExtension,
    EmptyEnterChooserExtension,
    MusicCommandsExtension,
    MusicInputExtension,
    MusicNumberingExtension,
    MusicRailExtension,
    PlaceholderExtension,
    ReadOnlyGuardExtension,
    SceneCollapseExtension,
    SceneCommandsExtension,
    SceneGuardExtension,
    SceneNumberingExtension,
    ScriptBehaviorExtension,
    SearchExtension,
} from './tiptap/extensions';
import {DocumentWithSettings} from './tiptap/extensions/DocumentExtension';
import {CharacterTagMark, CommentAnchorMark} from './tiptap/marks';
import {
    MusicOutNode,
    MusicStartNode,
    ScriptBlockNodes,
} from './tiptap/nodes';
import characterTagStyles from './tiptap/scriptBlock/CharacterTagDecorations.module.css';
import {type BlockNodeType, SCRIPT_BLOCK_NODE_NAMES} from './tiptap/scriptCore';

type UseEditorExtensionsArgs = {
    resolvedSettings: EditorSettings,
    runtimeSettingsRef?: {current: EditorSettings},
    editorZoom: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
    persistentMusicRef?: {current: readonly PersistentMusicRef[]},
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
    onOpenMusicManager?: (musicId: string) => void,
    onMusicAssigned?: (musicId: string) => void,
    onMusicUnassigned?: (musicId: string) => void,
    onRequestDeleteScene?: (sceneHeadingBlockId: string) => void,
    onRequestConvertScene?: (sceneHeadingBlockId: string, targetBlockType: BlockNodeType) => void,
    commentCallbacksRef?: {current: CommentsExtensionCallbacks},
    enableBlockUiEvents?: boolean,
    isReadOnly?: boolean,
};

export const useEditorExtensions = ({
    resolvedSettings,
    runtimeSettingsRef,
    editorZoom,
    colorByCharacterIdRef,
    rememberedColorByKeyRef,
    persistentCharactersRef,
    persistentMusicRef,
    onRequestCreateMusic,
    onRequestRemoveMusic,
    onOpenMusicManager,
    onMusicAssigned,
    onMusicUnassigned,
    onRequestDeleteScene,
    onRequestConvertScene,
    commentCallbacksRef,
    enableBlockUiEvents,
    isReadOnly = false,
}: UseEditorExtensionsArgs): Extensions => {
    const [paginationExtension] = useState(() => createPaginationExtension(resolvedSettings, editorZoom));
    const blockShortcuts = useMemo(() => getBlockShortcuts(resolvedSettings.blocks), [resolvedSettings.blocks]);
    const blockNextElements = useMemo(() => getBlockNextElements(resolvedSettings.blocks), [resolvedSettings.blocks]);
    const blockCasing = useMemo(() => getBlockCasing(resolvedSettings.blocks), [resolvedSettings.blocks]);
    const scriptBehaviorExtension = useMemo(
        // oxlint-disable-next-line react/refs -- Getters are called by editor events, never while rendering.
        () => ScriptBehaviorExtension.configure({
            blockShortcuts,
            blockNextElements,
            blockCasing,
            getSettings: runtimeSettingsRef ? () => ({
                blockShortcuts: getBlockShortcuts(runtimeSettingsRef.current.blocks),
                blockNextElements: getBlockNextElements(runtimeSettingsRef.current.blocks),
                blockCasing: getBlockCasing(runtimeSettingsRef.current.blocks),
            }) : undefined,
        }),
        [
            blockCasing,
            blockNextElements,
            blockShortcuts,
            runtimeSettingsRef,
        ],
    );
    const emptyEnterChooserExtension = useMemo(
        // oxlint-disable-next-line react/refs -- The getter is called by an editor command.
        () => EmptyEnterChooserExtension.configure({
            blockNextElements,
            getBlockNextElements: runtimeSettingsRef ? () => getBlockNextElements(runtimeSettingsRef.current.blocks) : undefined,
        }),
        [blockNextElements, runtimeSettingsRef],
    );
    const editorRuntimeExtension = useMemo(
        () => EditorRuntimeExtension.configure({
            colorByCharacterIdRef,
            rememberedColorByKeyRef,
            persistentCharactersRef,
            characterTagClassNames: {
                tag: characterTagStyles.characterTag,
                separator: characterTagStyles.characterSeparator,
                line: characterTagStyles.characterLine,
            },
        }),
        [
            colorByCharacterIdRef,
            rememberedColorByKeyRef,
            persistentCharactersRef,
        ],
    );
    const characterRefSyncExtension = useMemo(
        () => CharacterRefSyncExtension.configure({
            persistentCharactersRef,
        }),
        [persistentCharactersRef],
    );
    const characterTagMark = useMemo(() => CharacterTagMark.configure({tagClassName: characterTagStyles.characterTag}), []);
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
    const sceneCommandsExtension = useMemo(
        () => SceneCommandsExtension.configure({
            onRequestDeleteScene,
            onRequestConvertScene,
        }),
        [onRequestDeleteScene, onRequestConvertScene],
    );
    const sceneNumberFormat = resolvedSettings.blocks.scene?.sceneNumberFormat ?? DEFAULT_SCENE_NUMBER_FORMAT;
    // oxlint-disable-next-line react/refs -- The getter is called by the ProseMirror plugin.
    const sceneNumberingExtension = useMemo(() => SceneNumberingExtension.configure({
        format: sceneNumberFormat,
        getFormat: runtimeSettingsRef ? () => runtimeSettingsRef.current.blocks.scene?.sceneNumberFormat ?? DEFAULT_SCENE_NUMBER_FORMAT : undefined,
    }), [sceneNumberFormat, runtimeSettingsRef]);
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
    const musicOutNode = useMemo(() => MusicOutNode.configure({onOpenMusicManager}), [onOpenMusicManager]);
    // oxlint-disable-next-line react/refs -- Tiptap stores getCallbacks and invokes it from plugin events, never while configuring the extension.
    const commentsExtension = useMemo(() => CommentsExtension.configure({getCallbacks: () => commentCallbacksRef?.current ?? {}}), [commentCallbacksRef]);
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
            CommentAnchorMark,
            characterTagInputExtension,
            ...ScriptBlockNodes,
            musicStartNode,
            musicOutNode,
            musicCommandsExtension,
            musicInputExtension,
            MusicNumberingExtension,
            BlockSpacingExtension,
            MusicRailExtension,
            PlaceholderExtension,
            SearchExtension,
            commentsExtension,
            BlockFocusFlashExtension,
            sceneCommandsExtension,
            SceneCollapseExtension,
            SceneGuardExtension,
            sceneNumberingExtension,
            emptyEnterChooserExtension,
            scriptBehaviorExtension,
            characterRefSyncExtension,
            editorRuntimeExtension,
            uniqueIdExtension,
        ];

        if (enableBlockUiEvents) {
            extensions.push(BlockUiEventsExtension);
        }

        if (isReadOnly) {
            extensions.push(ReadOnlyGuardExtension);
        }

        return extensions;
    }, [
        characterRefSyncExtension,
        characterTagMark,
        characterTagInputExtension,
        commentsExtension,
        musicCommandsExtension,
        musicInputExtension,
        musicOutNode,
        musicStartNode,
        sceneCommandsExtension,
        sceneNumberingExtension,
        emptyEnterChooserExtension,
        editorRuntimeExtension,
        enableBlockUiEvents,
        isReadOnly,
        scriptBehaviorExtension,
        paginationExtension,
        uniqueIdExtension,
    ]);
};
