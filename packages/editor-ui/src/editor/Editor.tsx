import {
    normalizeScriptDocumentNodeMode,
    type ScriptDocument,
} from '@stagistic/script-core';
import {useEditor} from '@tiptap/react';
import {
    Children,
    isValidElement,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {buildEditorRootStyle} from './buildRootStyle';
import {
    getConfirmedCharacterColor,
    normalizePersistentCharacterRefs,
} from './characters/colorResolver';
import {EditorShell} from './components/editorShell/EditorShell';
import {EditorInstanceProvider} from './context';
import {
    getEditorCssVars,
    resolveEditorSettings,
    stripScriptSettings,
} from './editorSettings';
import {
    serializeDocumentForSave,
    useAutosaveController,
} from './hooks/useAutosaveController';
import {useEditorLifecycle} from './hooks/useEditorLifecycle';
import {usePaginationSettings} from './hooks/usePaginationSettings';
import {useResponsiveScale} from './hooks/useResponsiveScale';
import {EditorSnapshotStoreProvider} from './live/context';
import {createEditorSnapshotStore} from './live/store';
import type {
    EditorProps,
    PersistentCharacterRef,
} from './types';
import {useEditorExtensions} from './useEditorExtensions';

const getSizeScale = () => {
    if (typeof window === 'undefined') {
        return 1;
    }

    const raw = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue('--size-scale');
    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

// ─── Slot infrastructure ────────────────────────────────────────────────────

const LEFT_SIDEBAR_SLOT = Symbol('EditorLeftSidebar');
const RIGHT_SIDEBAR_SLOT = Symbol('EditorRightSidebar');

type SlotType = {_slotId: symbol};

const makeSlot = (slotId: symbol) => {
    const SlotComponent = ({children}: {children?: ReactNode}) => {
        void children;

        return null;
    };

    (SlotComponent as unknown as SlotType)._slotId = slotId;

    return SlotComponent;
};

const extractSidebarSlots = (children: ReactNode) => {
    let left: ReactNode = undefined;
    let right: ReactNode = undefined;

    Children.forEach(children, child => {
        if (!isValidElement(child)) {
            return;
        }

        const slotId = (child.type as unknown as Partial<SlotType>)._slotId;

        if (slotId === LEFT_SIDEBAR_SLOT) {
            left = (child.props as {children?: ReactNode}).children;

            return;
        }

        if (slotId === RIGHT_SIDEBAR_SLOT) {
            right = (child.props as {children?: ReactNode}).children;
        }
    });

    return {left, right};
};

// ─── Component ───────────────────────────────────────────────────────────────

const Editor = ({
    document,
    settings: settingsProps,
    save,
    layout,
    requests,
    callbacks,
    children,
}: EditorProps & {children?: ReactNode}) => {
    const {
        initialValue,
        nodeMode = 'default',
        persistentCharacters = [],
        annotations,
        viewFilter,
    } = document;
    const {
        settings,
        scriptSettings,
    } = settingsProps ?? {};
    const {
        onAutoSave,
        onManualSave,
        onDirtyChange,
        autoSaveDelayMs,
    } = save ?? {};
    const {
        autoFocus,
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebar: layoutLeftSidebar,
        rightSidebar: layoutRightSidebar,
        sidebarWidth,
    } = layout ?? {};

    // Children slots take precedence over layout prop sidebars
    const {left: slotLeft, right: slotRight} = extractSidebarSlots(children);
    const leftSidebar = slotLeft ?? layoutLeftSidebar;
    const rightSidebar = slotRight ?? layoutRightSidebar;
    const {
        onValueChange,
        onIndexChange,
        onActiveBlockChange,
        onBlockUiEvent,
    } = callbacks ?? {};
    const resolvedInitialValue = useMemo(
        () => normalizeScriptDocumentNodeMode(initialValue, nodeMode),
        [initialValue, nodeMode],
    );
    const initialSerialized = useMemo(
        () => serializeDocumentForSave(resolvedInitialValue),
        [resolvedInitialValue],
    );
    const sizeScale = useMemo(() => getSizeScale(), []);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const colorByCharacterIdRef = useRef<ReadonlyMap<string, string>>(new Map());
    const rememberedColorByKeyRef = useRef<ReadonlyMap<string, string>>(new Map());
    const rememberedColorSaturationRef = useRef<number | null>(null);
    const persistentCharactersRef = useRef<readonly PersistentCharacterRef[]>([]);
    const liveStore = useMemo(() => createEditorSnapshotStore(), []);

    const resolvedSettings = useMemo(() => {
        const effectiveScriptSettings = scriptSettings ?? resolvedInitialValue.attrs?.settings;

        return resolveEditorSettings(settings, effectiveScriptSettings);
    }, [
        resolvedInitialValue.attrs?.settings,
        scriptSettings,
        settings,
    ]);
    const isLeftSidebarOpen = leftSidebarToggle?.isOpen ?? false;
    const isRightSidebarOpen = rightSidebarToggle?.isOpen ?? false;
    const responsiveScale = useResponsiveScale({
        rootRef,
        canvasHostRef,
        pageWidthPx: resolvedSettings.page.widthPx,
        sizeScale,
        isLeftSidebarOpen,
        isRightSidebarOpen,
    });
    const renderScale = useMemo(() => sizeScale * responsiveScale, [responsiveScale, sizeScale]);
    const editorStyle = useMemo(
        () => getEditorCssVars(resolvedSettings, renderScale),
        [renderScale, resolvedSettings],
    );

    useEffect(() => {
        const normalizedPersistentCharacters = normalizePersistentCharacterRefs(persistentCharacters);
        const nextColorByCharacterId = new Map(colorByCharacterIdRef.current);
        const didSaturationChange = rememberedColorSaturationRef.current !== null
            && rememberedColorSaturationRef.current !== resolvedSettings.visual.characterColorSaturation;
        const nextRememberedColorByKey = didSaturationChange
            ? new Map<string, string>()
            : new Map(rememberedColorByKeyRef.current);

        normalizedPersistentCharacters.forEach(character => {
            const resolvedColor = getConfirmedCharacterColor(
                character.id,
                character.colorHex,
                resolvedSettings.visual.characterColorSaturation,
            );

            nextColorByCharacterId.set(character.id, resolvedColor);
            nextRememberedColorByKey.set(character.key, resolvedColor);
        });

        persistentCharactersRef.current = normalizedPersistentCharacters;
        colorByCharacterIdRef.current = nextColorByCharacterId;
        rememberedColorByKeyRef.current = nextRememberedColorByKey;
        rememberedColorSaturationRef.current = resolvedSettings.visual.characterColorSaturation;
    }, [persistentCharacters, resolvedSettings.visual.characterColorSaturation]);

    const extensions = useEditorExtensions({
        resolvedSettings,
        sizeScale,
        colorByCharacterIdRef,
        rememberedColorByKeyRef,
        persistentCharactersRef,
        annotations,
        visibleLayerIds: viewFilter?.visibleLayerIds,
        visibleBlockTypes: viewFilter?.visibleBlockTypes,
    });
    const initialContentSignature = useMemo(
        () => JSON.stringify(stripScriptSettings(resolvedInitialValue)),
        [resolvedInitialValue],
    );

    const initialDoc = useMemo<ScriptDocument>(
        () => resolvedInitialValue,
        [initialContentSignature, resolvedInitialValue],
    );
    const editor = useEditor({
        extensions,
        content: initialDoc,
        autofocus: autoFocus ? 'start' : false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                'data-fountain-editor': 'true',
            },
        },
    }, [extensions, initialDoc]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const commands = editor.commands as {
            refreshCharacterTagDecorations?: () => boolean,
        };

        commands.refreshCharacterTagDecorations?.();
    }, [
        editor,
        persistentCharacters,
        resolvedSettings.visual.characterColorSaturation,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const syncCommands = editor.commands as {
            syncCharacterRefs?: () => boolean,
        };

        syncCommands.syncCharacterRefs?.();
    }, [editor, persistentCharacters]);

    const resolveLatestValue = useCallback(() => {
        if (!editor) {
            return null;
        }

        const paginationCommands = editor.commands as {
            forcePaginationRecalc?: () => boolean,
        };

        paginationCommands.forcePaginationRecalc?.();

        return stripScriptSettings(editor.getJSON() as ScriptDocument);
    }, [editor]);
    const {
        scheduleAutosave,
        handleManualSave,
        setLatestValue,
        syncInitialValue,
    } = useAutosaveController({
        onAutoSave,
        onManualSave,
        onDirtyChange,
        autoSaveDelayMs,
        resolveLatestValue,
    });
    const rootStyle = useMemo(() => buildEditorRootStyle({
        persistentCharacters,
        editorStyle,
        sidebarWidth,
        isLeftSidebarOpen,
        isRightSidebarOpen,
    }), [
        editorStyle,
        isLeftSidebarOpen,
        isRightSidebarOpen,
        persistentCharacters,
        sidebarWidth,
    ]);

    usePaginationSettings({
        editor,
        resolvedSettings,
        renderScale,
    });

    useEditorLifecycle({
        editor: {
            instance: editor,
            autoFocus,
        },
        liveStore,
        document: {
            initialValue: resolvedInitialValue,
            initialSerialized,
            setLatestValue,
            syncInitialValue,
            scheduleAutosave,
        },
        save: {
            onManualSave,
            handleManualSave,
        },
        callbacks: {
            onValueChange,
            onIndexChange,
            onActiveBlockChange,
            onBlockUiEvent,
        },
        characters: {
            persistentCharactersRef,
            colorByCharacterIdRef,
            rememberedColorByKeyRef,
            characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
        },
        requests,
    });

    const handleLeftSidebarToggle = leftSidebarToggle?.onToggle;
    const handleRightSidebarToggle = rightSidebarToggle?.onToggle;

    const handleLeftSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        handleLeftSidebarToggle?.();
    }, [handleLeftSidebarToggle]);

    const handleRightSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        handleRightSidebarToggle?.();
    }, [handleRightSidebarToggle]);

    const resolvedLayout = useMemo(() => ({
        ...layout,
        leftSidebar,
        rightSidebar,
    }), [
        layout,
        leftSidebar,
        rightSidebar,
    ]);

    return (
        <EditorSnapshotStoreProvider store={liveStore}>
            <EditorInstanceProvider editor={editor}>
                <EditorShell
                    canvas={{
                        autoFocus,
                        characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
                        editor,
                        persistentCharacters,
                    }}
                    layout={resolvedLayout}
                    rootRef={rootRef}
                    canvasHostRef={canvasHostRef}
                    rootStyle={rootStyle}
                    onLeftSidebarToggleMouseDown={handleLeftSidebarToggleMouseDown}
                    onRightSidebarToggleMouseDown={handleRightSidebarToggleMouseDown}
                />
            </EditorInstanceProvider>
        </EditorSnapshotStoreProvider>
    );
};

/**
 * Compound-component slots.
 * Render sidebars as children of FountainEditor so they execute inside
 * EditorSnapshotStoreProvider + EditorInstanceProvider and can call
 * useEditorLiveStructure(), useEditorLiveCharacters(), useEditorInstance(), etc.
 *
 * Usage:
 * ```tsx
 * <FountainEditor ...>
 *   <FountainEditor.LeftSidebar>
 *     <MyStructureSidebar />
 *   </FountainEditor.LeftSidebar>
 *   <FountainEditor.RightSidebar>
 *     <MyCharactersSidebar />
 *   </FountainEditor.RightSidebar>
 * </FountainEditor>
 * ```
 */
Editor.LeftSidebar = makeSlot(LEFT_SIDEBAR_SLOT);
Editor.RightSidebar = makeSlot(RIGHT_SIDEBAR_SLOT);

export default Editor;
