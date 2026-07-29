import type {ScriptDocument} from '@stagistic/script';
import {Editor as TiptapEditor, type Extensions} from '@tiptap/core';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    SCRIPT_EDITOR_DESCRIPTION_ID,
    SCRIPT_EDITOR_LABEL,
} from '../accessibility';
import {
    type CharacterColorRefsBundle,
    type EditorSurfaceCache,
} from './editorSurfaceCache';

type UseScriptEditorInstanceArgs = {
    surfaceCache?: EditorSurfaceCache,
    signature: string,
    extensions: Extensions,
    content: ScriptDocument,
    characterColorRefs: CharacterColorRefsBundle,
};

type InstanceState = {
    signature: string,
    editor: TiptapEditor,
    /** No cache owns the instance, so this mount must destroy it on unmount. */
    ownsEditor: boolean,
};

/**
 * Cache-aware replacement for tiptap's `useEditor`. With a `surfaceCache`, a
 * signature hit re-attaches the live cached instance (skipping the full
 * rebuild); a miss builds a new instance and stores it — the cache then owns
 * its lifetime. Without a cache the instance is destroyed on unmount, matching
 * the previous behavior.
 */
export const useScriptEditorInstance = ({
    surfaceCache,
    signature,
    extensions,
    content,
    characterColorRefs,
}: UseScriptEditorInstanceArgs): {editor: TiptapEditor} => {
    const createState = (): InstanceState => {
        if (surfaceCache) {
            const cached = surfaceCache.acquire(signature);

            if (cached) {
                return {
                    signature,
                    editor: cached.editor,
                    ownsEditor: false,
                };
            }
        }

        const editor = new TiptapEditor({
            extensions,
            content,
            autofocus: false,
            editorProps: {
                attributes: {
                    'aria-describedby': SCRIPT_EDITOR_DESCRIPTION_ID,
                    'aria-label': SCRIPT_EDITOR_LABEL,
                    'aria-multiline': 'true',
                    'data-editor': 'true',
                    role: 'textbox',
                },
            },
        });

        if (surfaceCache) {
            surfaceCache.store({
                signature,
                editor,
                characterColorRefs,
            });
        }

        return {
            signature,
            editor,
            ownsEditor: !surfaceCache,
        };
    };

    const [state, setState] = useState(createState);
    let currentState = state;

    if (state.signature !== signature) {
        /*
         * Inputs changed while mounted (settings / initial content): rebuild,
         * mirroring the previous useEditor deps-driven rebuild. With a cache,
         * acquire() inside createState destroys the stale entry.
         */
        if (state.ownsEditor && !state.editor.isDestroyed) {
            state.editor.destroy();
        }

        currentState = createState();
        setState(currentState);
    }

    const stateRef = useRef(currentState);

    stateRef.current = currentState;

    const pendingDestroyRef = useRef<number | null>(null);

    useEffect(() => {
        /*
         * Destruction is deferred one tick and cancelled when the effect
         * immediately re-runs — StrictMode's simulated unmount/remount must
         * not kill the instance the surviving mount keeps using.
         */
        if (pendingDestroyRef.current !== null) {
            window.clearTimeout(pendingDestroyRef.current);
            pendingDestroyRef.current = null;
        }

        return () => {
            const finalState = stateRef.current;

            if (!finalState.ownsEditor || finalState.editor.isDestroyed) {
                return;
            }

            pendingDestroyRef.current = window.setTimeout(() => {
                pendingDestroyRef.current = null;

                if (!finalState.editor.isDestroyed) {
                    finalState.editor.destroy();
                }
            }, 0);
        };
    }, []);

    return {editor: currentState.editor};
};
