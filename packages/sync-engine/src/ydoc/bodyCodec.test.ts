import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {
    block,
    blockText,
    buildLongScript,
    doc,
} from '../testing/fixtures';
import {
    bodyDocToScriptDocument,
    getBodyFragment,
    replaceBodyContent,
    seedBodyDoc,
} from './bodyCodec';

const sync = (from: Y.Doc, to: Y.Doc) => {
    Y.applyUpdate(to, Y.encodeStateAsUpdate(from, Y.encodeStateVector(to)));
};

describe('bodyCodec', () => {
    it('round-trips blocks, text runs and overlapping marks', () => {
        const source = doc(
            block('scene', 's1', 'INT. HALL'),
            {
                type: 'dialogue',
                attrs: {id: 'd1'},
                content: [
                    {type: 'text', text: 'Hello '},
                    {
                        type: 'text',
                        text: 'Ham',
                        marks: [{type: 'characterTag', attrs: {characterId: 'c1'}}, {type: 'bold'}],
                    },
                    {
                        type: 'text',
                        text: 'let',
                        marks: [{type: 'commentAnchor', attrs: {commentId: 'k1'}}, {type: 'commentAnchor', attrs: {commentId: 'k2'}}],
                    },
                ],
            },
            block('stageDirection', 'e1'),
        );
        const ydoc = new Y.Doc();

        seedBodyDoc(ydoc, source);

        expect(bodyDocToScriptDocument(ydoc)).toEqual(source);
    });

    it('refuses to seed twice', () => {
        const ydoc = new Y.Doc();

        seedBodyDoc(ydoc, doc(block('scene', 's1', 'A')));

        expect(() => seedBodyDoc(ydoc, doc(block('scene', 's2', 'B')))).toThrow();
    });

    it('replaces content on top of history without duplicates on a third replica', () => {
        const cloud = new Y.Doc();

        seedBodyDoc(cloud, buildLongScript(3, 2, 'cloud'));

        const third = new Y.Doc();

        sync(cloud, third);

        const target = buildLongScript(2, 3, 'local');

        replaceBodyContent(cloud, target);
        sync(cloud, third);

        expect(bodyDocToScriptDocument(third)).toEqual(target);
        expect(getBodyFragment(third).length).toBe(target.content.length);
    });

    it('merges concurrent edits in different blocks', () => {
        const left = new Y.Doc();

        seedBodyDoc(left, doc(block('scene', 's1', 'One'), block('dialogue', 'd1', 'Two')));

        const right = new Y.Doc();

        sync(left, right);

        blockText(left, 0).insert(3, ' left');
        blockText(right, 1).insert(3, ' right');

        sync(left, right);
        sync(right, left);

        const merged = bodyDocToScriptDocument(left);

        expect(merged).toEqual(bodyDocToScriptDocument(right));
        expect(merged.content.map(node => node.content?.[0]?.text)).toEqual(['One left', 'Two right']);
    });
});
