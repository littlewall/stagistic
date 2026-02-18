import {
    ELEMENT_ACT,
    type FountainJSONContent,
    normalizeScriptStructure,
    type ScriptDocument,
} from '@stagistic/script-core';
import type {Editor as TiptapEditor} from '@tiptap/react';
import type {MutableRefObject} from 'react';

import {stripScriptSettings} from '../editorSettings';
import {FOUNTAIN_BLOCK_NODE_NAME} from '../tiptap/fountainCore';

export const setPlainTextContent = (
    nodes: FountainJSONContent[] | undefined,
    blockId: string,
    nextName: string,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!node || typeof node !== 'object') {
            return node;
        }

        if (
            node.type === FOUNTAIN_BLOCK_NODE_NAME
            && node.attrs?.id === blockId
            && node.attrs?.blockType === ELEMENT_ACT
        ) {
            const currentText = (node.content ?? [])
                .map(child => {
                    return typeof child.text === 'string' ? child.text : '';
                })
                .join('');
            const normalizedName = nextName.trim().toLocaleUpperCase();

            if (currentText.trim() === normalizedName) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: normalizedName.length > 0 ? [
                    {
                        type: 'text',
                        text: normalizedName,
                    },
                ] : [],
            };
        }

        const [nextContent, childChanged] = setPlainTextContent(node.content, blockId, nextName);

        if (!childChanged) {
            return node;
        }

        didChange = true;

        return {
            ...node,
            content: nextContent,
        };
    });

    return [didChange ? nextNodes : nodes, didChange];
};

export const removeActBlockById = (
    nodes: FountainJSONContent[] | undefined,
    blockId: string,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didChange = false;
    const nextNodes: FountainJSONContent[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            node.type === FOUNTAIN_BLOCK_NODE_NAME
            && node.attrs?.id === blockId
            && node.attrs?.blockType === ELEMENT_ACT
        ) {
            didChange = true;

            return;
        }

        const [nextContent, childChanged] = removeActBlockById(node.content, blockId);

        if (!childChanged) {
            nextNodes.push(node);

            return;
        }

        didChange = true;
        nextNodes.push({
            ...node,
            content: nextContent,
        });
    });

    return [didChange ? nextNodes : nodes, didChange];
};

export const insertActBlockBeforeId = (
    nodes: FountainJSONContent[] | undefined,
    beforeBlockId: string,
    actNode: FountainJSONContent,
): [FountainJSONContent[] | undefined, boolean] => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [nodes, false];
    }

    let didInsert = false;
    const nextNodes: FountainJSONContent[] = [];

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') {
            nextNodes.push(node);

            return;
        }

        if (
            !didInsert
            && node.type === FOUNTAIN_BLOCK_NODE_NAME
            && node.attrs?.id === beforeBlockId
        ) {
            nextNodes.push(actNode, node);
            didInsert = true;

            return;
        }

        if (!didInsert && Array.isArray(node.content)) {
            const [nextContent, childInserted] = insertActBlockBeforeId(
                node.content,
                beforeBlockId,
                actNode,
            );

            if (childInserted) {
                nextNodes.push({
                    ...node,
                    content: nextContent,
                });
                didInsert = true;

                return;
            }
        }

        nextNodes.push(node);
    });

    return [didInsert ? nextNodes : nodes, didInsert];
};

const commitDocument = (
    editor: TiptapEditor,
    nextContent: FountainJSONContent[],
    setLatestValue: (value: ScriptDocument) => void,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument) => void) | undefined>,
    scheduleAutosave: (value: ScriptDocument) => void,
) => {
    const currentValue = editor.getJSON() as ScriptDocument;
    const nextStructure = normalizeScriptStructure(currentValue.attrs?.structure, {
        content: nextContent,
    });
    const nextDocument: ScriptDocument = {
        ...currentValue,
        content: nextContent,
        attrs: {
            ...currentValue.attrs,
            structure: nextStructure,
        },
    };

    editor.commands.setContent(nextDocument, {emitUpdate: false});
    editor.view.dispatch(
        editor.state.tr
            .setDocAttribute('structure', nextStructure)
            .setDocAttribute('settings', currentValue.attrs?.settings ?? null)
            .setMeta('preventUpdate', true),
    );

    const savedValue = stripScriptSettings(nextDocument);

    setLatestValue(savedValue);
    onValueChangeRef.current?.(savedValue);
    scheduleAutosave(savedValue);
};

export const tryCommitDocument = (
    editor: TiptapEditor,
    nextContent: FountainJSONContent[] | undefined,
    didChange: boolean,
    setLatestValue: (value: ScriptDocument) => void,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument) => void) | undefined>,
    scheduleAutosave: (value: ScriptDocument) => void,
) => {
    if (!didChange || !Array.isArray(nextContent)) {
        return;
    }

    commitDocument(editor, nextContent, setLatestValue, onValueChangeRef, scheduleAutosave);
};
