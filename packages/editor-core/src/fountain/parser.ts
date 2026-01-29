import {
    FountainNodeType,
    type FountainActionNode,
    type FountainBoneyardNode,
    type FountainBlockNode,
    type FountainCenteredNode,
    type FountainCharacterNode,
    type FountainDialogueBlockNode,
    type FountainDialogueNode,
    type FountainDualDialogueNode,
    type FountainLyricNode,
    type FountainNoteNode,
    type FountainParentheticalNode,
    type FountainPageBreakNode,
    type FountainSceneHeadingNode,
    type FountainSectionNode,
    type FountainSynopsisNode,
    type FountainTextNode,
    type FountainTitlePageFieldNode,
    type FountainTitlePageNode,
    type FountainTransitionNode,
} from './types';

const titlePageFieldPattern = /^([A-Za-z0-9][A-Za-z0-9 ]+):\s*(.*)$/;
const sceneHeadingPattern = /^(INT|EXT|EST|INT\/EXT|INT\.\/EXT)\b/i;
const transitionPattern = /TO:$/;

const createTextNode = (text: string): FountainTextNode => ({ text });

const createSimpleNode = <T extends { children: FountainTextNode[] }>(
    node: Omit<T, 'children'>,
    text: string
): T =>
    ({
        ...node,
        children: [createTextNode(text)],
    }) as T;

const isUpperCaseLine = (line: string) =>
    line.length > 0 && line === line.toUpperCase() && /[A-Z]/.test(line);

const stripSceneNumber = (line: string) => {
    const match = line.match(/\s+#([^#]+)#\s*$/);
    if (!match) {
        return { text: line.trim(), sceneNumber: undefined };
    }

    return {
        text: line.replace(match[0], '').trim(),
        sceneNumber: match[1].trim(),
    };
};

export const parseFountain = (source: string): FountainBlockNode[] => {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const nodes: FountainBlockNode[] = [];

    let index = 0;
    let inTitlePage = true;
    let currentDialogueBlock: FountainDialogueBlockNode | null = null;
    let pendingDualDialogue: FountainDualDialogueNode | null = null;
    let inBoneyard = false;
    let boneyardBuffer: string[] = [];

    const flushDialogueBlock = () => {
        if (!currentDialogueBlock) {
            return;
        }

        if (pendingDualDialogue) {
            pendingDualDialogue.children.push(currentDialogueBlock);
            nodes.push(pendingDualDialogue);
            pendingDualDialogue = null;
        } else {
            nodes.push(currentDialogueBlock);
        }

        currentDialogueBlock = null;
    };

    const pushDialogueChild = (
        node: FountainCharacterNode | FountainParentheticalNode | FountainDialogueNode | FountainLyricNode
    ) => {
        if (!currentDialogueBlock) {
            currentDialogueBlock = {
                type: FountainNodeType.dialogueBlock,
                children: [],
            };
        }
        currentDialogueBlock.children.push(node);
    };

    while (index < lines.length) {
        const rawLine = lines[index];
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        if (inBoneyard) {
            boneyardBuffer.push(rawLine);
            if (rawLine.includes('*/')) {
                nodes.push(
                    createSimpleNode<FountainBoneyardNode>(
                        { type: FountainNodeType.boneyard },
                        boneyardBuffer.join('\n')
                    )
                );
                boneyardBuffer = [];
                inBoneyard = false;
            }
            index += 1;
            continue;
        }

        if (trimmed.startsWith('/*')) {
            flushDialogueBlock();
            inBoneyard = true;
            boneyardBuffer = [rawLine];
            if (rawLine.includes('*/')) {
                nodes.push(
                    createSimpleNode<FountainBoneyardNode>(
                        { type: FountainNodeType.boneyard },
                        rawLine
                    )
                );
                boneyardBuffer = [];
                inBoneyard = false;
            }
            index += 1;
            continue;
        }

        if (inTitlePage) {
            if (trimmed.length === 0 && nodes.length > 0) {
                inTitlePage = false;
                index += 1;
                continue;
            }

            const fieldMatch = rawLine.match(titlePageFieldPattern);
            const lastNode = nodes[nodes.length - 1];
            if (fieldMatch) {
                const titlePageNode =
                    lastNode?.type === FountainNodeType.titlePage
                        ? (lastNode as FountainTitlePageNode)
                        : null;
                const fieldNode: FountainTitlePageFieldNode = {
                    type: FountainNodeType.titlePageField,
                    key: fieldMatch[1].trim(),
                    value: [fieldMatch[2].trim()].filter(Boolean),
                    children: [createTextNode(fieldMatch[2].trim())],
                };

                if (titlePageNode) {
                    titlePageNode.children.push(fieldNode);
                } else {
                    nodes.push({
                        type: FountainNodeType.titlePage,
                        children: [fieldNode],
                    });
                }

                index += 1;
                continue;
            }

            if (rawLine.startsWith('    ') || rawLine.startsWith('\t')) {
                const titlePageNode = nodes[nodes.length - 1];
                if (titlePageNode?.type === FountainNodeType.titlePage) {
                    const lastField = titlePageNode.children[titlePageNode.children.length - 1];
                    if (lastField) {
                        const continuation = rawLine.trim();
                        lastField.value.push(continuation);
                        lastField.children.push(createTextNode(continuation));
                        index += 1;
                        continue;
                    }
                }
            }
        }

        if (trimmed.length === 0) {
            flushDialogueBlock();
            inTitlePage = false;
            index += 1;
            continue;
        }

        inTitlePage = false;

        if (trimmed === '===') {
            flushDialogueBlock();
            nodes.push(
                createSimpleNode<FountainPageBreakNode>({ type: FountainNodeType.pageBreak }, '')
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
            flushDialogueBlock();
            nodes.push(
                createSimpleNode<FountainNoteNode>(
                    { type: FountainNodeType.note },
                    trimmed.slice(2, -2).trim()
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('#')) {
            flushDialogueBlock();
            const level = trimmed.match(/^#+/)?.[0].length ?? 1;
            const text = trimmed.replace(/^#+\s*/, '');
            nodes.push(
                createSimpleNode<FountainSectionNode>(
                    { type: FountainNodeType.section, level },
                    text
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('=')) {
            flushDialogueBlock();
            const text = trimmed.replace(/^=+\s*/, '');
            nodes.push(
                createSimpleNode<FountainSynopsisNode>(
                    { type: FountainNodeType.synopsis },
                    text
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('>') && trimmed.endsWith('<')) {
            flushDialogueBlock();
            nodes.push(
                createSimpleNode<FountainCenteredNode>(
                    { type: FountainNodeType.centered },
                    trimmed.slice(1, -1).trim()
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('>')) {
            flushDialogueBlock();
            nodes.push(
                createSimpleNode<FountainTransitionNode>(
                    { type: FountainNodeType.transition, forced: true },
                    trimmed.slice(1).trim()
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('.') || sceneHeadingPattern.test(trimmed)) {
            flushDialogueBlock();
            const forced = trimmed.startsWith('.');
            const sceneLine = forced ? trimmed.slice(1).trim() : trimmed;
            const { text, sceneNumber } = stripSceneNumber(sceneLine);
            nodes.push(
                createSimpleNode<FountainSceneHeadingNode>(
                    { type: FountainNodeType.sceneHeading, forced, sceneNumber },
                    text
                )
            );
            index += 1;
            continue;
        }

        if (transitionPattern.test(trimmed) && isUpperCaseLine(trimmed)) {
            flushDialogueBlock();
            nodes.push(
                createSimpleNode<FountainTransitionNode>(
                    { type: FountainNodeType.transition },
                    trimmed
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('!')) {
            flushDialogueBlock();
            nodes.push(
                createSimpleNode<FountainActionNode>(
                    { type: FountainNodeType.action, forced: true },
                    trimmed.slice(1).trim()
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('~')) {
            flushDialogueBlock();
            nodes.push(
                createSimpleNode<FountainLyricNode>(
                    { type: FountainNodeType.lyric },
                    trimmed.slice(1).trim()
                )
            );
            index += 1;
            continue;
        }

        if (trimmed.startsWith('@') || isUpperCaseLine(trimmed)) {
            flushDialogueBlock();
            const forced = trimmed.startsWith('@');
            const characterText = forced ? trimmed.slice(1).trim() : trimmed;
            const isDual = characterText.endsWith('^');
            const character = characterText.replace(/\^$/, '').trim();
            const characterNode = createSimpleNode<FountainCharacterNode>(
                { type: FountainNodeType.character, forced, dual: isDual },
                character
            );

            currentDialogueBlock = {
                type: FountainNodeType.dialogueBlock,
                children: [characterNode],
            };

            if (isDual) {
                const previousNode = nodes[nodes.length - 1];
                if (previousNode?.type === FountainNodeType.dialogueBlock) {
                    pendingDualDialogue = {
                        type: FountainNodeType.dualDialogue,
                        children: [previousNode as FountainDialogueBlockNode],
                    };
                    nodes.pop();
                }
            }

            index += 1;
            continue;
        }

        if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            pushDialogueChild(
                createSimpleNode<FountainParentheticalNode>(
                    { type: FountainNodeType.parenthetical },
                    trimmed
                )
            );
            index += 1;
            continue;
        }

        if (currentDialogueBlock) {
            pushDialogueChild(
                createSimpleNode<FountainDialogueNode>(
                    { type: FountainNodeType.dialogue },
                    rawLine
                )
            );
            index += 1;
            continue;
        }

        nodes.push(
            createSimpleNode<FountainActionNode>({ type: FountainNodeType.action }, rawLine)
        );
        index += 1;
    }

    flushDialogueBlock();

    return nodes;
};
