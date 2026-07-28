import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect} from 'react';

export const useEditorCharacterSync = (
    editor: TiptapEditor | null,
    persistentCharacters: unknown,
    characterColorSaturation: number | undefined,
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
        persistentCharacters,
        characterColorSaturation,
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
};
