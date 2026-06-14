import {
    COLUMN_GROUP_NODE_NAME,
    COLUMN_NODE_NAME,
    getScriptBlockId,
    getScriptBlockNodeType,
    isScriptBlockNode,
    type ScriptNode,
} from '../document';
import type {ScriptBlockNodeType} from '../syntax';

export type StructureBlockEntry = {
    id: string,
    blockType: ScriptBlockNodeType,
    text: string,
    index: number,
    sceneIndex: number,
};

const getNodeTextContent = (node: ScriptNode): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.map(getNodeTextContent).join('');
};

const collectBlocks = (nodes: ScriptNode[] | undefined): ScriptNode[] => {
    const blocks: ScriptNode[] = [];

    const walk = (nodeList?: ScriptNode[]) => {
        if (!Array.isArray(nodeList)) {
            return;
        }

        for (const node of nodeList) {
            if (!node || typeof node !== 'object') {
                continue;
            }

            if (node.type === COLUMN_GROUP_NODE_NAME) {
                const columns = Array.isArray(node.content) ? node.content : [];

                if (columns[0]?.type === COLUMN_NODE_NAME) {
                    walk(columns[0].content);
                }

                if (columns[1]?.type === COLUMN_NODE_NAME) {
                    walk(columns[1].content);
                }

                continue;
            }

            if (node.type === COLUMN_NODE_NAME) {
                walk(node.content);
                continue;
            }

            if (isScriptBlockNode(node)) {
                blocks.push(node);
                continue;
            }

            walk(node.content);
        }
    };

    walk(nodes);

    return blocks;
};

export const collectStructureBlocks = (nodes: ScriptNode[] | undefined): StructureBlockEntry[] => {
    const blocks = collectBlocks(nodes);
    let currentSceneIndex = -1;

    return blocks.map((block, index) => {
        const blockType = getScriptBlockNodeType(block);

        if (blockType === 'scene') {
            currentSceneIndex += 1;
        }

        const id = getScriptBlockId(block) ?? '';

        return {
            id,
            blockType,
            text: getNodeTextContent(block).trim(),
            index,
            sceneIndex: currentSceneIndex,
        };
    });
};
