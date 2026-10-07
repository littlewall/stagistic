/*
 * Phase 0 spike: TipTap Collaboration binding vs. the engine's schema-less codec.
 */
import {prosemirrorJSONToYXmlFragment} from '@tiptap/y-tiptap';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {countDifferingScenes} from '../conflicts/sceneDiff';
import {
    block,
    buildLongScript,
    doc,
} from '../testing/fixtures';
import {
    bodyDocToScriptDocument,
    getBodyFragment,
    replaceBodyContent,
    seedBodyDoc,
} from '../ydoc/bodyCodec';
import {resolveSchemaGate} from '../ydoc/mapCodec';
import {
    blockIds,
    createCollabEditor,
    normalizeWithEditor,
} from './editorHarness';

const editors: Array<{destroy(): void}> = [];
const track = <T extends {destroy(): void}>(editor: T) => {
    editors.push(editor);

    return editor;
};

afterEach(() => {
    editors.splice(0).forEach(editor => editor.destroy());
});

const link = (left: Y.Doc, right: Y.Doc) => {
    left.on('update', (update: Uint8Array, origin: unknown) => origin !== right && Y.applyUpdate(right, update, left));
    right.on('update', (update: Uint8Array, origin: unknown) => origin !== left && Y.applyUpdate(left, update, right));
    Y.applyUpdate(right, Y.encodeStateAsUpdate(left), left);
    Y.applyUpdate(left, Y.encodeStateAsUpdate(right), right);
};

const richScript = () => normalizeWithEditor(doc(
    block('act', 'a1', 'ACT ONE'),
    block('scene', 's1', 'INT. CASTLE'),
    {
        type: 'dialogue',
        attrs: {id: 'd1'},
        content: [
            {type: 'text', text: 'To be '},
            {
                type: 'text',
                text: 'or not',
                marks: [{type: 'bold'}, {type: 'commentAnchor', attrs: {commentId: 'k1'}}],
            },
            {
                type: 'text',
                text: ' to be',
                marks: [{type: 'commentAnchor', attrs: {commentId: 'k1'}}, {type: 'commentAnchor', attrs: {commentId: 'k2'}}],
            },
        ],
    },
    block('scene', 's2', 'EXT. BATTLEMENTS'),
    block('stageDirection', 'e1', 'Ghost enters.'),
));

describe('schema-less codec vs. y-tiptap', () => {
    it('produces the same Y representation as prosemirrorJSONToYXmlFragment', () => {
        const json = richScript();
        const editor = track(createCollabEditor(new Y.Doc()));
        const viaBinding = new Y.Doc();
        const viaCodec = new Y.Doc();

        prosemirrorJSONToYXmlFragment(editor.schema, json, getBodyFragment(viaBinding));
        seedBodyDoc(viaCodec, json);

        expect(getBodyFragment(viaCodec).toJSON()).toBe(getBodyFragment(viaBinding).toJSON());
        expect(bodyDocToScriptDocument(viaCodec)).toEqual(bodyDocToScriptDocument(viaBinding));
    });

    it('projection equals the bound editor document after seeding and typing', () => {
        const json = richScript();
        const ydoc = new Y.Doc();

        seedBodyDoc(ydoc, json);

        const editor = track(createCollabEditor(ydoc));

        expect(normalizeWithEditor(bodyDocToScriptDocument(ydoc))).toEqual(editor.getJSON());

        editor.commands.setTextSelection(4);
        editor.commands.insertContent('Hamlet: ');
        editor.commands.splitBlock();

        expect(normalizeWithEditor(bodyDocToScriptDocument(ydoc))).toEqual(editor.getJSON());
    });

    it('seeding a bound doc does not mutate it (no binding rewrite churn)', () => {
        const ydoc = new Y.Doc();

        seedBodyDoc(ydoc, richScript());

        const before = Y.encodeStateVector(ydoc);

        track(createCollabEditor(ydoc));

        expect(Y.encodeStateVector(ydoc)).toEqual(before);
    });
});

describe('two bound editors', () => {
    it('converge with unique block ids after concurrent splits (UniqueID)', () => {
        const left = new Y.Doc();
        const right = new Y.Doc();

        seedBodyDoc(left, richScript());
        link(left, right);

        const leftEditor = track(createCollabEditor(left));
        const rightEditor = track(createCollabEditor(right));
        let updates = 0;

        left.on('update', () => updates++);

        // Both split the same dialogue block at the same time.
        leftEditor.commands.setTextSelection(30);
        rightEditor.commands.setTextSelection(32);
        leftEditor.commands.splitBlock();
        rightEditor.commands.splitBlock();
        leftEditor.commands.insertContent('L');
        rightEditor.commands.insertContent('R');

        const merged = leftEditor.getJSON() as ReturnType<typeof normalizeWithEditor>;
        const ids = blockIds(merged);

        expect(rightEditor.getJSON()).toEqual(merged);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.every(Boolean)).toBe(true);
        // No ping-pong between UniqueID and the binding.
        expect(updates).toBeLessThan(20);
    });

    it('replace content on cloud state shows no duplicates in a bound editor', () => {
        const cloud = new Y.Doc();

        seedBodyDoc(cloud, normalizeWithEditor(buildLongScript(3, 2, 'cloud')));

        const third = new Y.Doc();

        link(cloud, third);

        const thirdEditor = track(createCollabEditor(third));
        const local = normalizeWithEditor(buildLongScript(2, 3, 'local'));

        replaceBodyContent(cloud, local);

        expect(thirdEditor.getJSON()).toEqual(local);
        expect(countDifferingScenes(thirdEditor.getJSON() as typeof local, local)).toBe(0);
    });
});

describe('old client and unknown node', () => {
    const withFutureNode = () => {
        const ydoc = new Y.Doc();

        seedBodyDoc(ydoc, doc(
            ...richScript().content,
            {
                type: 'futureBlock',
                attrs: {id: 'f1'},
                content: [{type: 'text', text: 'From a newer client'}],
            },
        ));

        return ydoc;
    };

    it('binding an old schema drops the unknown node from the shared doc (why the gate exists)', () => {
        const ydoc = withFutureNode();

        track(createCollabEditor(ydoc));

        expect(bodyDocToScriptDocument(ydoc).content.some(node => node.type === 'futureBlock')).toBe(false);
    });

    it('the schema gate keeps the doc intact by not binding newer docs', () => {
        const ydoc = withFutureNode();
        const before = Y.encodeStateAsUpdate(ydoc);

        expect(resolveSchemaGate(5, 4)).toBe('read-only');
        expect(resolveSchemaGate(4, 4)).toBe('writable');

        // read-only path: render from the projection, never bind ySyncPlugin
        const projected = bodyDocToScriptDocument(ydoc);

        expect(projected.content.at(-1)?.type).toBe('futureBlock');
        expect(Y.encodeStateAsUpdate(ydoc)).toEqual(before);
    });
});
