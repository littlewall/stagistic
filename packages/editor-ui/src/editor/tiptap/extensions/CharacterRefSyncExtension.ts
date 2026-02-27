import {
    extractCharacterKeys,
    normalizeCharacterKey,
} from '@stagistic/script-core';
import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';

import {
    areCharacterRefsEqual,
    type CharacterRefByKey,
    isRawCharacterRefsNormalized,
    readNormalizedRefsFromRaw,
    visitCharacterBlocks,
    writeRefsToNodeAttrs,
} from '../../characters/characterRefUtils';
import type {PersistentCharacterRef} from '../../contracts';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        characterRefSync: {
            syncCharacterRefs: () => ReturnType,
        },
    }
}

const characterRefSyncKey = new PluginKey('fountain-character-ref-sync');
const CHARACTER_REF_SYNC_META_KEY = 'character-ref-sync';

const toConfirmedCharacterIdByKey = (
    persistentCharacters: readonly PersistentCharacterRef[],
) => {
    const result = new Map<string, string>();

    persistentCharacters.forEach(character => {
        const key = normalizeCharacterKey(character.key);
        const id = typeof character.id === 'string'
            ? character.id.trim()
            : '';

        if (!key || !id || result.has(key)) {
            return;
        }

        result.set(key, id);
    });

    return result;
};

const buildNextCharacterRefs = (
    tokenKeys: string[],
    currentRefs: CharacterRefByKey,
    confirmedCharacterIdByKey: ReadonlyMap<string, string>,
) => {
    const nextRefs: CharacterRefByKey = {};

    tokenKeys.forEach(tokenKey => {
        const confirmedCharacterId = confirmedCharacterIdByKey.get(tokenKey);

        if (confirmedCharacterId) {
            nextRefs[tokenKey] = confirmedCharacterId;

            return;
        }

        const currentCharacterId = currentRefs[tokenKey];

        if (currentCharacterId) {
            nextRefs[tokenKey] = currentCharacterId;
        }
    });

    return nextRefs;
};

const shouldUpdateCharacterRefs = (
    rawRefs: unknown,
    currentRefs: CharacterRefByKey,
    nextRefs: CharacterRefByKey,
) => {
    const hasRawRefsObject = Boolean(rawRefs && typeof rawRefs === 'object');

    if (!hasRawRefsObject) {
        return Object.keys(nextRefs).length > 0;
    }

    if (Object.keys(nextRefs).length === 0) {
        return Object.keys(currentRefs).length > 0
            || Object.keys(rawRefs as Record<string, unknown>).length > 0;
    }

    if (!areCharacterRefsEqual(currentRefs, nextRefs)) {
        return true;
    }

    return !isRawCharacterRefsNormalized(rawRefs);
};

const createCharacterRefSyncTransaction = (
    state: EditorState,
    persistentCharacters: readonly PersistentCharacterRef[],
): Transaction | null => {
    const confirmedCharacterIdByKey = toConfirmedCharacterIdByKey(persistentCharacters);
    let tr: Transaction = state.tr;
    let changed = false;

    visitCharacterBlocks({
        doc: state.doc,
        onCharacterBlock: (node, pos) => {
            const text = node.textContent ?? '';
            const tokenKeys = extractCharacterKeys(text);
            const attrs = node.attrs as Record<string, unknown>;
            const rawRefs = attrs.characterRefs;
            const currentRefs = readNormalizedRefsFromRaw(rawRefs);
            const nextRefs = buildNextCharacterRefs(
                tokenKeys,
                currentRefs,
                confirmedCharacterIdByKey,
            );

            if (!shouldUpdateCharacterRefs(rawRefs, currentRefs, nextRefs)) {
                return false;
            }

            tr = tr.setNodeMarkup(pos, undefined, writeRefsToNodeAttrs(attrs, nextRefs));
            changed = true;

            return false;
        },
    });

    if (!changed) {
        return null;
    }

    return tr.setMeta(CHARACTER_REF_SYNC_META_KEY, true);
};

const createCharacterRefSyncPlugin = (
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
) => {
    return new Plugin({
        key: characterRefSyncKey,
        appendTransaction: (transactions, _oldState, newState) => {
            if (!transactions.some(transaction => transaction.docChanged)) {
                return null;
            }

            if (transactions.some(transaction => transaction.getMeta(CHARACTER_REF_SYNC_META_KEY) === true)) {
                return null;
            }

            return createCharacterRefSyncTransaction(
                newState,
                persistentCharactersRef?.current ?? [],
            );
        },
    });
};

export const CharacterRefSyncExtension = Extension.create<{
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
}>({
    name: 'CharacterRefSync',

    addOptions() {
        return {
            persistentCharactersRef: undefined,
        };
    },

    addCommands() {
        return {
            syncCharacterRefs: () => ({state, dispatch}) => {
                const transaction = createCharacterRefSyncTransaction(
                    state,
                    this.options.persistentCharactersRef?.current ?? [],
                );

                if (!transaction) {
                    return false;
                }

                if (dispatch) {
                    dispatch(transaction);
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [createCharacterRefSyncPlugin(this.options.persistentCharactersRef)];
    },
});
