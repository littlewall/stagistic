import type {PlateEditor} from 'platejs/react';
import {Path} from 'slate';

import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
} from '../types';
import {
    getNodeText,
    getNodeType,
    isDialogueSectionType,
    isIgnorableNode,
} from './utils';

const findPreviousNonIgnorablePath = (editor: PlateEditor, path: Path) => {
    let current = path;

    while (true) {
        let previousPath: Path;

        try {
            previousPath = Path.previous(current);
        } catch {
            return null;
        }

        const previousEntry = editor.api.node(previousPath);
        const previousNode = previousEntry ? previousEntry[0] : null;

        if (!previousNode) return null;

        if (!isIgnorableNode(previousNode)) {
            return previousPath;
        }

        current = previousPath;
    }
};

const findNextNonIgnorablePath = (editor: PlateEditor, path: Path) => {
    let current = path;

    while (true) {
        let nextPath: Path;

        try {
            nextPath = Path.next(current);
        } catch {
            return null;
        }

        const nextEntry = editor.api.node(nextPath);
        const nextNode = nextEntry ? nextEntry[0] : null;

        if (!nextNode) return null;

        if (!isIgnorableNode(nextNode)) {
            return nextPath;
        }

        current = nextPath;
    }
};

export const isIgnorableWithinDialogueSection = (
    editor: PlateEditor,
    path: Path,
) => {
    const previousPath = findPreviousNonIgnorablePath(editor, path);
    const nextPath = findNextNonIgnorablePath(editor, path);

    if (!previousPath || !nextPath) return false;

    const previousNode = editor.api.node(previousPath);
    const nextNode = editor.api.node(nextPath);
    const previousType = previousNode ? getNodeType(previousNode[0]) : null;
    const nextType = nextNode ? getNodeType(nextNode[0]) : null;

    return isDialogueSectionType(previousType) && isDialogueSectionType(nextType);
};

export const getSectionStartPath = (editor: PlateEditor, path: Path) => {
    let current = path;

    while (true) {
        let previousPath: Path;

        try {
            previousPath = Path.previous(current);
        } catch {
            break;
        }

        const previousEntry = editor.api.node(previousPath);
        const previousNode = previousEntry ? previousEntry[0] : null;
        const previousType = previousNode ? getNodeType(previousNode) : null;

        if (isIgnorableNode(previousNode)) {
            if (!isIgnorableWithinDialogueSection(editor, previousPath)) {
                break;
            }

            current = previousPath;
            continue;
        }

        if (!isDialogueSectionType(previousType)) {
            break;
        }

        current = previousPath;
    }

    return current;
};

const sectionHasDualCharacter = (editor: PlateEditor, startPath: Path) => {
    let current = startPath;

    while (true) {
        const entry = editor.api.node(current);

        if (!entry) break;

        const node = entry[0];
        const type = getNodeType(node);

        if (isIgnorableNode(node)) {
            if (!isIgnorableWithinDialogueSection(editor, current)) {
                break;
            }

            current = Path.next(current);
            continue;
        }

        if (!isDialogueSectionType(type)) break;

        if (
            type === ELEMENT_DUAL_DIALOGUE_CHARACTER ||
      type === ELEMENT_DUAL_DIALOGUE
        ) {
            return true;
        }

        current = Path.next(current);
    }

    return false;
};

export const shouldSuppressCharacterGap = (
    editor: PlateEditor,
    path: Path,
) => {
    if (path.length === 0 || path[0] === 0) {
        return false;
    }

    let previousPath: Path;

    try {
        previousPath = Path.previous(path);
    } catch {
        return false;
    }

    const previousEntry = editor.api.node(previousPath);

    if (!previousEntry) return false;

    const previousNode = previousEntry[0];
    const previousType = getNodeType(previousNode);

    if (previousType !== ELEMENT_ACTION && previousType !== ELEMENT_DIALOGUE) {
        return false;
    }

    if (getNodeText(previousNode).trim().length > 0) {
        return false;
    }

    if (
        previousType === ELEMENT_ACTION &&
    isIgnorableWithinDialogueSection(editor, previousPath)
    ) {
        return false;
    }

    return true;
};

type DualColumnPlacement =
    | {column: 'full'}
    | {column: 'hidden'}
    | {column: 'left' | 'right'};

export const getDualColumnPlacement = (
    editor: PlateEditor,
    path: Path,
): DualColumnPlacement => {
    const entry = editor.api.node(path);

    if (!entry) return {column: 'full'};

    const [node] = entry;
    const type = getNodeType(node);

    if (type === ELEMENT_ACTION) {
        if (node && isIgnorableNode(node) && isIgnorableWithinDialogueSection(editor, path)) {
            const sectionStart = getSectionStartPath(editor, path);

            if (sectionHasDualCharacter(editor, sectionStart)) {
                return {column: 'hidden'};
            }
        }

        return {column: 'full'};
    }

    if (!isDialogueSectionType(type)) {
        return {column: 'full'};
    }

    const sectionStart = getSectionStartPath(editor, path);
    const hasDual = sectionHasDualCharacter(editor, sectionStart);

    if (!hasDual) {
        return {column: 'full'};
    }

    let current = sectionStart;
    let currentColumn: 'left' | 'right' = 'left';

    while (true) {
        const currentEntry = editor.api.node(current);

        if (!currentEntry) break;

        const currentNode = currentEntry[0];
        const currentType = getNodeType(currentNode);

        if (isIgnorableNode(currentNode)) {
            if (isIgnorableWithinDialogueSection(editor, current)) {
                if (Path.equals(current, path)) {
                    return {column: 'hidden'};
                }

                current = Path.next(current);
                continue;
            }

            break;
        }

        if (!isDialogueSectionType(currentType)) {
            break;
        }

        if (currentType === ELEMENT_CHARACTER) {
            currentColumn = 'left';
        } else if (
            currentType === ELEMENT_DUAL_DIALOGUE_CHARACTER ||
      currentType === ELEMENT_DUAL_DIALOGUE
        ) {
            currentColumn = 'right';
        }

        if (Path.equals(current, path)) {
            return {column: currentColumn};
        }

        current = Path.next(current);
    }

    return {column: 'full'};
};
