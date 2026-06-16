import type {Editor as TiptapEditor} from '@tiptap/react';

import type {PersistentCharacterRef} from '../../../contracts';
import {createCharacterTagKeyDownHandler} from './keyDownHandlers';
import {createCharacterTagTextInputHandler} from './textInputHandlers';

interface CharacterTagInputHandlersArgs {
    editor: TiptapEditor,
    getPersistentCharacters: () => readonly PersistentCharacterRef[],
}

export const createCharacterTagInputHandlers = ({
    editor,
    getPersistentCharacters,
}: CharacterTagInputHandlersArgs) => {
    return {
        handleTextInput: createCharacterTagTextInputHandler(getPersistentCharacters),
        handleKeyDown: createCharacterTagKeyDownHandler(editor),
    };
};
