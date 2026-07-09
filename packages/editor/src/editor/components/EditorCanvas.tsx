import type {HeaderFooterSettings} from '@stagistic/script';
import {type Editor as TiptapEditor, EditorContent} from '@tiptap/react';
import {type CSSProperties, useRef} from 'react';

import type {
    PersistentCharacterRef,
    PersistentCueRef,
} from '../contracts';
import CharacterSuggestionsOverlay from './CharacterSuggestionsOverlay';
import CueSuggestionsOverlay from './CueSuggestionsOverlay';
import EditorBlockActionsOverlay from './EditorBlockActionsOverlay';
import styles from './EditorCanvas.module.css';
import {EmptyEnterBlockChooserOverlay} from './emptyEnterChooser/EmptyEnterBlockChooserOverlay';
import {HeaderFooterOverlay} from './HeaderFooterOverlay';

type EditorCanvasProps = {
    editor: TiptapEditor | null,
    persistentCharacters?: readonly PersistentCharacterRef[],
    persistentCues?: readonly PersistentCueRef[],
    onCueAssigned?: (cueId: string) => void,
    characterColorSaturation?: number,
    autoFocus?: boolean,
    style?: CSSProperties,
    headerFooter: HeaderFooterSettings,
    scriptTitle?: string,
    draftDate?: string,
};

export const EditorCanvas = ({
    editor,
    persistentCharacters = [],
    persistentCues = [],
    onCueAssigned,
    characterColorSaturation,
    autoFocus,
    style,
    headerFooter,
    scriptTitle = '',
    draftDate = '',
}: EditorCanvasProps) => {
    const canvasRef = useRef<HTMLElement | null>(null);

    return (
        <section
            className={styles.canvas}
            data-editor-scroll-container="true"
            ref={canvasRef}
            style={style}
        >
            <EditorContent
                className={styles.content}
                editor={editor}
                spellCheck={false}
                autoFocus={autoFocus}
            />
            <CharacterSuggestionsOverlay
                editor={editor}
                canvasRef={canvasRef}
                persistentCharacters={persistentCharacters}
                characterColorSaturation={characterColorSaturation}
            />
            <CueSuggestionsOverlay
                editor={editor}
                canvasRef={canvasRef}
                persistentCues={persistentCues}
                onCueAssigned={onCueAssigned}
            />
            <EmptyEnterBlockChooserOverlay editor={editor} canvasRef={canvasRef} />
            <EditorBlockActionsOverlay editor={editor} canvasRef={canvasRef} />
            <HeaderFooterOverlay
                editor={editor}
                canvasRef={canvasRef}
                headerFooter={headerFooter}
                scriptTitle={scriptTitle}
                draftDate={draftDate}
            />
        </section>
    );
};
