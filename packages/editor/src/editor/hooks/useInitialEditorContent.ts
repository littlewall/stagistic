import type {ScriptDocument} from '@stagistic/script';
import {useState} from 'react';

/** Keeps the first value for a content signature; a new signature replaces it. */
export const useInitialEditorContent = (signature: string, value: ScriptDocument) => {
    const [content, setContent] = useState({signature, value});

    if (content.signature !== signature) {
        setContent({signature, value});

        return value;
    }

    return content.value;
};
