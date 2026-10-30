import {buildScriptSummaryMetadata, coerceUnknownBlocksToStageDirections} from '@stagistic/script';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    EditorDocumentProps,
    EditorLifecycleCallbacks,
    EditorSaveProps,
    EditorSettingsProps,
    PersistentMusicRef,
} from '../contracts';
import {resolveEditorSettings, stripScriptSettings} from '../editorSettings';
import {sanitizeScriptBlocks} from '../hooks/editorLifecycleSync';
import {getMeasuredEditorPageCount} from '../hooks/editorSaveSnapshot';
import {useCommentCallbacksRef} from '../hooks/useCommentCallbacksRef';
import {useEditorCharacterColors} from '../hooks/useEditorCharacterColors';
import {useEditorCharacterSync} from '../hooks/useEditorCharacterSync';
import {createCharacterColorRefsBundle} from '../surface/editorSurfaceCache';
import {useScriptEditorInstance} from '../surface/useScriptEditorInstance';
import {SCENE_NUMBER_FORMAT_CHANGED} from '../tiptap/extensions/SceneNumberingExtension';
import {useEditorExtensions} from '../useEditorExtensions';
import type {ScriptDocumentSession} from './createScriptDocumentSession';

const EMPTY_MUSIC: readonly PersistentMusicRef[] = [];

/** Keeps the document and editor history alive without mounting the editor canvas. */
export const ScriptDocumentRuntime = ({
    session,
    document,
    settings,
    save,
    isReadOnly = false,
}: {
    session: ScriptDocumentSession,
    document: EditorDocumentProps,
    settings?: EditorSettingsProps,
    save?: EditorSaveProps,
    isReadOnly?: boolean,
}) => {
    const initialValue = useMemo(() => coerceUnknownBlocksToStageDirections(document.initialValue).value, [document.initialValue]);
    const resolvedSettings = useMemo(
        () => resolveEditorSettings(settings?.settings, settings?.scriptSettings ?? initialValue.attrs?.settings),
        [
            settings?.settings,
            settings?.scriptSettings,
            initialValue.attrs?.settings,
        ],
    );
    const [refs] = useState(createCharacterColorRefsBundle);
    const runtimeSettingsRef = useRef(resolvedSettings);
    const persistentMusicRef = useRef(document.persistentMusic ?? EMPTY_MUSIC);
    const saveRef = useRef(save);
    const settingsRef = useRef(settings?.scriptSettings);

    useEffect(() => {
        persistentMusicRef.current = document.persistentMusic ?? EMPTY_MUSIC;
    }, [document.persistentMusic]);
    useEffect(() => {
        saveRef.current = save;
    }, [save]);
    useEffect(() => {
        settingsRef.current = settings?.scriptSettings;
    }, [settings?.scriptSettings]);
    useEditorCharacterColors({
        persistentCharacters: document.persistentCharacters ?? [],
        resolvedInitialValue: initialValue,
        refs,
        liveStore: session.liveStore,
    });

    const proxy = useMemo<EditorLifecycleCallbacks>(() => ({
        onRequestCreateMusic: request => session.getCallbacks().onRequestCreateMusic?.(request),
        onRequestRemoveMusic: request => session.getCallbacks().onRequestRemoveMusic?.(request),
        onOpenMusicManager: id => session.getCallbacks().onOpenMusicManager?.(id),
        onMusicAssigned: id => session.getCallbacks().onMusicAssigned?.(id),
        onMusicUnassigned: id => session.getCallbacks().onMusicUnassigned?.(id),
        onRequestDeleteScene: id => session.getCallbacks().onRequestDeleteScene?.(id),
        onRequestConvertScene: (id, type) => session.getCallbacks().onRequestConvertScene?.(id, type),
    }), [session]);
    const commentCallbacksRef = useCommentCallbacksRef({
        onRequestReveal: () => session.getCallbacks().onRequestRevealComments?.(),
        isPanelOpen: () => session.getCallbacks().isCommentsPanelOpen?.() ?? false,
        onAnchorClick: ids => session.getCallbacks().onCommentAnchorClick?.(ids),
        onBlocksMerged: merges => session.getCallbacks().onCommentBlocksMerged?.(merges),
    });
    const extensions = useEditorExtensions({
        resolvedSettings,
        runtimeSettingsRef,
        editorZoom: 1,
        ...refs,
        persistentMusicRef,
        ...proxy,
        commentCallbacksRef,
        enableBlockUiEvents: true,
        isReadOnly,
    });
    const {editor} = useScriptEditorInstance({
        signature: 'document-session',
        extensions,
        content: initialValue,
        characterColorRefs: refs,
        isReadOnly,
    });

    useEditorCharacterSync(editor, document.persistentCharacters ?? []);
    useEffect(() => {
        runtimeSettingsRef.current = resolvedSettings;
        editor.view.dispatch(editor.state.tr.setMeta(SCENE_NUMBER_FORMAT_CHANGED, true).setMeta('addToHistory', false));
    }, [editor, resolvedSettings]);
    useEffect(() => {
        sanitizeScriptBlocks(editor);
        session.attach(editor, {
            onAutoSave: async value => {
                const handler = saveRef.current?.onAutoSave;

                if (!handler) return false;

                const currentValue = editor.isDestroyed ? null : stripScriptSettings(editor.getJSON() as typeof value);
                const pageCount = currentValue && JSON.stringify(currentValue) === JSON.stringify(value) ? getMeasuredEditorPageCount(editor) : null;

                return await handler(value, buildScriptSummaryMetadata(value, pageCount), settingsRef.current ?? null) !== false;
            },
        });

        const flushOnPageHide = () => {
            void session.flush();
        };
        const flushOnVisibilityChange = () => {
            if (window.document.visibilityState === 'hidden') flushOnPageHide();
        };

        window.addEventListener('pagehide', flushOnPageHide);
        window.document.addEventListener('visibilitychange', flushOnVisibilityChange);

        return () => {
            window.removeEventListener('pagehide', flushOnPageHide);
            window.document.removeEventListener('visibilitychange', flushOnVisibilityChange);
            session.detach(editor);
        };
    }, [editor, session]);

    return null;
};
