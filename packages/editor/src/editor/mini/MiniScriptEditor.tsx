import {
    CHARACTER_COLOR_SATURATION_MAX,
    type ScriptDocument,
} from '@stagistic/script';
import type {Extensions} from '@tiptap/core';
import HardBreak from '@tiptap/extension-hard-break';
import Text from '@tiptap/extension-text';
import {EditorContent} from '@tiptap/react';
import clsx from 'clsx';
import {
    type ReactElement,
    type ReactNode,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';

import {SCRIPT_EDITOR_DESCRIPTION_ID} from '../accessibility';
import {buildCharacterTagPaletteCss} from '../characters/buildCharacterTagPaletteCss';
import CharacterSuggestionsOverlay from '../components/CharacterSuggestionsOverlay';
import {EditorSnapshotStoreProvider} from '../live/context';
import {createEditorSnapshotStore} from '../live/store';
import {
    createCharacterColorRefsBundle,
} from '../surface/editorSurfaceCache';
import {useScriptEditorInstance} from '../surface/useScriptEditorInstance';
import {
    CharacterTagInputExtension,
    EditorRuntimeExtension,
    MusicNumberingExtension,
} from '../tiptap/extensions';
import {DocumentWithSettings} from '../tiptap/extensions/DocumentExtension';
import {CharacterTagMark} from '../tiptap/marks';
import {
    MusicStartNode,
    ScriptBlockNodes,
} from '../tiptap/nodes';
import characterTagStyles from '../tiptap/scriptBlock/CharacterTagDecorations.module.css';
import {getActiveScriptBlockFromState} from '../tiptap/scriptCore';
import {MiniBlockTypeIndicator} from './MiniBlockTypeIndicator';
import {
    buildMiniEditorCharacterPresentation,
    buildMiniEditorCharacters,
    mergeMiniEditorCharacters,
    MINI_EDITOR_CHARACTER_SATURATION,
    syncMiniEditorCharacterRefs,
} from './miniEditorCharacters';
import {
    buildMiniEditorDocumentStructureSignature,
    MiniEditorGuardExtension,
} from './MiniEditorGuardExtension';
import {MiniMusicCaretExtension} from './MiniMusicCaretExtension';
import styles from './MiniScriptEditor.module.css';

export type MiniScriptEditorProps = {
    document: ScriptDocument,
    className?: string,
    musicNumberLabel?: string,
    staticFallback?: ReactNode,
};

type MiniScriptEditorSurfaceProps = {
    className?: string,
    document: ScriptDocument,
    musicNumberLabel?: string,
};

const MiniScriptEditorSurface = ({
    className,
    document,
    musicNumberLabel,
}: MiniScriptEditorSurfaceProps) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const characterColorRefs = useMemo(
        () => createCharacterColorRefsBundle(),
        [],
    );
    const signature = useMemo(() => {
        const nextSignature = buildMiniEditorDocumentStructureSignature(document);

        if (!nextSignature) {
            throw new Error('MiniScriptEditor requires a fixed document with one music start.');
        }

        return nextSignature;
    }, [document]);
    const initialCharacters = useMemo(
        () => buildMiniEditorCharacters(document),
        [document],
    );
    const [persistentCharacters, setPersistentCharacters] = useState(initialCharacters);
    const [liveStore] = useState(() => createEditorSnapshotStore());
    const committedCharactersRef = useRef(initialCharacters);
    const rawCharacterTagScopeId = useId();
    const characterTagScopeId = useMemo(
        () => rawCharacterTagScopeId.replace(/[^a-zA-Z0-9_-]/g, ''),
        [rawCharacterTagScopeId],
    );
    const characterPresentation = useMemo(
        () => buildMiniEditorCharacterPresentation(
            document,
            persistentCharacters,
        ),
        [document, persistentCharacters],
    );
    const characterTagPaletteCss = useMemo(
        () => buildCharacterTagPaletteCss({
            colorByCharacterId: characterPresentation.colorByCharacterId,
            displayColorByKey: characterPresentation.displayColorByKey,
            scopeAttributeValue: characterTagScopeId,
        }),
        [characterPresentation, characterTagScopeId],
    );

    if (characterColorRefs.persistentCharactersRef.current.length === 0) {
        syncMiniEditorCharacterRefs(
            characterColorRefs,
            initialCharacters,
            document,
        );
    }

    const extensions = useMemo<Extensions>(() => [
        DocumentWithSettings,
        Text,
        HardBreak,
        CharacterTagMark.configure({
            tagClassName: characterTagStyles.characterTag,
        }),
        CharacterTagInputExtension.configure({
            persistentCharactersRef: characterColorRefs.persistentCharactersRef,
        }),
        ...ScriptBlockNodes,
        MusicStartNode.configure({
            locked: true,
            numberLabel: musicNumberLabel,
        }),
        MusicNumberingExtension,
        EditorRuntimeExtension.configure({
            characterColorSaturation: MINI_EDITOR_CHARACTER_SATURATION,
            colorByCharacterIdRef: characterColorRefs.colorByCharacterIdRef,
            rememberedColorByKeyRef: characterColorRefs.rememberedColorByKeyRef,
            persistentCharactersRef: characterColorRefs.persistentCharactersRef,
            characterTagClassNames: {
                tag: characterTagStyles.characterTag,
                separator: characterTagStyles.characterSeparator,
            },
        }),
        MiniMusicCaretExtension,
        MiniEditorGuardExtension.configure({signature}),
    ], [
        characterColorRefs,
        musicNumberLabel,
        signature,
    ]);
    const editorSignature = useMemo(
        () => JSON.stringify({document, signature}),
        [document, signature],
    );
    const {editor} = useScriptEditorInstance({
        signature: editorSignature,
        extensions,
        content: document,
        characterColorRefs,
    });
    const updateCharacters = useCallback(() => {
        const currentDocument = editor.getJSON() as ScriptDocument;
        const documentCharacters = buildMiniEditorCharacters(currentDocument);
        const activeBlock = getActiveScriptBlockFromState(editor.state);

        if (activeBlock?.blockType !== 'character') {
            committedCharactersRef.current = mergeMiniEditorCharacters(
                committedCharactersRef.current,
                documentCharacters,
            );
        }

        const nextCharacters = committedCharactersRef.current;
        const didCharactersChange = nextCharacters.length
            !== characterColorRefs.persistentCharactersRef.current.length
            || nextCharacters.some((character, index) => {
                const previous = characterColorRefs
                    .persistentCharactersRef.current[index];

                return character.id !== previous?.id
                    || character.key !== previous.key;
            });
        const presentation = syncMiniEditorCharacterRefs(
            characterColorRefs,
            nextCharacters,
            currentDocument,
        );

        liveStore.patchSnapshot({
            revision: liveStore.getSnapshot().revision + 1,
            characters: presentation.snapshot,
        });
        setPersistentCharacters(nextCharacters);

        if (didCharactersChange) {
            editor.commands.refreshCharacterTagDecorations();
        }
    }, [
        characterColorRefs,
        editor,
        liveStore,
    ]);

    useEffect(() => {
        updateCharacters();
        editor.on('transaction', updateCharacters);

        return () => {
            editor.off('transaction', updateCharacters);
        };
    }, [editor, updateCharacters]);

    return (
        <EditorSnapshotStoreProvider store={liveStore}>
            <div
                className={clsx(styles.root, className)}
                data-character-highlight="underline"
                data-character-saturation={CHARACTER_COLOR_SATURATION_MAX}
                data-character-tag-scope={characterTagScopeId}
                data-mini-editor
                ref={rootRef}
            >
                {characterTagPaletteCss ? (
                    <style data-character-tag-palette>
                        {characterTagPaletteCss}
                    </style>
                ) : null}
                <p
                    className={styles.screenReaderInstructions}
                    id={SCRIPT_EDITOR_DESCRIPTION_ID}
                >
                    Interactive script excerpt. Enter moves to the next block.
                </p>
                <EditorContent
                    className={styles.content}
                    editor={editor}
                    spellCheck={false}
                />
                <MiniBlockTypeIndicator editor={editor} rootRef={rootRef} />
                <CharacterSuggestionsOverlay
                    editor={editor}
                    canvasRef={rootRef}
                    persistentCharacters={persistentCharacters}
                />
            </div>
        </EditorSnapshotStoreProvider>
    );
};

export const MiniScriptEditor = ({
    className,
    document,
    musicNumberLabel,
    staticFallback = null,
}: MiniScriptEditorProps): ReactElement | null => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return staticFallback ? <>{staticFallback}</> : null;
    }

    return (
        <MiniScriptEditorSurface
            className={className}
            document={document}
            musicNumberLabel={musicNumberLabel}
        />
    );
};
