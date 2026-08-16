import type {
    BlockShortcut,
    HeaderFooterSettings,
    ScriptBlockNodeType,
} from '@stagistic/script';
import {LoaderOverlay} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useEffect,
    useId,
    useMemo,
    useRef,
} from 'react';

import {buildCharacterTagPaletteCss} from '../../characters/buildCharacterTagPaletteCss';
import {
    CHARACTER_HIGHLIGHT_ATTR,
    DEFAULT_CHARACTER_HIGHLIGHT,
} from '../../characters/characterHighlight';
import type {
    EditorLayoutProps,
    EditorMusicRemoveRequest,
    PersistentCharacterRef,
    PersistentMusicRef,
} from '../../contracts';
import styles from '../../Editor.module.css';
import {useEditorLiveCharacters} from '../../live/hooks';
import {EditorCanvas} from '../EditorCanvas';
import EditorToolbar from '../EditorToolbar';
import {EditorSidebarToggleButton} from './EditorSidebarToggleButton';
import {EditorStatusBar} from './EditorStatusBar';

interface EditorShellCanvasProps {
    editor: TiptapEditor | null,
    autoFocus?: boolean,
    persistentCharacters?: readonly PersistentCharacterRef[],
    persistentMusic?: readonly PersistentMusicRef[],
    onMusicAssigned?: (musicId: string) => void,
    onOpenMusicManager?: (musicId: string) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
    characterColorSaturation?: number,
    headerFooter: HeaderFooterSettings,
    scriptTitle?: string,
    draftDate?: string,
    blockShortcuts?: Partial<Record<ScriptBlockNodeType, BlockShortcut>>,
    blockNextElements?: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>>,
}

interface EditorShellProps {
    canvas: EditorShellCanvasProps,
    /**
     * Keeps the opaque loader above the live canvas until the first paginated
     * layout exists, so text, headers, and footers appear together. The canvas
     * remains measurable and focusable behind it.
     */
    isCanvasReady?: boolean,
    layout?: EditorLayoutProps,
    rootRef: RefObject<HTMLDivElement | null>,
    canvasHostRef: RefObject<HTMLDivElement | null>,
    rootStyle: CSSProperties,
    confirmedCharacterColorsById?: ReadonlyMap<string, string>,
    onLeftSidebarToggleMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onRightSidebarToggleMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
}

export const EditorShell = ({
    canvas,
    isCanvasReady = true,
    layout,
    rootRef,
    canvasHostRef,
    rootStyle,
    confirmedCharacterColorsById,
    onLeftSidebarToggleMouseDown,
    onRightSidebarToggleMouseDown,
}: EditorShellProps) => {
    const {
        editor,
        autoFocus,
        persistentCharacters,
        persistentMusic,
        onMusicAssigned,
        onOpenMusicManager,
        onRequestRemoveMusic,
        characterColorSaturation,
        headerFooter,
        scriptTitle,
        draftDate,
        blockShortcuts,
        blockNextElements,
    } = canvas;
    const {
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebar,
        rightSidebar,
    } = layout ?? {};
    const rawCharacterTagScopeId = useId();
    const characterTagScopeId = useMemo(() => {
        const normalized = rawCharacterTagScopeId.replace(/[^a-zA-Z0-9_-]/g, '');

        return normalized.length > 0 ? normalized : 'editor';
    }, [rawCharacterTagScopeId]);
    const liveCharacters = useEditorLiveCharacters();
    const characterTagPaletteCss = useMemo(() => {
        return buildCharacterTagPaletteCss({
            colorByCharacterId: confirmedCharacterColorsById,
            displayColorByKey: liveCharacters.displayColorByKey,
            scopeAttributeValue: characterTagScopeId,
        });
    }, [
        characterTagScopeId,
        confirmedCharacterColorsById,
        liveCharacters.displayColorByKey,
    ]);
    const isLeftSidebarOpen = leftSidebarToggle?.isOpen ?? false;
    const isRightSidebarOpen = rightSidebarToggle?.isOpen ?? false;
    const isAnySidebarOpen = isLeftSidebarOpen || isRightSidebarOpen;
    const sidebarTogglesRef = useRef({leftSidebarToggle, rightSidebarToggle});

    sidebarTogglesRef.current = {leftSidebarToggle, rightSidebarToggle};

    useEffect(() => {
        const editorElement = editor?.view.dom;

        if (!editorElement) {
            return;
        }

        const handleBeforeInput = () => {
            if (!window.matchMedia('(max-width: 1199px)').matches) {
                return;
            }

            const {leftSidebarToggle: leftToggle, rightSidebarToggle: rightToggle} = sidebarTogglesRef.current;

            if (leftToggle?.isOpen) {
                leftToggle.onToggle();
            }

            if (rightToggle?.isOpen) {
                rightToggle.onToggle();
            }
        };

        editorElement.addEventListener('beforeinput', handleBeforeInput);

        return () => editorElement.removeEventListener('beforeinput', handleBeforeInput);
    }, [editor]);

    const handleScrimMouseDown = () => {
        if (leftSidebarToggle?.isOpen) {
            leftSidebarToggle.onToggle();
        }

        if (rightSidebarToggle?.isOpen) {
            rightSidebarToggle.onToggle();
        }
    };

    return (
        <div
            className={styles.root}
            data-character-tag-scope={characterTagScopeId}
            data-editor-ready={isCanvasReady ? 'true' : 'false'}
            {...{[CHARACTER_HIGHLIGHT_ATTR]: DEFAULT_CHARACTER_HIGHLIGHT}}
            aria-busy={!isCanvasReady}
            ref={rootRef}
            style={rootStyle}
        >
            {!isCanvasReady ? (
                <LoaderOverlay
                    label="Preparing editor"
                    messages={['Laying out pages']}
                />
            ) : null}
            {characterTagPaletteCss ? (
                <style data-character-tag-palette>{characterTagPaletteCss}</style>
            ) : null}
            <div className={styles.shellBody}>
                <button
                    className={clsx(
                        styles.sidebarScrim,
                        isAnySidebarOpen && styles.sidebarScrimVisible,
                    )}
                    type="button"
                    aria-label="Close panels"
                    tabIndex={isAnySidebarOpen ? 0 : -1}
                    onMouseDown={handleScrimMouseDown}
                />
                <aside
                    className={clsx(
                        styles.sidebarLeft,
                        isLeftSidebarOpen ? styles.sidebarOpen : styles.sidebarHidden,
                    )}
                    aria-hidden={!isLeftSidebarOpen}
                >
                    {leftSidebar}
                </aside>
                <main className={styles.editorMain}>
                    <div className={styles.toolbarRow}>
                        {leftSidebarToggle ? (
                            <EditorSidebarToggleButton
                                side="left"
                                label={leftSidebarToggle.label}
                                isOpen={isLeftSidebarOpen}
                                className={styles.toolbarToggleStart}
                                onMouseDown={onLeftSidebarToggleMouseDown}
                            />
                        ) : null}
                        <div className={styles.toolbarCenterInner}>
                            <EditorToolbar
                                editor={editor}
                                blockShortcuts={blockShortcuts}
                            />
                        </div>
                        {rightSidebarToggle ? (
                            <EditorSidebarToggleButton
                                side="right"
                                label={rightSidebarToggle.label}
                                isOpen={isRightSidebarOpen}
                                className={styles.toolbarToggleEnd}
                                onMouseDown={onRightSidebarToggleMouseDown}
                            />
                        ) : null}
                    </div>
                    <div
                        className={styles.canvasHost}
                        data-editor-canvas-host="true"
                        ref={canvasHostRef}
                    >
                        <EditorCanvas
                            editor={editor}
                            persistentCharacters={persistentCharacters}
                            persistentMusic={persistentMusic}
                            onMusicAssigned={onMusicAssigned}
                            onOpenMusicManager={onOpenMusicManager}
                            onRequestRemoveMusic={onRequestRemoveMusic}
                            characterColorSaturation={characterColorSaturation}
                            autoFocus={autoFocus}
                            headerFooter={headerFooter}
                            scriptTitle={scriptTitle}
                            draftDate={draftDate}
                            blockShortcuts={blockShortcuts}
                        />
                    </div>
                </main>
                <aside
                    className={clsx(
                        styles.sidebarRight,
                        isRightSidebarOpen ? styles.sidebarOpen : styles.sidebarHidden,
                    )}
                    aria-hidden={!isRightSidebarOpen}
                >
                    {rightSidebar}
                </aside>
            </div>
            <EditorStatusBar
                editor={editor}
                blockNextElements={blockNextElements ?? {}}
            />
        </div>
    );
};
