import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    NavArrowLeft,
    NavArrowRight,
} from 'iconoir-react';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
} from 'react';

import styles from '../../Editor.module.css';
import type {
    EditorLayoutProps,
    PersistentCharacterRef,
} from '../../types';
import {EditorCanvas} from '../EditorCanvas';
import EditorToolbar from '../EditorToolbar';

interface EditorShellCanvasProps {
    editor: TiptapEditor | null,
    autoFocus?: boolean,
    persistentCharacters?: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
}

interface EditorShellProps {
    canvas: EditorShellCanvasProps,
    layout?: EditorLayoutProps,
    rootRef: RefObject<HTMLDivElement | null>,
    canvasHostRef: RefObject<HTMLDivElement | null>,
    rootStyle: CSSProperties,
    onLeftSidebarToggleMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onRightSidebarToggleMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
}

export const EditorShell = ({
    canvas,
    layout,
    rootRef,
    canvasHostRef,
    rootStyle,
    onLeftSidebarToggleMouseDown,
    onRightSidebarToggleMouseDown,
}: EditorShellProps) => {
    const {
        editor,
        autoFocus,
        persistentCharacters,
        characterColorSaturation,
    } = canvas;
    const {
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebar,
        rightSidebar,
    } = layout ?? {};
    const isLeftSidebarOpen = leftSidebarToggle?.isOpen ?? false;
    const isRightSidebarOpen = rightSidebarToggle?.isOpen ?? false;

    return (
        <div
            className={styles.root}
            ref={rootRef}
            style={rootStyle}
        >
            <div className={styles.toolbarRow}>
                <div className={styles.toolbarSideLeft}>
                    {leftSidebarToggle ? (
                        <button
                            className={styles.sidebarToggleButton}
                            type="button"
                            aria-label={isLeftSidebarOpen ? 'Hide left sidebar' : 'Show left sidebar'}
                            aria-pressed={isLeftSidebarOpen}
                            onMouseDown={onLeftSidebarToggleMouseDown}
                        >
                            <NavArrowLeft
                                aria-hidden="true"
                                className={clsx(
                                    styles.sidebarToggleIcon,
                                    !isLeftSidebarOpen && styles.sidebarToggleIconFlipped,
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
                <div className={styles.toolbarSideRight}>
                    {rightSidebarToggle ? (
                        <button
                            className={styles.sidebarToggleButton}
                            type="button"
                            aria-label={isRightSidebarOpen ? 'Hide right sidebar' : 'Show right sidebar'}
                            aria-pressed={isRightSidebarOpen}
                            onMouseDown={onRightSidebarToggleMouseDown}
                        >
                            <NavArrowRight
                                aria-hidden="true"
                                className={clsx(
                                    styles.sidebarToggleIcon,
                                    !isRightSidebarOpen && styles.sidebarToggleIconFlipped,
                                )}
                            />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className={styles.contentRow}>
                <aside
                    className={clsx(
                        isLeftSidebarOpen && styles.sidebarLeftOpen,
                        !isLeftSidebarOpen && styles.sidebarLeftHidden,
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
                        characterColorSaturation={characterColorSaturation}
                        autoFocus={autoFocus}
                    />
                </div>
                <aside
                    className={clsx(
                        isRightSidebarOpen && styles.sidebarRightOpen,
                        !isRightSidebarOpen && styles.sidebarRightHidden,
                    )}
                    aria-hidden={!isRightSidebarOpen}
                >
                    {rightSidebar}
                </aside>
            </div>
        </div>
    );
};
