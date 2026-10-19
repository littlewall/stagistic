import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect} from 'react';

export const useEditorCharacterSync = (
    editor: TiptapEditor | null,
    persistentCharacters: unknown,
) => {
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
        // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Record changes invalidate decorations read from the editor's mutable refs.
        persistentCharacters,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const syncCommands = editor.commands as {
            syncCharacterRefs?: () => boolean,
        };

        syncCommands.syncCharacterRefs?.();
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Character record changes require synchronizing the external editor's references.
    }, [editor, persistentCharacters]);
};
