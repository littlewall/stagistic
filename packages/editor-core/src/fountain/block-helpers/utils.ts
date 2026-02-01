import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    type FountainElementType,
} from '../types';

const dialogueSectionTypes = new Set<FountainElementType>([
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_PARENTHETICAL,
]);

export const getNodeType = (node: unknown): FountainElementType | null => {
    if (!node || typeof node !== 'object') return null;

    if (!('type' in node)) return null;

    return (node as {type: FountainElementType}).type ?? null;
};

export const getNodeText = (node: unknown) => {
    if (!node || typeof node !== 'object') return '';

    if (!('children' in node)) return '';

    const children = (node as {children?: Array<{text?: string}>}).children;

    if (!Array.isArray(children)) return '';

    return children.map(child => child.text ?? '').join('');
};

export const getElementText = (node: unknown) => getNodeText(node);

export const isIgnorableNode = (node: unknown) => {
    const type = getNodeType(node);

    if (type !== ELEMENT_ACTION) return false;

    return getNodeText(node).trim().length === 0;
};

export const isDialogueSectionType = (type: FountainElementType | null) => Boolean(type && dialogueSectionTypes.has(type));
