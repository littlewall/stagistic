import type {ScriptDocument} from '@stagistic/script';
import {Editor as TiptapEditor, type Extensions} from '@tiptap/core';
import {
    useCallback,
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
    providedEditor?: TiptapEditor,
    signature: string,
    extensions: Extensions,
    content: ScriptDocument,
    characterColorRefs: CharacterColorRefsBundle,
    isReadOnly?: boolean,
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
    providedEditor,
    signature,
    extensions,
    content,
    characterColorRefs,
    isReadOnly = false,
}: UseScriptEditorInstanceArgs): {editor: TiptapEditor} => {
    const createState = useCallback((): InstanceState => {
        if (providedEditor) {
            return {
                signature,
                editor: providedEditor,
                ownsEditor: false,
            };
        }

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
            editable: !isReadOnly,
            editorProps: {
                attributes: {
                    'aria-describedby': SCRIPT_EDITOR_DESCRIPTION_ID,
                    'aria-label': SCRIPT_EDITOR_LABEL,
                    'aria-multiline': 'true',
                    'data-editor': 'true',
                    lang: '',
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
    }, [
        characterColorRefs,
        content,
        extensions,
        isReadOnly,
        providedEditor,
        signature,
        surfaceCache,
    ]);

    const [state, setState] = useState(createState);

    useEffect(() => {
        if (state.signature === signature && (!providedEditor || state.editor === providedEditor)) {
            return;
        }

        /*
         * Node-view teardown updates React portals and can call flushSync.
         * Rebuild in a task after the commit, outside render and effects.
         * Cancel superseded tasks so rapid settings changes use the latest inputs.
         */
        const rebuild = window.setTimeout(() => {
            if (state.ownsEditor && !state.editor.isDestroyed) {
                state.editor.destroy();
            }

            setState(createState());
        }, 0);

        return () => window.clearTimeout(rebuild);
    }, [
        createState,
        providedEditor,
        signature,
        state,
    ]);

    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

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

    return {editor: state.editor};
};
