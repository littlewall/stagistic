/*
 * Phase 0 spike harness: a headless TipTap editor with the script schema
 * (blocks + marks, no React node views), optionally bound to a Y.Doc via
 * `@tiptap/extension-collaboration` in place of History.
 */
import {DocumentWithSettings} from '@stagistic/editor/src/editor/tiptap/extensions/DocumentExtension';
import {CharacterTagMark, CommentAnchorMark} from '@stagistic/editor/src/editor/tiptap/marks';
import {ScriptBlockNodes} from '@stagistic/editor/src/editor/tiptap/nodes';
import {SCRIPT_BLOCK_NODE_NAMES} from '@stagistic/editor/src/editor/tiptap/scriptCore';
import type {ScriptDocument} from '@stagistic/script';
import {createNodeId} from '@stagistic/shared';
import {Editor, type Extensions} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Collaboration from '@tiptap/extension-collaboration';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import UniqueID from '@tiptap/extension-unique-id';
import type * as Y from 'yjs';

import {BODY_FIELD} from '../ydoc/bodyCodec';

export const scriptExtensions = (extra: Extensions = []): Extensions => [
    DocumentWithSettings,
    Text,
    Bold,
    Italic,
    Underline,
    CharacterTagMark,
    CommentAnchorMark,
    ...ScriptBlockNodes,
    UniqueID.configure({
        types: [...SCRIPT_BLOCK_NODE_NAMES],
        attributeName: 'id',
        generateID: () => createNodeId(),
    }),
    ...extra,
];

export const createCollabEditor = (doc: Y.Doc, extra: Extensions = []) => {
    const element = document.createElement('div');

    document.body.append(element);

    return new Editor({
        element,
        extensions: scriptExtensions([Collaboration.configure({document: doc, field: BODY_FIELD}), ...extra]),
    });
};

/** Editor-normalized JSON (schema defaults filled in), as the app would store it. */
export const normalizeWithEditor = (document: ScriptDocument): ScriptDocument => {
    const editor = new Editor({extensions: scriptExtensions(), content: document});
    const json = editor.getJSON() as ScriptDocument;

    editor.destroy();

    return json;
};

export const blockIds = (document: ScriptDocument) => document.content.map(node => node.attrs?.id as string);
