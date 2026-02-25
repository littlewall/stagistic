import {
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
    type FountainJSONContent,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
} from '../document';
import {
    ELEMENT_SCENE_HEADING,
    type FountainElementType,
} from '../fountain';

export type StructureBlockEntry = {
    id: string,
    blockType: FountainElementType,
    text: string,
    index: number,
    sceneIndex: number,
};

const getNodeTextContent = (node: FountainJSONContent): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.map(getNodeTextContent).join('');
};

const collectBlocks = (nodes: FountainJSONContent[] | undefined): FountainJSONContent[] => {
    const blocks: FountainJSONContent[] = [];

    const walk = (nodeList?: FountainJSONContent[]) => {
        if (!Array.isArray(nodeList)) {
            return;
        }

        for (const node of nodeList) {
            if (!node || typeof node !== 'object') {
                continue;
            }

            if (node.type === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
                const columns = Array.isArray(node.content) ? node.content : [];

                if (columns[0]?.type === FOUNTAIN_COLUMN_NODE_NAME) {
                    walk(columns[0].content);
                }

                if (columns[1]?.type === FOUNTAIN_COLUMN_NODE_NAME) {
                    walk(columns[1].content);
                }

                continue;
            }

            if (node.type === FOUNTAIN_COLUMN_NODE_NAME) {
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

export const collectStructureBlocks = (nodes: FountainJSONContent[] | undefined): StructureBlockEntry[] => {
    const blocks = collectBlocks(nodes);
    let currentSceneIndex = -1;

    return blocks.map((block, index) => {
        const blockType = getScriptBlockLegacyType(block);

        if (blockType === ELEMENT_SCENE_HEADING) {
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
