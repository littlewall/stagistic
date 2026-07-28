import type {useScriptCharacterCatalog} from '@stagistic/app-core';
import type {EditorValueChangeMeta} from '@stagistic/editor';
import type {ScriptDocument} from '@stagistic/script';
import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

interface UseCharacterStateArgs {
    currentScriptId: string | null,
    characterCatalog: ReturnType<typeof useScriptCharacterCatalog>,
    initialValue: ScriptDocument | null | undefined,
}

export interface CharacterEditorState {
    getEditorValue: () => ScriptDocument | null,
    setEditorValue: (value: ScriptDocument | null) => void,
    editorOverrideValue: ScriptDocument | null,
    setEditorOverrideValue: Dispatch<SetStateAction<ScriptDocument | null>>,
    handleEditorValueChange: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,
}

interface CharacterState {
    editor: CharacterEditorState,
    catalog: ReturnType<typeof useScriptCharacterCatalog>,
}

export const useCharacterState = ({
    currentScriptId,
    characterCatalog,
    initialValue,
}: UseCharacterStateArgs): CharacterState => {
    const previousScriptIdRef = useRef<string | null>(null);
    const editorValueRef = useRef<ScriptDocument | null>(null);
    const [editorOverrideValue, setEditorOverrideValue] = useState<ScriptDocument | null>(null);
    const catalog = characterCatalog;

    useEffect(() => {
        const didScriptChange = previousScriptIdRef.current !== currentScriptId;

        previousScriptIdRef.current = currentScriptId;

        if (didScriptChange) {
            editorValueRef.current = initialValue ?? null;
            setEditorOverrideValue(null);

            return;
        }

        if (!editorValueRef.current) {
            editorValueRef.current = initialValue ?? null;
        }
    }, [currentScriptId, initialValue]);

    const setEditorValue = useCallback((value: ScriptDocument | null) => {
        editorValueRef.current = value;
    }, []);
    const getEditorValue = useCallback(() => editorValueRef.current, []);
    const handleEditorValueChange = useCallback((value: ScriptDocument) => {
        editorValueRef.current = value;
    }, []);

    return {
        editor: {
            getEditorValue,
            setEditorValue,
            editorOverrideValue,
            setEditorOverrideValue,
            handleEditorValueChange,
        },
        catalog,
    };
};
