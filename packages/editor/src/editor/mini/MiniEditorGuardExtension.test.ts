import {
    MUSIC_ID_ATTR,
    MUSIC_START_NODE_NAME,
    type ScriptDocument,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../tiptap/scriptCore';
import {
    buildMiniEditorDocumentStructureSignature,
    buildMiniEditorStructureSignature,
    handleMiniEditorKeyDown,
    matchesMiniEditorStructureSignature,
    shouldApplyMiniEditorTransaction,
} from './MiniEditorGuardExtension';
import {
    createGuardedMiniEditorTestEditor,
    createMiniEditorTestDocument,
    createMiniEditorTestEditor,
    findMiniEditorTestBlockPosition,
    miniEditorStructureSignature,
} from './miniEditorTestUtils';

const cloneDocument = (documentValue: ScriptDocument): ScriptDocument => {
    return structuredClone(documentValue);
};

const createKeyEvent = (key: string, shiftKey = false) => {
    return {
        key,
        shiftKey,
        preventDefault: () => {},
    } as KeyboardEvent;
};

describe('mini editor structure signature', () => {
    it('builds the same fixed signature from document JSON', () => {
        expect(buildMiniEditorDocumentStructureSignature(
            createMiniEditorTestDocument(),
        )).toEqual(miniEditorStructureSignature);
    });

    it('allows inline text edits while retaining the fixed shell', () => {
        const editor = createMiniEditorTestEditor();
        const signature = buildMiniEditorStructureSignature(editor.state.doc);

        expect(signature).not.toBeNull();

        const edited = cloneDocument(createMiniEditorTestDocument());

        edited.content[2].content = [{type: 'text', text: 'ANNA / BORIS'}];

        expect(matchesMiniEditorStructureSignature(
            editor.schema.nodeFromJSON(edited),
            signature!,
        )).toBe(true);

        editor.destroy();
    });

    it('rejects changed block count, order, type, and id', () => {
        const editor = createMiniEditorTestEditor();
        const signature = buildMiniEditorStructureSignature(editor.state.doc);
        const removed = cloneDocument(createMiniEditorTestDocument());
        const reordered = cloneDocument(createMiniEditorTestDocument());
        const changedType = cloneDocument(createMiniEditorTestDocument());
        const changedId = cloneDocument(createMiniEditorTestDocument());

        removed.content.splice(3, 1);
        [reordered.content[2], reordered.content[3]] = [reordered.content[3], reordered.content[2]];
        changedType.content[2].type = 'dialogue';
        changedId.content[2].attrs = {id: 'replacement-character'};

        [
            removed,
            reordered,
            changedType,
            changedId,
        ].forEach(candidate => {
            expect(matchesMiniEditorStructureSignature(
                editor.schema.nodeFromJSON(candidate),
                signature!,
            )).toBe(false);
        });

        editor.destroy();
    });

    it('rejects removal, replacement, or movement of the protected music', () => {
        const editor = createMiniEditorTestEditor();
        const signature = buildMiniEditorStructureSignature(editor.state.doc);
        const removed = cloneDocument(createMiniEditorTestDocument());
        const replaced = cloneDocument(createMiniEditorTestDocument());
        const moved = cloneDocument(createMiniEditorTestDocument());
        const removedMusic = removed.content[1].content?.splice(1, 1)[0];
        const replacedMusic = replaced.content[1].content?.[1];
        const movedMusic = moved.content[1].content?.splice(1, 1)[0];

        expect(removedMusic?.type).toBe(MUSIC_START_NODE_NAME);
        expect(replacedMusic?.type).toBe(MUSIC_START_NODE_NAME);
        expect(movedMusic?.type).toBe(MUSIC_START_NODE_NAME);

        if (replacedMusic?.attrs) {
            replacedMusic.attrs[MUSIC_ID_ATTR] = 'replacement-music';
        }

        if (movedMusic) {
            moved.content[4].content?.push(movedMusic);
        }

        [
            removed,
            replaced,
            moved,
        ].forEach(candidate => {
            expect(matchesMiniEditorStructureSignature(
                editor.schema.nodeFromJSON(candidate),
                signature!,
            )).toBe(false);
        });

        editor.destroy();
    });
});

describe('mini editor guard', () => {
    it('rejects a transaction result that removes a fixed block', () => {
        const editor = createGuardedMiniEditorTestEditor();
        const characterPos = findMiniEditorTestBlockPosition(editor, 'mini-character');
        const characterSize = editor.state.doc.nodeAt(characterPos)?.nodeSize ?? 0;
        const transaction = editor.state.tr.delete(
            characterPos,
            characterPos + characterSize,
        );

        expect(shouldApplyMiniEditorTransaction(
            transaction,
            miniEditorStructureSignature,
        )).toBe(false);

        editor.destroy();
    });

    it('moves Enter to the end of the next block and consumes it in the final block', () => {
        const editor = createGuardedMiniEditorTestEditor();
        const characterPos = findMiniEditorTestBlockPosition(editor, 'mini-character');
        const asidePos = findMiniEditorTestBlockPosition(editor, 'mini-aside');
        const asideNodeSize = editor.state.doc.nodeAt(asidePos)?.nodeSize ?? 0;
        const dialoguePos = findMiniEditorTestBlockPosition(editor, 'mini-dialogue');

        editor.commands.setTextSelection(characterPos + 1);

        expect(handleMiniEditorKeyDown(
            editor,
            createKeyEvent('Enter'),
            miniEditorStructureSignature,
        )).toBe(true);
        expect(getActiveScriptBlockFromState(
            editor.state,
            SCRIPT_BLOCK_NODE_NAMES,
        )?.id).toBe('mini-aside');
        expect(editor.state.selection.from).toBe(asidePos + asideNodeSize - 1);

        editor.commands.setTextSelection(dialoguePos + 1);

        expect(handleMiniEditorKeyDown(
            editor,
            createKeyEvent('Enter'),
            miniEditorStructureSignature,
        )).toBe(true);
        expect(editor.state.doc.childCount).toBe(5);

        editor.destroy();
    });

    it('moves Enter before protected music at the end of the next block', () => {
        const editor = createGuardedMiniEditorTestEditor();
        const scenePos = findMiniEditorTestBlockPosition(editor, 'mini-scene');
        const stageDirectionPos = findMiniEditorTestBlockPosition(
            editor,
            'mini-stage-direction',
        );

        editor.commands.setTextSelection(scenePos + 1);

        expect(handleMiniEditorKeyDown(
            editor,
            createKeyEvent('Enter'),
            miniEditorStructureSignature,
        )).toBe(true);
        expect(editor.state.selection.from).toBe(
            stageDirectionPos + 1 + 'Music starts. '.length,
        );

        editor.destroy();
    });

    it('inserts a hard break with Shift+Enter without changing the shell', () => {
        const editor = createGuardedMiniEditorTestEditor();
        const dialoguePos = findMiniEditorTestBlockPosition(editor, 'mini-dialogue');

        editor.commands.setTextSelection(dialoguePos + 5);

        expect(handleMiniEditorKeyDown(
            editor,
            createKeyEvent('Enter', true),
        )).toBe(true);
        expect(editor.state.doc.child(4).content.content.some(node => {
            return node.type.name === 'hardBreak';
        })).toBe(true);
        expect(matchesMiniEditorStructureSignature(
            editor.state.doc,
            miniEditorStructureSignature,
        )).toBe(true);

        editor.destroy();
    });

    it('consumes Backspace and Delete at block boundaries', () => {
        const editor = createGuardedMiniEditorTestEditor();
        const characterPos = findMiniEditorTestBlockPosition(editor, 'mini-character');
        const characterNode = editor.state.doc.nodeAt(characterPos);

        editor.commands.setTextSelection(characterPos + 1);
        expect(handleMiniEditorKeyDown(
            editor,
            createKeyEvent('Backspace'),
        )).toBe(true);

        editor.commands.setTextSelection(
            characterPos + (characterNode?.nodeSize ?? 1) - 1,
        );
        expect(handleMiniEditorKeyDown(
            editor,
            createKeyEvent('Delete'),
        )).toBe(true);
        expect(editor.state.doc.childCount).toBe(5);

        editor.destroy();
    });
});
