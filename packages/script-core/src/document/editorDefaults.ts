import {createNodeId} from '../nodeId';
import {normalizeScriptStructure} from '../structure';
import {
    createEmptyScriptDocument,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainJSONContent,
    type ScriptDocument,
} from './scriptDocument';

const hasTextContent = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') {
        return false;
    }

    const maybeText = (node as {text?: unknown}).text;

    if (typeof maybeText === 'string' && maybeText.trim().length > 0) {
        return true;
    }

    const content = (node as {content?: unknown}).content;

    if (Array.isArray(content)) {
        return content.some(hasTextContent);
    }

    return false;
};

export const isScriptDocumentEmpty = (value?: ScriptDocument | null) => {
    if (!value || value.type !== 'doc' || !Array.isArray(value.content) || value.content.length === 0) {
        return true;
    }

    return !value.content.some(hasTextContent);
};

const ensureNodeIds = (node: FountainJSONContent): [FountainJSONContent, boolean] => {
    let changed = false;
    let nextNode = node;

    if (node.type === FOUNTAIN_BLOCK_NODE_NAME) {
        const attrs = node.attrs && typeof node.attrs === 'object' ? node.attrs : {};
        const id = attrs.id;

        if (typeof id !== 'string' || id.length === 0) {
            nextNode = {
                ...nextNode,
                attrs: {
                    ...attrs,
                    id: createNodeId(),
                },
            };
            changed = true;
        }
    }

    if (Array.isArray(node.content)) {
        let contentChanged = false;
        const nextContent = node.content.map(child => {
            const [nextChild, childChanged] = ensureNodeIds(child);

            if (childChanged) {
                contentChanged = true;
            }

            return nextChild;
        });

        if (contentChanged) {
            nextNode = {
                ...nextNode,
                content: nextContent,
            };
            changed = true;
        }
    }

    return [nextNode, changed];
};

export const ensureFountainBlockIds = (value: ScriptDocument): ScriptDocument => {
    if (!value || value.type !== 'doc') {
        return createEmptyScriptDocument();
    }

    let changed = false;
    const nextContent = value.content.map(node => {
        const [nextNode, nodeChanged] = ensureNodeIds(node);

        if (nodeChanged) {
            changed = true;
        }

        return nextNode;
    });

    if (!changed) {
        return value;
    }

    return {
        ...value,
        content: nextContent,
    };
};

const findFirstBlockId = (node: FountainJSONContent): string | null => {
    if (node.type === FOUNTAIN_BLOCK_NODE_NAME) {
        const id = node.attrs?.id;

        if (typeof id === 'string' && id.length > 0) {
            return id;
        }
    }

    if (Array.isArray(node.content)) {
        for (const child of node.content) {
            const next = findFirstBlockId(child);

            if (next) {
                return next;
            }
        }
    }

    return null;
};

export const getFirstBlockId = (value?: ScriptDocument | null) => {
    if (!value || value.type !== 'doc' || !Array.isArray(value.content)) {
        return null;
    }

    for (const node of value.content) {
        const id = findFirstBlockId(node);

        if (id) {
            return id;
        }
    }

    return null;
};

const hasBlockId = (node: FountainJSONContent, blockId: string): boolean => {
    if (node.type === FOUNTAIN_BLOCK_NODE_NAME) {
        return node.attrs?.id === blockId;
    }

    if (Array.isArray(node.content)) {
        return node.content.some(child => hasBlockId(child, blockId));
    }

    return false;
};

export const valueHasBlockId = (value: ScriptDocument, blockId: string) => {
    if (!value || value.type !== 'doc' || !Array.isArray(value.content)) {
        return false;
    }

    return value.content.some(node => hasBlockId(node, blockId));
};

export const ensureSceneHeading = (
    value?: ScriptDocument | null,
    options?: {activeBlockId?: string | null},
): ScriptDocument => {
    if (isScriptDocumentEmpty(value)) {
        return createEmptyScriptDocument(
            options?.activeBlockId ?? createNodeId(),
            value?.attrs?.settings,
        );
    }

    return value as ScriptDocument;
};

export const ensureScriptStructure = (
    value: ScriptDocument,
): ScriptDocument => {
    const normalizedStructure = normalizeScriptStructure(value.attrs?.structure, {
        content: value.content,
    });

    return {
        ...value,
        attrs: {
            ...value.attrs,
            structure: normalizedStructure,
        },
    };
};
