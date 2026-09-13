import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {getActiveScriptBlockFromState} from '../../scriptCore';
import {getSceneCollapseSnapshot} from './SceneCollapseExtension';
import {findPreviousCollapsedScene} from './sceneCollapseModel';

const moveCaret = (editor: Editor, position: number) => {
    editor.view.dispatch(
        editor.state.tr
            .setSelection(TextSelection.create(editor.state.doc, position))
            .scrollIntoView(),
    );
};

export const handleSceneCollapseKeyDown = (
    editor: Editor,
    event: KeyboardEvent,
): boolean => {
    if (!editor.state.selection.empty) {
        return false;
    }

    const activeBlock = getActiveScriptBlockFromState(editor.state);

    if (!activeBlock) {
        return false;
    }

    const snapshot = getSceneCollapseSnapshot(editor.state);
    const collapsedIds = new Set(snapshot.collapsedSceneIds);
    const activeRange = snapshot.ranges.find(range => range.sceneBlockId === activeBlock.id);

    if (event.key === 'Enter' && activeRange && collapsedIds.has(activeBlock.id)) {
        editor.commands.expandScene(activeBlock.id);

        return false;
    }

    if (
        event.key === 'ArrowDown'
        && activeRange
        && collapsedIds.has(activeBlock.id)
        && editor.state.selection.from === activeBlock.to
        && activeRange.nextBoundary
    ) {
        event.preventDefault();
        moveCaret(editor, activeRange.nextBoundary.to - 1);

        return true;
    }

    if (
        event.key !== 'ArrowUp'
        || editor.state.selection.from !== activeBlock.from
        || (activeBlock.blockType !== 'scene' && activeBlock.blockType !== 'act')
    ) {
        return false;
    }

    const previous = findPreviousCollapsedScene(
        snapshot.ranges,
        collapsedIds,
        activeBlock.pos,
    );

    if (!previous) {
        return false;
    }

    event.preventDefault();
    moveCaret(editor, previous.headingTo - 1);

    return true;
};
