import {type Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';
import {DecorationSet} from '@tiptap/pm/view';

import type {PersistentCharacterRef} from '../../contracts';
import {
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../fountainCore';
import {buildDecorations} from './characterTags/buildDecorations';
import {cleanupCharacterDelimiters} from './characterTags/cleanup';
import {isCharacterBlockType} from './characterTags/types';

const characterTagDecorationsKey = new PluginKey<DecorationSet>('fountain-character-tag-decorations');

export const CHARACTER_TAG_DECORATIONS_REFRESH_META_KEY = 'fountain-character-tag-decorations-refresh';

export const createCharacterTagDecorationsRefreshTransaction = (state: EditorState) => {
    return state.tr.setMeta(CHARACTER_TAG_DECORATIONS_REFRESH_META_KEY, true);
};

const hasCharacterBlocksInRange = (
    doc: ProseMirrorNode,
    from: number,
    to: number,
) => {
    const maxPos = doc.content.size;
    const clampedFrom = Math.max(0, Math.min(from, maxPos));
    const clampedTo = Math.max(0, Math.min(to, maxPos));
    let safeFrom = Math.min(clampedFrom, clampedTo);
    let safeTo = Math.max(clampedFrom, clampedTo);

    if (safeFrom === safeTo && safeTo < maxPos) {
        safeTo += 1;
    }

    if (safeFrom === safeTo && safeFrom > 0) {
        safeFrom -= 1;
    }

    if (safeFrom === safeTo) {
        return false;
    }

    let hasCharacterBlocks = false;

    doc.nodesBetween(safeFrom, safeTo, node => {
        if (!isFountainBlockNodeName(node.type.name)) {
            return true;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (isCharacterBlockType(blockType)) {
            hasCharacterBlocks = true;

            return false;
        }

        return false;
    });

    return hasCharacterBlocks;
};

const transactionTouchesCharacterBlocks = (
    tr: Transaction,
    oldDoc: ProseMirrorNode,
    newDoc: ProseMirrorNode,
) => {
    if (!tr.docChanged) {
        return false;
    }

    let touchesCharacterBlocks = false;

    tr.mapping.maps.forEach(stepMap => {
        if (touchesCharacterBlocks) {
            return;
        }

        stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
            if (touchesCharacterBlocks) {
                return;
            }

            const oldFrom = Math.max(0, oldStart - 1);
            const oldTo = Math.max(oldEnd + 1, oldFrom + 1);
            const newFrom = Math.max(0, newStart - 1);
            const newTo = Math.max(newEnd + 1, newFrom + 1);

            if (hasCharacterBlocksInRange(oldDoc, oldFrom, oldTo)) {
                touchesCharacterBlocks = true;

                return;
            }

            if (hasCharacterBlocksInRange(newDoc, newFrom, newTo)) {
                touchesCharacterBlocks = true;
            }
        });
    });

    return touchesCharacterBlocks;
};

export const createCharacterTagDecorationsPlugin = (
    characterColorSaturation?: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
) => new Plugin({
    key: characterTagDecorationsKey,
    state: {
        init: (_config, state) => buildDecorations({
            doc: state.doc,
            characterColorSaturation,
            colorByCharacterId: colorByCharacterIdRef?.current,
            rememberedColorByKey: rememberedColorByKeyRef?.current,
            persistentCharacters: persistentCharactersRef?.current,
            selectionFrom: state.selection.from,
        }),
        apply: (tr, pluginState, oldState) => {
            const shouldRefresh = tr.getMeta(CHARACTER_TAG_DECORATIONS_REFRESH_META_KEY) === true;

            if (!tr.docChanged) {
                if (!shouldRefresh) {
                    return pluginState;
                }

                return buildDecorations({
                    doc: tr.doc,
                    characterColorSaturation,
                    colorByCharacterId: colorByCharacterIdRef?.current,
                    rememberedColorByKey: rememberedColorByKeyRef?.current,
                    persistentCharacters: persistentCharactersRef?.current,
                    selectionFrom: tr.selection.from,
                });
            }

            if (shouldRefresh) {
                return buildDecorations({
                    doc: tr.doc,
                    characterColorSaturation,
                    colorByCharacterId: colorByCharacterIdRef?.current,
                    rememberedColorByKey: rememberedColorByKeyRef?.current,
                    persistentCharacters: persistentCharactersRef?.current,
                    selectionFrom: tr.selection.from,
                });
            }

            const mappedDecorations = pluginState.map(tr.mapping, tr.doc);

            if (!transactionTouchesCharacterBlocks(tr, oldState.doc, tr.doc)) {
                return mappedDecorations;
            }

            return buildDecorations({
                doc: tr.doc,
                characterColorSaturation,
                colorByCharacterId: colorByCharacterIdRef?.current,
                rememberedColorByKey: rememberedColorByKeyRef?.current,
                persistentCharacters: persistentCharactersRef?.current,
                selectionFrom: tr.selection.from,
            });
        },
    },
    appendTransaction: (transactions, oldState, newState) => cleanupCharacterDelimiters(transactions, oldState, newState),
    props: {
        decorations: state => characterTagDecorationsKey.getState(state) ?? DecorationSet.empty,
    },
});
