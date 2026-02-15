import {type Editor as TiptapEditor, EditorContent} from '@tiptap/react';
import clsx from 'clsx';
import {type CSSProperties, useRef} from 'react';

import CharacterSuggestionsOverlay from './CharacterSuggestionsOverlay';
import EditorBlockActionsOverlay from './EditorBlockActionsOverlay';
import styles from './EditorCanvas.module.css';

type PersistentCharacterRef = {
    id: string,
    key: string,
    colorHex?: string | null,
};

type EditorCanvasProps = {
    editor: TiptapEditor | null,
    persistentCharacters?: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
    autoFocus?: boolean,
    style?: CSSProperties,
};

export const EditorCanvas = ({
    editor,
    persistentCharacters = [],
    characterColorSaturation,
    autoFocus,
    style,
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
                className={clsx(styles.content)}
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
            <EditorBlockActionsOverlay editor={editor} canvasRef={canvasRef} />
        </section>
    );
};
