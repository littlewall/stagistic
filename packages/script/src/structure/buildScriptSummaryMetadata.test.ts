import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ScriptDocument} from '../document';
import {buildScriptSummaryMetadata} from './buildScriptSummaryMetadata';

const document = (...types: string[]): ScriptDocument => ({
    type: 'doc',
    content: types.map(type => ({type, content: []})),
});

describe('buildScriptSummaryMetadata', () => {
    it('reports zero scenes and unknown pages for an empty document', () => {
        expect(buildScriptSummaryMetadata(document())).toEqual({
            pageCount: null,
            sceneCount: 0,
            actSceneCounts: [],
            unassignedSceneCount: 0,
        });
    });

    it('counts scenes without inventing an act', () => {
        expect(buildScriptSummaryMetadata(document('scene', 'dialogue', 'scene'), 3)).toEqual({
            pageCount: 3,
            sceneCount: 2,
            actSceneCounts: [],
            unassignedSceneCount: 2,
        });
    });

    it('retains empty acts and scenes before the first act', () => {
        expect(buildScriptSummaryMetadata(document('scene', 'act', 'act', 'scene', 'act'))).toEqual({
            pageCount: null,
            sceneCount: 2,
            actSceneCounts: [
                0,
                1,
                0,
            ],
            unassignedSceneCount: 1,
        });
    });

    it('counts a normal two-act document', () => {
        expect(buildScriptSummaryMetadata(document('act', 'scene', 'scene', 'act', 'scene'), 8)).toEqual({
            pageCount: 8,
            sceneCount: 3,
            actSceneCounts: [2, 1],
            unassignedSceneCount: 0,
        });
    });

    it('derives the new distribution after insertion, removal and reordering', () => {
        const original = document('act', 'scene', 'scene', 'act', 'scene');
        const reordered: ScriptDocument = {
            type: 'doc',
            content: [
                original.content[1],
                original.content[0],
                original.content[3],
                original.content[4],
                {type: 'scene'},
            ],
        };

        expect(buildScriptSummaryMetadata(reordered)).toEqual({
            pageCount: null,
            sceneCount: 3,
            actSceneCounts: [0, 2],
            unassignedSceneCount: 1,
        });
    });

    it('uses the same wrapper traversal as other structure helpers', () => {
        expect(buildScriptSummaryMetadata({
            type: 'doc',
            content: [{type: 'wrapper', content: document('act', 'scene').content}],
        }, 0)).toEqual({
            pageCount: 0,
            sceneCount: 1,
            actSceneCounts: [1],
            unassignedSceneCount: 0,
        });
    });
});
