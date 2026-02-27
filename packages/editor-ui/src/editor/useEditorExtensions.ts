import {
    createNodeId,
    type EditorSettings,
    type FountainElementType,
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
    AnnotationDecorationsExtension,
    BlockUiEventsExtension,
    CharacterRefSyncExtension,
    CharacterTagDecorationsExtension,
    createPaginationExtension,
    type EditorBlockAnnotation,
    FountainBehaviorExtension,
    FountainColumnExtension,
    FountainColumnGroupExtension,
    FountainDetectionExtension,
    LayerViewFilterExtension,
    PlaceholderExtension,
    StructureMarkerDecorationsExtension,
} from './tiptap/extensions';
import {
    FountainBlockNodes,
    SCRIPT_BLOCK_NODE_NAMES,
} from './tiptap/nodes';
import type {PersistentCharacterRef} from './types';

type UseEditorExtensionsArgs = {
    resolvedSettings: EditorSettings,
    sizeScale: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
    annotations?: readonly EditorBlockAnnotation[],
    visibleLayerIds?: readonly string[],
    visibleBlockTypes?: readonly FountainElementType[],
};

export const useEditorExtensions = ({
    resolvedSettings,
    sizeScale,
    colorByCharacterIdRef,
    rememberedColorByKeyRef,
    persistentCharactersRef,
    annotations,
    visibleLayerIds,
    visibleBlockTypes,
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
    const structureMarkerDecorationsExtension = useMemo(
        () => StructureMarkerDecorationsExtension.configure({
            structureSettings: resolvedSettings.structure,
        }),
        [resolvedSettings.structure],
    );
    const characterTagDecorationsExtension = useMemo(
        () => CharacterTagDecorationsExtension.configure({
            characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
            colorByCharacterIdRef,
            rememberedColorByKeyRef,
            persistentCharactersRef,
        }),
        [
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
    const annotationDecorationsExtension = useMemo(
        () => AnnotationDecorationsExtension.configure({
            annotations,
            visibleLayerIds,
        }),
        [annotations, visibleLayerIds],
    );
    const layerViewFilterExtension = useMemo(
        () => LayerViewFilterExtension.configure({
            visibleBlockTypes,
        }),
        [visibleBlockTypes],
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
            ...FountainBlockNodes,
            FountainDetectionExtension,
            PlaceholderExtension,
            fountainBehaviorExtension,
            structureMarkerDecorationsExtension,
            characterRefSyncExtension,
            characterTagDecorationsExtension,
            layerViewFilterExtension,
            annotationDecorationsExtension,
            uniqueIdExtension,
            BlockUiEventsExtension,
        ];
    }, [
        annotationDecorationsExtension,
        characterRefSyncExtension,
        characterTagDecorationsExtension,
        fountainBehaviorExtension,
        layerViewFilterExtension,
        paginationExtension,
        structureMarkerDecorationsExtension,
        uniqueIdExtension,
    ]);
};
