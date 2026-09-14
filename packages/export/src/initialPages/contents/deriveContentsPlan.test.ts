import type {ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    block,
    text,
} from '../../testUtils';
import {deriveContentsPlan} from './deriveContentsPlan';

const MUSIC_ID_ATTR = 'musicId';

const musicStart = (
    blockId: string,
    musicId: string,
    title: string,
    kind: string | null = 'song',
    mode = 'open',
) => ({
    type: 'stageDirection',
    attrs: {id: blockId, blockType: 'stageDirection'},
    content: [
        {
            type: 'musicStart',
            attrs: {
                [MUSIC_ID_ATTR]: musicId, mode, title, kind,
            },
        },
    ],
});

const cue = (blockId: string, key: string) => ({
    type: 'character',
    attrs: {
        id: blockId, blockType: 'character', characterRefs: {[key]: null},
    },
    content: [text(key)],
});

const doc = (content: ScriptDocument['content']): ScriptDocument => ({type: 'doc', content});

const enabled = {enabled: true, variant: 'scenes-and-musical-numbers'} as const;

describe('deriveContentsPlan', () => {
    it('returns null when disabled', () => {
        expect(deriveContentsPlan(
            {enabled: false, variant: 'scenes'},
            doc([block('scene', 's1', 'The Diner')]),
            [],
            [],
        )).toBeNull();
    });

    it('numbers scenes continuously across acts', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'The Diner'),
            block('scene', 's2', 'The Rooftop'),
            block('act', 'a2', 'ACT TWO'),
            block('scene', 's3', 'The Alley'),
        ]), [], []);

        expect(plan?.acts.map(act => act.name)).toEqual(['ACT ONE', 'ACT TWO']);
        expect(plan?.acts[0].scenes.map(scene => scene.sceneNumber)).toEqual([1, 2]);
        expect(plan?.acts[1].scenes.map(scene => scene.sceneNumber)).toEqual([3]);
    });

    it('files music before an act first scene as preSceneMusic of that act', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'The Diner'),
            block('act', 'a2', 'ACT TWO'),
            musicStart('m1', 'music-1', 'Entracte', 'instrumental'),
            block('scene', 's2', 'The Alley'),
        ]), [], []);

        expect(plan?.acts[1].preSceneMusic.map(entry => entry.title)).toEqual(['Entracte']);
        expect(plan?.acts[1].scenes[0].music).toEqual([]);
    });

    it('keeps only open music', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
            musicStart('m1', 'music-1', 'A Song'),
            musicStart('m2', 'music-2', 'A Sting', 'song', 'hit'),
        ]), [], []);

        expect(plan?.acts[0].scenes[0].music.map(entry => entry.title)).toEqual(['A Song']);
    });

    it('marks music instrumental by kind and by absent lyrics', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
            musicStart('m1', 'music-1', 'Underscore', 'instrumental'),
            block('stageDirection', 'sd1', 'Music out.'),
            musicStart('m2', 'music-2', 'Silent Song'),
            block('stageDirection', 'sd2', 'Music out.'),
        ]), [], []);
        const [first, second] = plan!.acts[0].scenes[0].music;

        expect(first.isInstrumental).toBe(true);
        expect(second.isInstrumental).toBe(true);
        expect(second.singers).toEqual([]);
    });

    it('credits singers and uses the script music number', () => {
        const plan = deriveContentsPlan(enabled, doc([
            block('scene', 's1', 'The Diner'),
            musicStart('m1', 'music-1', 'A Song'),
            cue('c1', 'KYLIE'),
            block('lyrics', 'l1', 'La la'),
            block('stageDirection', 'sd1', 'Music out.'),
        ]), [
            {
                id: 'c-kylie', key: 'KYLIE', displayName: 'Kylie',
            },
        ], []);
        const [entry] = plan!.acts[0].scenes[0].music;

        expect(entry.singers).toEqual(['Kylie']);
        expect(entry.isInstrumental).toBe(false);
        expect(entry.number).toBe('1)');
    });

    it('uses a nameless act group when the script has no acts', () => {
        const plan = deriveContentsPlan(enabled, doc([block('scene', 's1', 'The Diner')]), [], []);

        expect(plan?.acts).toHaveLength(1);
        expect(plan?.acts[0].name).toBeNull();
    });

    it('falls back to placeholder titles', () => {
        const plan = deriveContentsPlan(enabled, doc([block('act', 'a1', ''), block('scene', 's1', '')]), [], []);

        expect(plan?.acts[0].name).toBe('ACT 1');
        expect(plan?.acts[0].scenes[0].title).toBe('Untitled scene');
    });

    it('returns null when the variant has nothing to list', () => {
        const scenesOnly = doc([block('scene', 's1', 'The Diner')]);

        expect(deriveContentsPlan(
            {enabled: true, variant: 'musical-numbers'},
            scenesOnly,
            [],
            [],
        )).toBeNull();
        expect(deriveContentsPlan(
            {enabled: true, variant: 'scenes'},
            scenesOnly,
            [],
            [],
        )).not.toBeNull();
    });

    it('defaults showScoreColumn to false', () => {
        const plan = deriveContentsPlan(enabled, doc([block('scene', 's1', 'The Diner')]), [], []);

        expect(plan?.showScoreColumn).toBe(false);
        expect(plan?.variant).toBe('scenes-and-musical-numbers');
    });
});
