import type {Editor as TiptapEditor} from '@tiptap/core';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    createCharacterColorRefsBundle,
    createEditorSurfaceCache,
    type EditorSurfaceEntry,
} from './editorSurfaceCache';

const createStubEntry = (signature: string): {entry: EditorSurfaceEntry, destroy: ReturnType<typeof vi.fn>} => {
    const destroy = vi.fn();
    const entry: EditorSurfaceEntry = {
        signature,
        editor: {destroy, isDestroyed: false} as unknown as TiptapEditor,
        characterColorRefs: createCharacterColorRefsBundle(),
    };

    return {entry, destroy};
};

describe('createEditorSurfaceCache', () => {
    it('returns null when empty', () => {
        const cache = createEditorSurfaceCache();

        expect(cache.acquire('sig-a')).toBeNull();
    });

    it('returns the stored entry for a matching signature', () => {
        const cache = createEditorSurfaceCache();
        const {entry} = createStubEntry('sig-a');

        cache.store(entry);

        expect(cache.acquire('sig-a')).toBe(entry);
    });

    it('destroys and clears a stale entry on signature mismatch', () => {
        const cache = createEditorSurfaceCache();
        const {entry, destroy} = createStubEntry('sig-a');

        cache.store(entry);

        expect(cache.acquire('sig-b')).toBeNull();
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(cache.acquire('sig-a')).toBeNull();
    });

    it('destroys the previous editor when storing a different one', () => {
        const cache = createEditorSurfaceCache();
        const first = createStubEntry('sig-a');
        const second = createStubEntry('sig-b');

        cache.store(first.entry);
        cache.store(second.entry);

        expect(first.destroy).toHaveBeenCalledTimes(1);
        expect(cache.acquire('sig-b')).toBe(second.entry);
    });

    it('does not destroy when re-storing the same editor', () => {
        const cache = createEditorSurfaceCache();
        const {entry, destroy} = createStubEntry('sig-a');

        cache.store(entry);
        cache.store(entry);

        expect(destroy).not.toHaveBeenCalled();
    });

    it('destroy() destroys and clears the entry', () => {
        const cache = createEditorSurfaceCache();
        const {entry, destroy} = createStubEntry('sig-a');

        cache.store(entry);
        cache.destroy();

        expect(destroy).toHaveBeenCalledTimes(1);
        expect(cache.acquire('sig-a')).toBeNull();
    });
});

describe('createCharacterColorRefsBundle', () => {
    it('creates empty mutable containers', () => {
        const bundle = createCharacterColorRefsBundle();

        expect(bundle.colorByCharacterIdRef.current.size).toBe(0);
        expect(bundle.rememberedColorByKeyRef.current.size).toBe(0);
        expect(bundle.rememberedColorSaturationRef.current).toBeNull();
        expect(bundle.persistentCharactersRef.current).toEqual([]);
    });
});
