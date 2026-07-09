import type {HeaderFooterSettings} from '@stagistic/script';
import {ArrowLeftIcon, ArrowRightIcon} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useId,
    useMemo,
} from 'react';

import {buildCharacterTagPaletteCss} from '../../characters/buildCharacterTagPaletteCss';
import {
    CHARACTER_HIGHLIGHT_ATTR,
    DEFAULT_CHARACTER_HIGHLIGHT,
} from '../../characters/characterHighlight';
import type {
    EditorLayoutProps,
    PersistentCharacterRef,
    PersistentCueRef,
} from '../../contracts';
import styles from '../../Editor.module.css';
import {useEditorLiveCharacters} from '../../live/hooks';
import {EditorCanvas} from '../EditorCanvas';
import EditorToolbar from '../EditorToolbar';

interface EditorShellCanvasProps {
    editor: TiptapEditor | null,
    autoFocus?: boolean,
    persistentCharacters?: readonly PersistentCharacterRef[],
    persistentCues?: readonly PersistentCueRef[],
    onCueAssigned?: (cueId: string) => void,
    characterColorSaturation?: number,
    headerFooter: HeaderFooterSettings,
    scriptTitle?: string,
    draftDate?: string,
}

interface EditorShellProps {
    canvas: EditorShellCanvasProps,
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
        persistentCues,
        onCueAssigned,
        characterColorSaturation,
        headerFooter,
        scriptTitle,
        draftDate,
    } = canvas;
    const {
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebarHeader,
        rightSidebarHeader,
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

    return (
        <div
            className={styles.root}
            data-character-tag-scope={characterTagScopeId}
            {...{[CHARACTER_HIGHLIGHT_ATTR]: DEFAULT_CHARACTER_HIGHLIGHT}}
            ref={rootRef}
            style={rootStyle}
        >
            {characterTagPaletteCss ? (
                <style data-character-tag-palette>{characterTagPaletteCss}</style>
            ) : null}
            <div className={styles.toolbarRow}>
                <div className={clsx(styles.toolbarSide, styles.toolbarSideLeft)}>
                    {leftSidebarToggle && isLeftSidebarOpen && leftSidebarHeader
                        ? leftSidebarHeader
                        : null}
                    {leftSidebarToggle && !isLeftSidebarOpen ? (
                        <button
                            className={styles.sidebarToggleButton}
                            type="button"
                            aria-label="Show left sidebar"
                            onMouseDown={onLeftSidebarToggleMouseDown}
                        >
                            <ArrowLeftIcon
                                aria-hidden="true"
                                className={clsx(
                                    styles.sidebarToggleIcon,
                                    styles.flipped,
                                )}
                            />
                        </button>
                    ) : null}
                </div>
                <div className={styles.toolbarCenter}>
                    <div className={styles.toolbarCenterInner}>
                        <EditorToolbar editor={editor} />
                    </div>
                </div>
                <div className={clsx(styles.toolbarSide, styles.toolbarSideRight)}>
                    {rightSidebarToggle && isRightSidebarOpen && rightSidebarHeader
                        ? rightSidebarHeader
                        : null}
                    {rightSidebarToggle && !isRightSidebarOpen ? (
                        <button
                            className={styles.sidebarToggleButton}
                            type="button"
                            aria-label="Show right sidebar"
                            onMouseDown={onRightSidebarToggleMouseDown}
                        >
                            <ArrowRightIcon
                                aria-hidden="true"
                                className={clsx(
                                    styles.sidebarToggleIcon,
                                    styles.flipped,
                                )}
                            />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className={styles.contentRow}>
                <aside
                    className={clsx(
                        styles.sidebarLeft,
                        isLeftSidebarOpen ? styles.sidebarOpen : styles.sidebarHidden,
                    )}
                    aria-hidden={!isLeftSidebarOpen}
                >
                    {leftSidebar}
                </aside>
                <div
                    className={styles.canvasHost}
                    ref={canvasHostRef}
                >
                    <EditorCanvas
                        editor={editor}
                        persistentCharacters={persistentCharacters}
                        persistentCues={persistentCues}
                        onCueAssigned={onCueAssigned}
                        characterColorSaturation={characterColorSaturation}
                        autoFocus={autoFocus}
                        headerFooter={headerFooter}
                        scriptTitle={scriptTitle}
                        draftDate={draftDate}
                    />
                </div>
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
        </div>
    );
};
