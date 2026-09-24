import type {ScriptPackageSource} from '@stagistic/db';
import {describe, expect, it} from 'vite-plus/test';

import {mapScriptPackageSourceToStepkg} from './mapScriptPackageSource';

const source = {
    script: {id: 'script-1', title: 'Test', subtitle: null, createdAt: 1_000, updatedAt: 1_000},
    document: {type: 'doc', content: []},
    titlePage: {},
    settings: {},
    characters: [],
    characterGroupMembers: [],
    characterGenders: [],
    music: [],
    locations: [],
    scenes: [],
    sceneLocations: [],
    attachments: [],
    musicAttachmentBindings: [],
    comments: {
        threads: [
            {
                id: 't1',
                scriptId: 'script-1',
                anchorKind: 'range',
                anchorBlockId: null,
                quotedText: 'Q',
                status: 'open',
                resolvedAt: null,
                resolvedBy: null,
                createdBy: 'local',
                createdAt: 1_000,
                updatedAt: 2_000,
            },
        ],
        messages: [{id: 'm1', scriptId: 'script-1', threadId: 't1', authorId: 'local', body: 'B', createdAt: 1_000, updatedAt: 3_000, editedAt: 3_000}],
    },
} as ScriptPackageSource;

describe('mapScriptPackageSourceToStepkg', () => {
    it('maps comment rows to ISO timestamps without script ids', () => {
        const snapshot = mapScriptPackageSourceToStepkg(source);

        expect(snapshot.comments.threads).toEqual([
            {
                id: 't1',
                anchorKind: 'range',
                anchorBlockId: null,
                quotedText: 'Q',
                status: 'open',
                resolvedAt: null,
                resolvedBy: null,
                createdBy: 'local',
                createdAt: new Date(1_000).toISOString(),
                updatedAt: new Date(2_000).toISOString(),
            },
        ]);
        expect(snapshot.comments.messages).toEqual([
            {
                id: 'm1',
                threadId: 't1',
                authorId: 'local',
                body: 'B',
                createdAt: new Date(1_000).toISOString(),
                updatedAt: new Date(3_000).toISOString(),
                editedAt: new Date(3_000).toISOString(),
            },
        ]);
    });
});
