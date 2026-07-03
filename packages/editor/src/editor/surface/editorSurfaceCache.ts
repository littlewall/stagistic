import type {Editor as TiptapEditor} from '@tiptap/core';

import type {PersistentCharacterRef} from '../contracts';

export type MutableRefLike<T> = {current: T};

/**
 * Mutable containers captured by editor extensions via closure. They must
 * survive together with the editor instance, so cached surfaces carry them.
 */
export type CharacterColorRefsBundle = {
    colorByCharacterIdRef: MutableRefLike<ReadonlyMap<string, string>>,
    rememberedColorByKeyRef: MutableRefLike<ReadonlyMap<string, string>>,
    rememberedColorSaturationRef: MutableRefLike<number | null>,
    persistentCharactersRef: MutableRefLike<readonly PersistentCharacterRef[]>,
};

export const createCharacterColorRefsBundle = (): CharacterColorRefsBundle => ({
    colorByCharacterIdRef: {current: new Map()},
    rememberedColorByKeyRef: {current: new Map()},
    rememberedColorSaturationRef: {current: null},
    persistentCharactersRef: {current: []},
});

export type EditorSurfaceEntry = {
    signature: string,
    editor: TiptapEditor,
    characterColorRefs: CharacterColorRefsBundle,
};

/**
 * Keeps one live editor surface alive across view switches inside a script
 * workspace. Re-attaching the surviving instance skips the full rebuild
 * (instance construction + pagination measuring) and preserves unsaved state.
 */
export type EditorSurfaceCache = {
    /** Returns the cached entry when its signature matches; destroys and clears a stale entry otherwise. */
    acquire: (signature: string) => EditorSurfaceEntry | null,
    /** Stores the entry, destroying any previously cached different editor. */
    store: (entry: EditorSurfaceEntry) => void,
    /** Destroys and clears the cached editor. */
    destroy: () => void,
};

export const createEditorSurfaceCache = (): EditorSurfaceCache => {
    let entry: EditorSurfaceEntry | null = null;

    const destroyEntry = () => {
        if (!entry) {
            return;
        }

        if (!entry.editor.isDestroyed) {
            entry.editor.destroy();
        }

        entry = null;
    };

    return {
        acquire: signature => {
            if (entry && entry.signature === signature) {
                return entry;
            }

            destroyEntry();

            return null;
        },
        store: next => {
            if (entry && entry.editor !== next.editor) {
                destroyEntry();
            }

            entry = next;
        },
        destroy: destroyEntry,
    };
};
