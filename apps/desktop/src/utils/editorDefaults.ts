import {ELEMENT_SCENE_HEADING} from '@stagistic/editor-core';
import {
    createNodeId,
    type SlateValue,
} from '@stagistic/shared';

const hasTextContent = (node: unknown): boolean => {
    if (!node) {
        return false;
    }

    if (typeof node === 'string') {
        return node.trim().length > 0;
    }

    if (Array.isArray(node)) {
        return node.some(hasTextContent);
    }

    if (typeof node === 'object') {
        const maybeText = (node as {text?: unknown}).text;
        if (typeof maybeText === 'string' && maybeText.trim().length > 0) {
            return true;
        }

        const children = (node as {children?: unknown}).children;
        if (Array.isArray(children)) {
            return children.some(hasTextContent);
        }
    }

    return false;
};

export const isSlateValueEmpty = (value?: SlateValue | null) => {
    if (!value || !Array.isArray(value) || value.length === 0) {
        return true;
    }

    return !value.some(hasTextContent);
};

const isElementNode = (node: unknown): node is {children: unknown[], id?: string} => (
    typeof node === 'object'
    && node !== null
    && Array.isArray((node as {children?: unknown}).children)
);

export const ensureNodeIds = (value: SlateValue): SlateValue => {
    const assignIds = (node: unknown): unknown => {
        if (Array.isArray(node)) {
            return node.map(assignIds);
        }

        if (isElementNode(node)) {
            const next = {
                ...node,
                id: node.id ?? createNodeId(),
            };

            next.children = next.children.map(assignIds);

            return next;
        }

        return node;
    };

    return assignIds(value) as SlateValue;
};

export const getFirstBlockId = (value?: SlateValue | null) => {
    if (!value || !Array.isArray(value) || value.length === 0) {
        return null;
    }

    const first = value[0] as {id?: string} | undefined;

    return typeof first?.id === 'string' ? first.id : null;
};

export const valueHasBlockId = (value: SlateValue, blockId: string) => {
    let found = false;

    const visit = (node: unknown) => {
        if (found) {
            return;
        }

        if (Array.isArray(node)) {
            node.forEach(visit);

            return;
        }

        if (isElementNode(node)) {
            if (node.id === blockId) {
                found = true;

                return;
            }

            node.children.forEach(visit);
        }
    };

    visit(value);

    return found;
};

export const ensureSceneHeading = (
    value?: SlateValue | null,
    options?: {activeBlockId?: string | null},
): SlateValue => {
    if (isSlateValueEmpty(value)) {
        return [
            {
                id: options?.activeBlockId ?? createNodeId(),
                type: ELEMENT_SCENE_HEADING,
                children: [{text: ''}],
            },
        ];
    }

    return value as SlateValue;
};
