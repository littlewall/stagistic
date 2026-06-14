import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {DecorationSet} from '@tiptap/pm/view';

import type {PersistentCharacterRef} from '../../contracts';
import {
    incrementCharacterDecorationRebuildCount,
    incrementCharacterRuntimeRebuildCount,
    incrementStructureRuntimeRebuildCount,
} from '../../perf/editorPerfMetrics';
import {
    buildCharacterRuntime,
} from '../../runtime/buildCharacterRuntime';
import {buildStructureRuntime} from '../../runtime/buildStructureRuntime';
import type {EditorRuntimeState} from '../../runtime/editorRuntimeTypes';
import {
    selectionTouchesCharacterBlock,
    transactionTouchesCharacterBlocks,
    transactionTouchesStructureBlocks,
} from '../../runtime/transactionGuards';
import {
    type BlockNodeType,
    getActiveScriptBlockFromState,
} from '../scriptCore';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        editorRuntime: {
            refreshCharacterTagDecorations: () => ReturnType,
        },
    }
}

interface EditorRuntimeOptions {
    characterColorSaturation?: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
    characterTagClassNames?: {
        tag: string,
        separator: string,
    },
}

const EMPTY_DECORATIONS = DecorationSet.empty;

export const editorRuntimeKey = new PluginKey<EditorRuntimeState>('editor-runtime');

const EDITOR_RUNTIME_REFRESH_META_KEY = 'editor-runtime-refresh';

const resolveActiveBlock = (state: EditorState): {
    activeBlockId: string | null,
    activeBlockType: BlockNodeType | null,
} => {
    const activeBlock = getActiveScriptBlockFromState(state);

    return {
        activeBlockId: activeBlock?.id ?? null,
        activeBlockType: activeBlock?.blockType ?? null,
    };
};

const buildCharacterState = (
    state: EditorState,
    options: EditorRuntimeOptions,
) => {
    incrementCharacterRuntimeRebuildCount();

    const nextRuntime = buildCharacterRuntime({
        doc: state.doc,
        selectionFrom: state.selection.from,
        persistentCharacters: options.persistentCharactersRef?.current,
        colorByCharacterId: options.colorByCharacterIdRef?.current,
        rememberedColorByKey: options.rememberedColorByKeyRef?.current,
        characterColorSaturation: options.characterColorSaturation,
        characterTagClassNames: options.characterTagClassNames,
    });

    incrementCharacterDecorationRebuildCount();

    return nextRuntime;
};

const createInitialState = (
    state: EditorState,
    options: EditorRuntimeOptions,
): EditorRuntimeState => {
    const characterState = buildCharacterState(state, options);
    const activeBlock = resolveActiveBlock(state);

    incrementStructureRuntimeRebuildCount();

    return {
        revision: 0,
        activeBlockId: activeBlock.activeBlockId,
        activeBlockType: activeBlock.activeBlockType,
        structure: buildStructureRuntime(state.doc),
        characters: characterState.snapshot,
        characterDecorations: characterState.decorations,
    };
};

export const getEditorRuntimeFromState = (state: EditorState): EditorRuntimeState | null => {
    return editorRuntimeKey.getState(state) ?? null;
};

export const EditorRuntimeExtension = Extension.create<EditorRuntimeOptions>({
    name: 'EditorRuntime',

    addOptions() {
        return {
            characterColorSaturation: undefined,
            colorByCharacterIdRef: undefined,
            rememberedColorByKeyRef: undefined,
            persistentCharactersRef: undefined,
            characterTagClassNames: undefined,
        };
    },

    addCommands() {
        return {
            refreshCharacterTagDecorations: () => ({state, dispatch}) => {
                if (!dispatch) {
                    return true;
                }

                dispatch(state.tr.setMeta(EDITOR_RUNTIME_REFRESH_META_KEY, true));

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        return [
            new Plugin<EditorRuntimeState>({
                key: editorRuntimeKey,
                state: {
                    init: (_config, state) => createInitialState(state, options),
                    apply: (tr, pluginState, oldState, newState) => {
                        const shouldRefreshCharacters = tr.getMeta(EDITOR_RUNTIME_REFRESH_META_KEY) === true
                            || transactionTouchesCharacterBlocks(tr, oldState.doc, tr.doc)
                            || selectionTouchesCharacterBlock(oldState, newState, tr);
                        const shouldRefreshStructure = transactionTouchesStructureBlocks(
                            tr,
                            oldState.doc,
                            tr.doc,
                        );

                        if (!tr.docChanged && !tr.selectionSet && !shouldRefreshCharacters) {
                            return pluginState;
                        }

                        const activeBlock = resolveActiveBlock(newState);
                        const nextRevision = pluginState.revision + 1;
                        let nextCharacters = pluginState.characters;
                        let nextDecorations = pluginState.characterDecorations;
                        let nextStructure = pluginState.structure;

                        if (shouldRefreshCharacters) {
                            const characterState = buildCharacterState(newState, options);

                            nextCharacters = characterState.snapshot;
                            nextDecorations = characterState.decorations;
                        }

                        if (!shouldRefreshCharacters && tr.docChanged) {
                            nextDecorations = pluginState.characterDecorations.map(tr.mapping, tr.doc);
                        }

                        if (shouldRefreshStructure) {
                            incrementStructureRuntimeRebuildCount();
                            nextStructure = buildStructureRuntime(newState.doc);
                        }

                        return {
                            revision: nextRevision,
                            activeBlockId: activeBlock.activeBlockId,
                            activeBlockType: activeBlock.activeBlockType,
                            structure: nextStructure,
                            characters: nextCharacters,
                            characterDecorations: nextDecorations ?? EMPTY_DECORATIONS,
                        };
                    },
                },
                props: {
                    decorations: state => {
                        return editorRuntimeKey.getState(state)?.characterDecorations ?? EMPTY_DECORATIONS;
                    },
                },
            }),
        ];
    },
});
