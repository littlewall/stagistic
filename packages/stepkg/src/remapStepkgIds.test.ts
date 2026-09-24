import {describe, expect, it} from 'vite-plus/test';

import type {StepkgSnapshot} from './contracts';
import {remapStepkgIds} from './remapStepkgIds';

const snapshot = (): StepkgSnapshot => ({
    script: {id: 'old-script', title: 'T', subtitle: null, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: {
        type: 'doc',
        content: [
            {type: 'dialogue', attrs: {id: 'b1', characterRefs: {MARA: 'old-char'}}, content: []},
            {type: 'music', attrs: {id: 'b2', musicId: 'old-music'}, content: []},
        ],
    } as unknown as StepkgSnapshot['document'],
    titlePage: {},
    settings: {},
    characters: {
        characters: [
            {
                id: 'old-char',
                key: 'MARA',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: 'x',
                updatedAt: 'x',
            },
        ],
        groups: [{id: 'old-group', key: 'FAMILY', colorHex: null, memberIds: ['old-char'], createdAt: 'x', updatedAt: 'x'}],
        genderOptions: [],
    },
    music: {
        items: [
            {
                id: 'old-music',
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
    scenes: {scenes: [], locations: []},
    attachments: [
        {id: 'old-att', filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 3, createdAt: 'x', updatedAt: 'x', contentKey: 'assets/old-att/a.pdf'},
    ],
    comments: {threads: [], messages: []},
    attachmentBindings: [{target: {type: 'music', id: 'old-music'}, attachmentId: 'old-att', role: 'integrated_score', order: 0, createdAt: 'x'}],
});

describe('remapStepkgIds', () => {
    it('mints fresh ids and rewrites every reference including embedded document ids', () => {
        let counter = 0;
        const {snapshot: next, idMap} = remapStepkgIds(snapshot(), () => `new-${counter++}`);

        expect(next.script.id).not.toBe('old-script');
        const newCharId = idMap.characters['old-char'];
        const newMusicId = idMap.music['old-music'];
        const newAttId = idMap.attachments['old-att'];

        expect(next.characters.groups[0]?.memberIds).toEqual([newCharId]);
        expect(next.attachmentBindings[0]?.attachmentId).toBe(newAttId);
        expect(next.attachmentBindings[0]?.target.id).toBe(newMusicId);
        expect(next.attachments[0]?.contentKey).toBe('assets/old-att/a.pdf');

        const dialogue = next.document.content?.[0] as {attrs: {id: string; characterRefs: Record<string, string>}};
        const musicNode = next.document.content?.[1] as {attrs: {id: string; musicId: string}};

        expect(dialogue.attrs.id).toBe('b1');
        expect(dialogue.attrs.characterRefs.MARA).toBe(newCharId);
        expect(musicNode.attrs.musicId).toBe(newMusicId);
        expect(musicNode.attrs.id).toBe('b2');
    });

    it('does not remap scene ids', () => {
        const withScene: StepkgSnapshot = {
            ...snapshot(),
            scenes: {
                scenes: [
                    {id: 'scene-1', headingBlockId: 'b1', sceneNumber: '1', colorHex: null, synopsis: null, locationIds: [], createdAt: 'x', updatedAt: 'x'},
                ],
                locations: [],
            },
        };
        const {snapshot: next} = remapStepkgIds(withScene);

        expect(next.scenes.scenes[0]?.id).toBe('scene-1');
        expect(next.scenes.scenes[0]?.headingBlockId).toBe('b1');
    });

    it('remaps comment thread ids in rows and in commentAnchor marks, and message ids', () => {
        const input = snapshot();

        input.document.content[0].content = [{type: 'text', text: 'Hi', marks: [{type: 'commentAnchor', attrs: {threadId: 'old-thread'}}]}];
        input.comments = {
            threads: [
                {
                    id: 'old-thread',
                    anchorKind: 'range',
                    anchorBlockId: null,
                    quotedText: 'Hi',
                    status: 'open',
                    resolvedAt: null,
                    resolvedBy: null,
                    createdBy: 'local',
                    createdAt: 'x',
                    updatedAt: 'x',
                },
            ],
            messages: [{id: 'old-message', threadId: 'old-thread', authorId: 'local', body: 'b', createdAt: 'x', updatedAt: 'x', editedAt: null}],
        };

        let counter = 0;
        const {snapshot: next, idMap} = remapStepkgIds(input, () => `new-${++counter}`);
        const newThreadId = idMap.commentThreads['old-thread'];

        expect(newThreadId).toMatch(/^new-/);
        expect(next.comments.threads[0].id).toBe(newThreadId);
        expect(next.comments.messages[0]).toMatchObject({id: idMap.commentMessages['old-message'], threadId: newThreadId});
        expect(next.document.content[0].content?.[0].marks?.[0].attrs).toEqual({threadId: newThreadId});
    });
});
