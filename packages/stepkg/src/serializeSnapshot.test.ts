import {describe, expect, it} from 'vite-plus/test';

import type {StepkgSnapshot} from './contracts';
import {serializeStepkgContent} from './serializeSnapshot';

const snapshot: StepkgSnapshot = {
    script: {
        id: 'script-1',
        title: 'Test Script',
        subtitle: null,
        createdAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T11:00:00.000Z',
    },
    document: {type: 'doc', content: [{type: 'act', attrs: {id: 'block-1'}, content: [{type: 'text', text: 'Act One'}]}]},
    titlePage: {},
    settings: {page: {widthPx: 816}},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [],
    comments: {threads: [], messages: []},
    attachmentBindings: [],
};

const decode = (path: string): string => {
    const entry = serializeStepkgContent(snapshot).find(item => item.path === path);
    return new TextDecoder().decode(entry?.bytes);
};

describe('serializeStepkgContent', () => {
    it('serializes the fixed portable content entries', () => {
        const entries = serializeStepkgContent(snapshot);

        expect(entries.map(entry => entry.path)).toEqual([
            'document.json',
            'script.stagistic',
            'data/script.json',
            'data/title-page.json',
            'data/settings.json',
            'data/characters.json',
            'data/music.json',
            'data/scenes.json',
            'data/comments.json',
        ]);
        expect(entries.every(entry => entry.compression === 'deflate')).toBe(true);
        expect(decode('document.json')).toContain('"id":"block-1"');
        expect(decode('script.stagistic')).toContain('# Act One');
        expect(decode('data/script.json')).not.toContain('activeBlockId');
        expect(decode('data/settings.json')).toBe('{"page":{"widthPx":816}}');
    });
});
