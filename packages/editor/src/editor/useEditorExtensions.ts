import {createNodeId, DEFAULT_SCENE_NUMBER_FORMAT, type EditorSettings} from '@stagistic/script';
import {type Extensions} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import UniqueID from '@tiptap/extension-unique-id';
import {useMemo, useRef} from 'react';

import type {EditorMusicCreateRequest, EditorMusicRemoveRequest, PersistentCharacterRef, PersistentMusicRef} from './contracts';
import {getBlockCasing, getBlockNextElements, getBlockShortcuts} from './model/blockSettingMaps';
import {
    BlockFocusFlashExtension,
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
    SceneCommandsExtension,
    SceneCollapseExtension,
    SceneGuardExtension,
    SceneNumberingExtension,
    ScriptBehaviorExtension,
} from './tiptap/extensions';
import {DocumentWithSettings} from './tiptap/extensions/DocumentExtension';
import {CharacterTagMark} from './tiptap/marks';
import {MusicOutNode, MusicStartNode, SCRIPT_BLOCK_NODE_NAMES, ScriptBlockNodes} from './tiptap/nodes';
import type {BlockNodeType} from './tiptap/scriptCore';

import characterTagStyles from './tiptap/scriptBlock/CharacterTagDecorations.module.css';

type UseEditorExtensionsArgs = {
    resolvedSettings: EditorSettings;
    editorZoom: number;
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>};
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>};
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]};
    persistentMusicRef?: {current: readonly PersistentMusicRef[]};
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void;
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void;
    onOpenMusicManager?: (musicId: string) => void;
    onMusicAssigned?: (musicId: string) => void;
    onMusicUnassigned?: (musicId: string) => void;
    onRequestDeleteScene?: (sceneHeadingBlockId: string) => void;
    onRequestConvertScene?: (sceneHeadingBlockId: string, targetBlockType: BlockNodeType) => void;
    enableBlockUiEvents?: boolean;
};

export const useEditorExtensions = ({
    resolvedSettings,
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
    enableBlockUiEvents,
}: UseEditorExtensionsArgs): Extensions => {
    const paginationExtensionRef = useRef<ReturnType<typeof createPaginationExtension> | null>(null);

    if (!paginationExtensionRef.current) {
        paginationExtensionRef.current = createPaginationExtension(resolvedSettings, editorZoom);
    }

    const paginationExtension = paginationExtensionRef.current;
    const blockShortcuts = useMemo(() => getBlockShortcuts(resolvedSettings.blocks), [resolvedSettings.blocks]);
    const blockNextElements = useMemo(() => getBlockNextElements(resolvedSettings.blocks), [resolvedSettings.blocks]);
    const blockCasing = useMemo(() => getBlockCasing(resolvedSettings.blocks), [resolvedSettings.blocks]);
    const scriptBehaviorExtension = useMemo(
        () =>
            ScriptBehaviorExtension.configure({
                blockShortcuts,
                blockNextElements,
                blockCasing,
            }),
        [blockCasing, blockNextElements, blockShortcuts],
    );
    const emptyEnterChooserExtension = useMemo(
        () =>
            EmptyEnterChooserExtension.configure({
                blockNextElements,
            }),
        [blockNextElements],
    );
    const editorRuntimeExtension = useMemo(
        () =>
            EditorRuntimeExtension.configure({
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
        () =>
            CharacterRefSyncExtension.configure({
                persistentCharactersRef,
            }),
        [persistentCharactersRef],
    );
    const characterTagMark = useMemo(() => CharacterTagMark.configure({tagClassName: characterTagStyles.characterTag}), []);
    const characterTagInputExtension = useMemo(
        () =>
            CharacterTagInputExtension.configure({
                persistentCharactersRef,
            }),
        [persistentCharactersRef],
    );
    const musicInputExtension = useMemo(
        () =>
            MusicInputExtension.configure({
                persistentMusicRef,
                onRequestCreateMusic,
                onMusicAssigned,
            }),
        [onMusicAssigned, onRequestCreateMusic, persistentMusicRef],
    );
    const musicCommandsExtension = useMemo(
        () =>
            MusicCommandsExtension.configure({
                onMusicUnassigned,
            }),
        [onMusicUnassigned],
    );
    const sceneCommandsExtension = useMemo(
        () =>
            SceneCommandsExtension.configure({
                onRequestDeleteScene,
                onRequestConvertScene,
            }),
        [onRequestDeleteScene, onRequestConvertScene],
    );
    const sceneNumberFormat = resolvedSettings.blocks.scene?.sceneNumberFormat ?? DEFAULT_SCENE_NUMBER_FORMAT;
    const sceneNumberingExtension = useMemo(() => SceneNumberingExtension.configure({format: sceneNumberFormat}), [sceneNumberFormat]);
    const musicStartNode = useMemo(
        () =>
            MusicStartNode.configure({
                onMusicAssigned,
                onOpenMusicManager,
                onRequestCreateMusic,
                onRequestRemoveMusic,
                persistentMusicRef,
            }),
        [onMusicAssigned, onOpenMusicManager, onRequestCreateMusic, onRequestRemoveMusic, persistentMusicRef],
    );
    const musicOutNode = useMemo(() => MusicOutNode.configure({onOpenMusicManager}), [onOpenMusicManager]);
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

        return extensions;
    }, [
        characterRefSyncExtension,
        characterTagMark,
        characterTagInputExtension,
        musicCommandsExtension,
        musicInputExtension,
        musicOutNode,
        musicStartNode,
        sceneCommandsExtension,
        sceneNumberingExtension,
        emptyEnterChooserExtension,
        editorRuntimeExtension,
        enableBlockUiEvents,
        scriptBehaviorExtension,
        paginationExtension,
        uniqueIdExtension,
    ]);
};
