import type {HeaderFooterSettings} from '@stagistic/script';
import {type Editor as TiptapEditor, EditorContent} from '@tiptap/react';
import {type CSSProperties, useRef} from 'react';

import type {
    PersistentCharacterRef,
    PersistentMusicRef,
} from '../contracts';
import CharacterSuggestionsOverlay from './CharacterSuggestionsOverlay';
import EditorBlockActionsOverlay from './EditorBlockActionsOverlay';
import styles from './EditorCanvas.module.css';
import {EmptyEnterBlockChooserOverlay} from './emptyEnterChooser/EmptyEnterBlockChooserOverlay';
import {HeaderFooterOverlay} from './HeaderFooterOverlay';
import MusicDraftSuggestionsOverlay from './MusicDraftSuggestionsOverlay';
import MusicSuggestionsOverlay from './MusicSuggestionsOverlay';

type EditorCanvasProps = {
    editor: TiptapEditor | null,
    persistentCharacters?: readonly PersistentCharacterRef[],
    persistentMusic?: readonly PersistentMusicRef[],
    onMusicAssigned?: (musicId: string) => void,
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
    persistentMusic = [],
    onMusicAssigned,
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
            <MusicSuggestionsOverlay
                editor={editor}
                canvasRef={canvasRef}
                persistentMusic={persistentMusic}
                onMusicAssigned={onMusicAssigned}
            />
            <MusicDraftSuggestionsOverlay
                editor={editor}
                canvasRef={canvasRef}
                persistentMusic={persistentMusic}
                onMusicAssigned={onMusicAssigned}
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
