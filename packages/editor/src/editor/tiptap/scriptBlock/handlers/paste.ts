import {
    Fragment,
    Slice,
} from '@tiptap/pm/model';
import type {Editor} from '@tiptap/react';

import {
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../scriptCore';
import {
    type BlockContext,
    createBlockContext,
} from '../context';
import {type HandlerMap} from './types';

const STRUCTURED_SCRIPT_HTML_PATTERN = /<p\b[^>]*\b(?:blocktype|data-block-type)\s*=/i;

const textNormalizerByType: HandlerMap<(text: string) => string> = {
    ['act']: text => text.toLocaleUpperCase(),
    ['aside']: text => text.replace(/[()]/g, ''),
};

const normalizePastedText = (blockType: BlockContext['block']['blockType'], text: string) => {
    return textNormalizerByType[blockType]?.(text) ?? text;
};

const splitPastedTextLines = (text: string) => {
    const lines = text
        .replace(/\r\n?/g, '\n')
        .split('\n');

    while (lines.length > 1 && lines.at(-1)?.trim().length === 0) {
        lines.pop();
    }

    return lines;
};

const isExternalMultilinePaste = (event: ClipboardEvent) => {
    const clipboardData = event.clipboardData;

    if (!clipboardData) {
        return false;
    }

    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    return !STRUCTURED_SCRIPT_HTML_PATTERN.test(html) && (/[\r\n]/).test(text);
};

const pasteMultilineAsActiveBlockType = (
    context: BlockContext,
    event: ClipboardEvent,
) => {
    const text = event.clipboardData?.getData('text/plain');
    const blockNodeType = context.editor.schema.nodes[context.block.blockType];

    if (text === undefined || !blockNodeType) {
        return false;
    }

    const marks = context.editor.state.selection.$from.marks();
    const blocks = splitPastedTextLines(text)
        .map(line => {
            const normalized = normalizePastedText(context.block.blockType, line);
            const content = normalized ? context.editor.schema.text(normalized, marks) : undefined;

            return blockNodeType.create({blockType: context.block.blockType}, content);
        });
    const slice = new Slice(Fragment.fromArray(blocks), 1, 1);

    event.preventDefault();
    context.editor.view.dispatch(
        context.editor.state.tr.replaceSelection(slice).scrollIntoView(),
    );

    return true;
};

const pasteHandlers: HandlerMap<(context: BlockContext, event: ClipboardEvent) => boolean> = {
    ['act']: (context, event) => {
        const text = event.clipboardData?.getData('text/plain');

        if (text === undefined) {
            return false;
        }

        event.preventDefault();

        const normalized = text
            .replace(/\s*\n+\s*/g, ' ')
            .toLocaleUpperCase();

        context.editor.commands.insertContent(normalized);

        return true;
    },
    ['aside']: (context, event) => {
        const text = event.clipboardData?.getData('text/plain');

        if (text === undefined) {
            return false;
        }

        event.preventDefault();

        const sanitized = text
            .replace(/\s*\n+\s*/g, ' ')
            .replace(/[()]/g, '');

        context.editor.commands.insertContent(sanitized);

        return true;
    },
};

export const handlePaste = (editor: Editor, event: ClipboardEvent) => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    const context = createBlockContext(editor, block);

    if (isExternalMultilinePaste(event)) {
        return pasteMultilineAsActiveBlockType(context, event);
    }

    const handler = pasteHandlers[block.blockType];

    if (!handler) {
        return false;
    }

    return handler(context, event);
};

export const pasteHandlerMaps = {
    pasteHandlers,
};
