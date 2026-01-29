import { PlateContent } from 'platejs/react';

export function EditorCanvas() {
    return (
        <section className="editor-canvas">
            <PlateContent className="editor-content" spellCheck autoFocus />
        </section>
    );
}
