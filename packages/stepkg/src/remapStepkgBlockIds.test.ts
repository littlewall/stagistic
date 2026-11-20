import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {StepkgSnapshot} from './contracts';
import {remapStepkgBlockIds} from './remapStepkgBlockIds';

const snapshot = (): StepkgSnapshot => ({
    script: {
        id: 'script-1',
        title: 'The door',
        subtitle: null,
        createdAt: 'x',
        updatedAt: 'x',
    },
    document: {
        type: 'doc',
        attrs: {importMeta: {sceneSynopses: [{headingBlockId: 'b1', synopsis: 'Night'}]}},
        content: [
            {
                type: 'scene',
                attrs: {id: 'b1'},
                content: [{type: 'text', text: 'Scene One'}],
            },
            {
                type: 'stageDirection',
                attrs: {id: 'b2'},
                content: [{type: 'text', text: 'Dark.'}],
            },
        ],
    },
    titlePage: {},
    settings: {},
    characters: {
        characters: [],
        groups: [],
        genderOptions: [],
    },
    music: {
        items: [
            {
                id: 'm1',
                sceneNumber: 1,
                indexInScene: 0,
                mode: 'open',
                title: 'Song',
                kind: null,
                startBlockId: 'b2',
                endBlockId: null,
                createdAt: 'x',
                updatedAt: 'x',
            },
        ],
    },
    scenes: {
        scenes: [
            {
                id: 'scene-1',
                headingBlockId: 'b1',
                sceneNumber: '1',
                colorHex: null,
                synopsis: null,
                locationIds: [],
                createdAt: 'x',
                updatedAt: 'x',
            },
        ],
        locations: [],
    },
    attachments: [],
    attachmentBindings: [],
    sceneCharacters: {items: []},
    comments: {
        threads: [
            {
                id: 't1',
                anchorKind: 'block',
                anchorBlockId: 'b2',
                quotedText: '',
                status: 'open',
                resolvedAt: null,
                resolvedBy: null,
                createdBy: 'local',
                createdAt: 'x',
                updatedAt: 'x',
            },
        ],
        messages: [],
    },
});

describe('remapStepkgBlockIds', () => {
    it('gives blocks fresh ids and rewrites every block reference', () => {
        let counter = 0;
        const next = remapStepkgBlockIds(snapshot(), () => `nb${++counter}`);

        expect(next.document.content.map(node => node.attrs?.id)).toEqual(['nb1', 'nb2']);
        expect(next.document.attrs?.importMeta?.sceneSynopses?.[0]?.headingBlockId).toBe('nb1');
        expect(next.scenes.scenes[0]?.headingBlockId).toBe('nb1');
        expect(next.music.items[0]).toMatchObject({startBlockId: 'nb2', endBlockId: null});
        expect(next.comments.threads[0]?.anchorBlockId).toBe('nb2');
    });

    it('leaves the source snapshot untouched', () => {
        const source = snapshot();

        remapStepkgBlockIds(source);

        expect(source.document.content[0]?.attrs?.id).toBe('b1');
        expect(source.scenes.scenes[0]?.headingBlockId).toBe('b1');
    });
});
