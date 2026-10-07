import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import * as buf from 'lib0/buffer';
import * as sha256 from 'lib0/hash/sha256';
import * as Y from 'yjs';

/*
 * Schema-less ScriptDocument JSON <-> Y.XmlFragment codec.
 *
 * Mirrors the representation of `@tiptap/y-tiptap` (the binding used by
 * `@tiptap/extension-collaboration`) so the engine can read/write body docs in
 * the PGlite worker without loading the editor schema:
 * - element: Y.XmlElement(nodeName = node.type), non-null attrs as attributes
 * - consecutive text nodes: one Y.XmlText, marks as delta attributes
 * - overlapping marks (`excludes: ''`) are keyed `${name}--${hash}`
 *
 * Input JSON must come from the editor (`getJSON`), so attrs already carry
 * schema defaults and mark hashes match the binding's.
 */

export const BODY_FIELD = 'body';

/** Marks declared with `excludes: ''` in the editor schema. */
export const OVERLAPPING_MARK_NAMES: ReadonlySet<string> = new Set(['characterTag', 'commentAnchor']);

type ScriptMark = NonNullable<ScriptNode['marks']>[number];

type TextDeltaOp = {insert: string, attributes?: Record<string, Record<string, unknown>>};

const convolute = (digest: Uint8Array) => {
    const size = 6;

    for (let index = size; index < digest.length; index++) {
        digest[index % size] = digest[index % size] ^ digest[index];
    }

    return digest.slice(0, size);
};

const hashOfJSON = (json: unknown) => buf.toBase64(convolute(sha256.digest(buf.encodeAny(json))));

const markToJSON = (mark: ScriptMark) => {
    const json: {type: string, attrs?: Record<string, unknown>} = {type: mark.type};

    if (mark.attrs && Object.keys(mark.attrs).length > 0) {
        json.attrs = mark.attrs;
    }

    return json;
};

const marksToAttributes = (marks: ScriptNode['marks']) => {
    const attributes: Record<string, unknown> = {};

    for (const mark of marks ?? []) {
        const key = OVERLAPPING_MARK_NAMES.has(mark.type) ? `${mark.type}--${hashOfJSON(markToJSON(mark))}` : mark.type;

        attributes[key] = mark.attrs ?? {};
    }

    return attributes;
};

const hashedMarkNameRegex = /(.*)(--[a-zA-Z0-9+/=]{8})$/;
const attributeToMarkName = (attributeName: string) => hashedMarkNameRegex.exec(attributeName)?.[1] ?? attributeName;

const createXmlText = (nodes: ScriptNode[]) => {
    const text = new Y.XmlText();

    text.applyDelta(nodes.map(node => ({
        insert: node.text ?? '',
        attributes: marksToAttributes(node.marks),
    })));

    return text;
};

const createXmlElement = (node: ScriptNode): Y.XmlElement => {
    const element = new Y.XmlElement(node.type ?? 'paragraph');

    for (const [key, value] of Object.entries(node.attrs ?? {})) {
        if (value !== null && value !== undefined && key !== 'ychange') {
            element.setAttribute(key, value as string);
        }
    }

    element.insert(0, jsonNodesToYXml(node.content ?? []));

    return element;
};

/** Converts PM JSON children into Y types (text runs merged like y-tiptap). */
export const jsonNodesToYXml = (nodes: ScriptNode[]): Array<Y.XmlElement | Y.XmlText> => {
    const result: Array<Y.XmlElement | Y.XmlText> = [];

    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];

        if (node.type !== 'text') {
            result.push(createXmlElement(node));
            continue;
        }

        const run: ScriptNode[] = [];

        while (index < nodes.length && nodes[index].type === 'text') {
            run.push(nodes[index]);
            index++;
        }

        index--;
        result.push(createXmlText(run));
    }

    return result;
};

const serializeXml = (item: Y.XmlElement | Y.XmlText | Y.XmlHook): ScriptNode | ScriptNode[] => {
    if (item instanceof Y.XmlText) {
        return (item.toDelta() as TextDeltaOp[]).map(op => {
            const node: ScriptNode = {type: 'text', text: op.insert};

            if (op.attributes) {
                node.marks = Object.entries(op.attributes).map(([key, attrs]) => ({
                    type: attributeToMarkName(key),
                    ...attrs && Object.keys(attrs).length > 0 ? {attrs} : {},
                }));
            }

            return node;
        });
    }

    if (item instanceof Y.XmlElement) {
        const node: ScriptNode = {type: item.nodeName};
        const attrs = item.getAttributes();

        if (Object.keys(attrs).length > 0) {
            node.attrs = attrs;
        }

        const children = item.toArray();

        if (children.length > 0) {
            node.content = children.flatMap(child => serializeXml(child as Y.XmlElement | Y.XmlText));
        }

        return node;
    }

    throw new Error('[sync-engine] unexpected Y type in body fragment');
};

export const getBodyFragment = (doc: Y.Doc) => doc.getXmlFragment(BODY_FIELD);

export const yFragmentToScriptDocument = (fragment: Y.XmlFragment): ScriptDocument => ({
    type: 'doc',
    content: fragment.toArray().flatMap(item => serializeXml(item as Y.XmlElement | Y.XmlText)),
});

export const bodyDocToScriptDocument = (doc: Y.Doc): ScriptDocument => yFragmentToScriptDocument(getBodyFragment(doc));

export const isBodyDocEmpty = (doc: Y.Doc) => getBodyFragment(doc).length === 0;

/**
 * Seeds an empty body doc from JSON. Throws on a non-empty doc: a Y.Doc is
 * created from JSON exactly once (invariant 1); everything after is a Y op.
 */
export const seedBodyDoc = (doc: Y.Doc, document: ScriptDocument, origin: unknown = null) => {
    const fragment = getBodyFragment(doc);

    if (fragment.length > 0) {
        throw new Error('[sync-engine] refusing to seed a non-empty body doc');
    }

    doc.transact(() => {
        fragment.insert(0, jsonNodesToYXml(document.content));
    }, origin);
};

/**
 * "Replace content": deletes every block and inserts `document` as ordinary
 * Y ops on top of the existing state. Never resets the Y history (invariant 8),
 * so a third replica converges to exactly `document`.
 */
export const replaceBodyContent = (doc: Y.Doc, document: ScriptDocument, origin: unknown = null) => {
    const fragment = getBodyFragment(doc);

    doc.transact(() => {
        if (fragment.length > 0) {
            fragment.delete(0, fragment.length);
        }

        fragment.insert(0, jsonNodesToYXml(document.content));
    }, origin);
};
