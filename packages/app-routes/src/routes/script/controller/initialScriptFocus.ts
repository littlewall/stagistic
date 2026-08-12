import {
    getScriptBlockNodeType,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

const getNodeTextContent = (node: ScriptNode): string => {
    const ownText = typeof node.text === 'string' ? node.text : '';
    const childText = node.content?.map(getNodeTextContent).join('') ?? '';

    return ownText + childText;
};

const isDefaultActHeading = (node: ScriptNode): boolean => {
    return getScriptBlockNodeType(node) === 'act'
        && getNodeTextContent(node).trim().toLocaleUpperCase() === 'ACT ONE';
};

export const shouldAutoFocusInitialScript = (value: ScriptDocument): boolean => {
    return value.content.every(node => {
        return isDefaultActHeading(node) || getNodeTextContent(node).trim().length === 0;
    });
};
