import {
    type ColumnElement,
    type ColumnGroupElement,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElement,
    type FountainElementType,
} from '@stagistic/editor-core';
import type {PlateEditor} from 'platejs/react';
import {Path} from 'slate';

export type FountainBlockTypeChangeTarget = FountainElement;
export type EnterNextTypeMap = Partial<
    Record<FountainElementType, FountainElementType>
>;

export const DEFAULT_ENTER_NEXT_TYPE: EnterNextTypeMap = {
    [ELEMENT_SCENE_HEADING]: ELEMENT_ACTION,
    [ELEMENT_ACTION]: ELEMENT_ACTION,
    [ELEMENT_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_PARENTHETICAL]: ELEMENT_DIALOGUE,
    [ELEMENT_DIALOGUE]: ELEMENT_CHARACTER,
    [ELEMENT_TRANSITION]: ELEMENT_SCENE_HEADING,
};

export const getEnterNextType = (
    editor: PlateEditor,
    type: FountainElementType,
) => {
    const custom =
    (editor as unknown as {fountainEnterNextType?: EnterNextTypeMap})
        .fountainEnterNextType;

    return custom?.[type] ?? DEFAULT_ENTER_NEXT_TYPE[type] ?? type;
};

const removeEmptyBlocksAfterCharacter = (
    editor: PlateEditor,
    path: Path,
) => {
    const entry = editor.api.node(path);

    if (!entry) return;

    const [node] = entry;

    if (
        !node
    || typeof node !== 'object'
    || !('type' in node)
    || node.type !== ELEMENT_CHARACTER
    ) {
        return;
    }

    const emptyPaths: Path[] = [];
    let current = Path.next(path);

    while (true) {
        const nextEntry = editor.api.node(current);

        if (!nextEntry) return;

        if (editor.api.isEmpty(current, {block: true})) {
            emptyPaths.push(current);
            current = Path.next(current);
            continue;
        }

        const nextNode = nextEntry[0];
        const nextType =
      nextNode && typeof nextNode === 'object' && 'type' in nextNode
          ? nextNode.type
          : null;

        if (
            nextType === ELEMENT_PARENTHETICAL
      || nextType === ELEMENT_DIALOGUE
      || nextType === ELEMENT_LYRICS
        ) {
            for (let i = emptyPaths.length - 1; i >= 0; i -= 1) {
                editor.tf.removeNodes({at: emptyPaths[i]});
            }
        }

        return;
    }
};

export const isParentheticalSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_PARENTHETICAL,
    }),
);

export const isCharacterSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_CHARACTER,
    }),
);

export const isDualCharacterSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER,
    }),
);

export const isDialogueSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_DIALOGUE,
    }),
);

export const isDualDialogueSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_DUAL_DIALOGUE,
    }),
);

export const setSelectionBlockType = (
    editor: PlateEditor,
    type: FountainElementType,
) => {
    const blockEntry = editor.api.block({at: editor.selection ?? undefined});

    if (!blockEntry) return undefined;

    editor.tf.setNodes({type}, {at: blockEntry[1]});

    return blockEntry[1];
};

export const isDualDialogueContext = (editor: PlateEditor, path: Path) => {
    if (path.length === 0 || path[0] === 0) return false;

    const previousPath = Path.previous(path);
    const previousNode = editor.api.node(previousPath);

    if (!previousNode) return false;

    const [node] = previousNode;

    return (
        typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER ||
      node.type === ELEMENT_DUAL_DIALOGUE)
    );
};

export const shouldSuppressCharacterGap = (
    editor: PlateEditor,
    path: Path,
) => {
    if (path.length === 0 || path[0] === 0) return false;

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

export const getElementText = (node: unknown) => {
    if (!node || typeof node !== 'object') return '';

    if (!('children' in node)) return '';

    const children = (node as {children?: Array<{text?: string}>}).children;

    if (!Array.isArray(children)) return '';

    return children.map(child => child.text ?? '').join('');
};

const stripOuterCharactersFromChildren = (
    children: FountainElement['children'],
    startChar: string,
    endChar: string,
) => {
    const text = children.map(child => child.text).join('');

    if (!text.startsWith(startChar) || !text.endsWith(endChar)) {
        return children;
    }

    const nextChildren = children.map(child => ({...child}));

    for (let i = 0; i < nextChildren.length; i += 1) {
        const value = nextChildren[i].text;

        if (value.length === 0) continue;

        nextChildren[i].text = value.slice(1);
        if (nextChildren[i].text.length === 0) {
            nextChildren.splice(i, 1);
        }

        break;
    }

    for (let i = nextChildren.length - 1; i >= 0; i -= 1) {
        const value = nextChildren[i].text;

        if (value.length === 0) continue;

        nextChildren[i].text = value.slice(0, -1);
        if (nextChildren[i].text.length === 0) {
            nextChildren.splice(i, 1);
        }

        break;
    }

    return nextChildren.length > 0 ? nextChildren : [{text: ''}];
};

export const applyBlockTypeChange = (
    editor: PlateEditor,
    element: FountainBlockTypeChangeTarget,
    path: Path,
    nextType: FountainElementType,
) => {
    if (
        element.type === ELEMENT_DUAL_DIALOGUE_CHARACTER
    && nextType === ELEMENT_CHARACTER
    ) {
        convertDualCharacterToCharacter(editor, path);

        return;
    }

    if (
        element.type === ELEMENT_CHARACTER
    && nextType === ELEMENT_DUAL_DIALOGUE_CHARACTER
    ) {
        convertCharacterToDual(editor, path);

        const point = editor.api.start(path);

        editor.tf.select(point);

        return;
    }

    const nextChildren =
    nextType === ELEMENT_PARENTHETICAL
        ? stripOuterCharactersFromChildren(element.children, '(', ')')
        : element.children;

    editor.tf.replaceNodes(
        {
            ...element,
            type: nextType,
            children: nextChildren,
        },
        {at: path, select: true},
    );
    if (nextType === ELEMENT_CHARACTER) {
        removeEmptyBlocksAfterCharacter(editor, path);
    }
};

export const convertDualCharacterToCharacter = (
    editor: PlateEditor,
    path: Path,
) => {
    const columnGroupEntry = editor.api.above({
        at: path,
        match: node => typeof node === 'object' &&
      node !== null &&
      'type' in node &&
      node.type === ELEMENT_COLUMN_GROUP,
    });

    if (columnGroupEntry) {
        const [groupNode, groupPath] = columnGroupEntry as [ColumnGroupElement, Path];
        const columns = groupNode.children ?? [];
        const leftChildren = columns[0]?.children ?? [];
        const columnIndex = path[groupPath.length];
        const childIndex = path[groupPath.length + 1] ?? 0;
        const flatIndex =
      columnIndex === 1 ? leftChildren.length + childIndex : childIndex;
        const baseIndex = groupPath[groupPath.length - 1];
        const parentPath = groupPath.slice(0, -1);
        const targetPath = parentPath.concat(baseIndex + flatIndex);

        editor.tf.withoutNormalizing(() => {
            editor.tf.setNodes(
                {type: ELEMENT_CHARACTER},
                {
                    at: groupPath,
                    match: node => typeof node === 'object' &&
            node !== null &&
            'type' in node &&
            node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER,
                },
            );
            editor.tf.setNodes(
                {type: ELEMENT_DIALOGUE},
                {
                    at: groupPath,
                    match: node => typeof node === 'object' &&
            node !== null &&
            'type' in node &&
            node.type === ELEMENT_DUAL_DIALOGUE,
                },
            );
            editor.tf.unwrapNodes({
                at: groupPath,
                match: node => typeof node === 'object' &&
          node !== null &&
          'type' in node &&
          node.type === ELEMENT_COLUMN,
            });
            editor.tf.unwrapNodes({
                at: groupPath,
                match: node => typeof node === 'object' &&
          node !== null &&
          'type' in node &&
          node.type === ELEMENT_COLUMN_GROUP,
            });
        });

        const nextEntry = editor.api.node(targetPath);
        const fallbackEntry = nextEntry ? nextEntry : editor.api.node(groupPath);

        if (fallbackEntry) {
            const [nextNode, nextPath] = fallbackEntry;

            if (
                typeof nextNode === 'object' &&
        nextNode !== null &&
        'type' in nextNode &&
        nextNode.type === ELEMENT_CHARACTER
            ) {
                removeEmptyBlocksAfterCharacter(editor, nextPath);
            }

            const point = editor.api.start(nextPath);

            editor.tf.select(point);
            editor.tf.collapse({edge: 'start'});
        }

        return;
    }

    const entry = editor.api.node(path);

    if (!entry) return;

    const [node] = entry;
    const type = getNodeType(node);

    if (type !== ELEMENT_DUAL_DIALOGUE_CHARACTER) return;

    editor.tf.setNodes({type: ELEMENT_CHARACTER}, {at: path});

    let current = Path.next(path);

    while (true) {
        const nextEntry = editor.api.node(current);

        if (!nextEntry) break;

        const nextType = getNodeType(nextEntry[0]);

        if (nextType === ELEMENT_DUAL_DIALOGUE) {
            editor.tf.setNodes({type: ELEMENT_DIALOGUE}, {at: current});
            current = Path.next(current);
            continue;
        }

        if (nextType === ELEMENT_DIALOGUE || nextType === ELEMENT_PARENTHETICAL) {
            current = Path.next(current);
            continue;
        }

        break;
    }
};

export const convertCharacterToDual = (editor: PlateEditor, path: Path) => {
    const columnGroupEntry = editor.api.above({
        at: path,
        match: node => typeof node === 'object' &&
      node !== null &&
      'type' in node &&
      node.type === ELEMENT_COLUMN_GROUP,
    });

    if (columnGroupEntry) {
        editor.tf.setNodes({type: ELEMENT_DUAL_DIALOGUE_CHARACTER}, {at: path});

        return;
    }

    const entry = editor.api.node(path);

    if (!entry) return;

    const [node] = entry;
    const type = getNodeType(node);

    if (type !== ELEMENT_CHARACTER) return;

    const sectionStart = getSectionStartPath(editor, path);
    const sectionPaths: Path[] = [];
    let current = sectionStart;

    while (true) {
        const nextEntry = editor.api.node(current);

        if (!nextEntry) break;

        const nextNode = nextEntry[0];
        const nextType = getNodeType(nextNode);

        if (isIgnorableNode(nextNode)) {
            if (!isIgnorableWithinDialogueSection(editor, current)) {
                break;
            }

            sectionPaths.push(current);
            current = Path.next(current);
            continue;
        }

        if (!isDialogueSectionType(nextType)) {
            break;
        }

        sectionPaths.push(current);
        current = Path.next(current);
    }

    if (sectionPaths.length === 0) {
        editor.tf.setNodes({type: ELEMENT_DUAL_DIALOGUE_CHARACTER}, {at: path});

        return;
    }

    const leftNodes: FountainElement[] = [];
    const rightNodes: FountainElement[] = [];

    for (const sectionPath of sectionPaths) {
        const sectionEntry = editor.api.node(sectionPath);

        if (!sectionEntry) continue;

        const [sectionNode] = sectionEntry;

        if (isIgnorableNode(sectionNode)) {
            continue;
        }

        const element = sectionNode as FountainElement;
        const isRight = Path.compare(sectionPath, path) >= 0;
        const nextElement: FountainElement =
      Path.equals(sectionPath, path)
          ? {...element, type: ELEMENT_DUAL_DIALOGUE_CHARACTER}
          : element;

        if (isRight) {
            rightNodes.push(nextElement);
        } else {
            leftNodes.push(nextElement);
        }
    }

    const columnGroup: ColumnGroupElement = {
        type: ELEMENT_COLUMN_GROUP,
        children: [
            {
                type: ELEMENT_COLUMN,
                width: '50%',
                children: leftNodes,
            } as ColumnElement, {
                type: ELEMENT_COLUMN,
                width: '50%',
                children: rightNodes,
            } as ColumnElement,
        ],
    };

    const sectionIndex = sectionStart[sectionStart.length - 1];
    const parentPath = sectionStart.slice(0, -1);
    const groupPath = parentPath.concat(sectionIndex);

    editor.tf.withoutNormalizing(() => {
        for (let i = sectionPaths.length - 1; i >= 0; i -= 1) {
            editor.tf.removeNodes({at: sectionPaths[i]});
        }

        editor.tf.insertNodes(columnGroup, {at: groupPath});
    });

    if (rightNodes.length > 0) {
        const point = editor.api.start(groupPath.concat([1, 0]));

        editor.tf.select(point);
    } else if (leftNodes.length > 0) {
        const point = editor.api.start(groupPath.concat([0, 0]));

        editor.tf.select(point);
    }
};

const dialogueSectionTypes = new Set<FountainElementType>([
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_PARENTHETICAL,
]);

const getNodeType = (node: unknown): FountainElementType | null => {
    if (!node || typeof node !== 'object') return null;

    if (!('type' in node)) return null;

    return (node as {type: FountainElementType}).type ?? null;
};

const getNodeText = (node: unknown) => {
    if (!node || typeof node !== 'object') return '';

    if (!('children' in node)) return '';

    const children = (node as {children?: Array<{text?: string}>}).children;

    if (!Array.isArray(children)) return '';

    return children.map(child => child.text ?? '').join('');
};

const isIgnorableNode = (node: unknown) => {
    const type = getNodeType(node);

    if (type !== ELEMENT_ACTION) return false;

    return getNodeText(node).trim().length === 0;
};

const isDialogueSectionType = (type: FountainElementType | null) => Boolean(type && dialogueSectionTypes.has(type));

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

const isIgnorableWithinDialogueSection = (
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

const getSectionStartPath = (editor: PlateEditor, path: Path) => {
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

export const getDualColumnPlacement = (editor: PlateEditor, path: Path) => {
    const entry = editor.api.node(path);

    if (!entry) return {column: 'full' as const};

    const [node] = entry;
    const type = getNodeType(node);

    if (type === ELEMENT_ACTION) {
        if (node && isIgnorableNode(node) && isIgnorableWithinDialogueSection(editor, path)) {
            const sectionStart = getSectionStartPath(editor, path);

            if (sectionHasDualCharacter(editor, sectionStart)) {
                return {column: 'hidden' as const};
            }
        }

        return {column: 'full' as const};
    }

    if (!isDialogueSectionType(type)) {
        return {column: 'full' as const};
    }

    const sectionStart = getSectionStartPath(editor, path);
    const hasDual = sectionHasDualCharacter(editor, sectionStart);

    if (!hasDual) {
        return {column: 'full' as const};
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
                    return {column: 'hidden' as const};
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

    return {column: 'full' as const};
};
