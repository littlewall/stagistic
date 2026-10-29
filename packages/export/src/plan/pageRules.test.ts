import type {ScriptDocument} from '@stagistic/script';
import {expect, it} from 'vite-plus/test';

import {BASIC_DEFAULTS} from '../model/config';
import {block} from '../test/testUtils';
import {buildStructureMarks} from '../transcript/structureMarks';
import {deriveBasicExportPlan} from './deriveBasicExportPlan';

const script = (doc: ScriptDocument) => ({
    doc,
    characters: [
        {
            id: 'bob',
            key: 'BOB',
            displayName: 'Bob',
        },
    ],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    initialVocalRanges: [],
    titlePage: null,
    scriptTitle: '',
});

it.each([false, true])('applies the scene start rule to a later act and keeps its first heading together (odd=%s)', odd => {
    const doc: ScriptDocument = {
        type: 'doc',
        content: [
            block('act', 'a1', 'Act I'),
            block('scene', 's1', 'One'),
            block('dialogue', 'd1', 'Hello'),
            block('act', 'a2', 'Act II'),
            block('scene', 's2', 'Two'),
            block('dialogue', 'd2', 'Hello'),
        ],
    };
    const plan = deriveBasicExportPlan({
        ...BASIC_DEFAULTS,
        pageBreaks: {
            actOnNewPage: false,
            sceneOnNewPage: true,
            sceneOnOddPage: odd,
        },
    }, script(doc));

    expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'a2', kind: odd ? 'odd-page' : 'new-page'}]);
    expect(buildStructureMarks(doc)[3]).toEqual({actIndex: 2, sceneNumber: 2});
});

it.each([true, false])('shares scene and music identifiers between filtered contents and body (preserve=%s)', preserve => {
    const song = (id: string) => ({
        type: 'musicStart',
        attrs: {
            id,
            musicId: id,
            title: id,
            mode: 'open',
            kind: 'song',
        },
    });
    const doc: ScriptDocument = {
        type: 'doc',
        content: [
            block('scene', 's1', 'One'),
            {
                type: 'stageDirection',
                attrs: {id: 'm1'},
                content: [song('music1')],
            },
            block('scene', 's2', 'Two'),
            block('character', 'bob-line', 'BOB'),
            {
                type: 'stageDirection',
                attrs: {id: 'm2'},
                content: [song('music2')],
            },
        ],
    };
    const plan = deriveBasicExportPlan({
        ...BASIC_DEFAULTS,
        characterFilter: {
            mode: 'only',
            characterIds: ['bob'],
            preserveFullScriptPagination: preserve,
        },
        initialPages: {...BASIC_DEFAULTS.initialPages, contents: {enabled: true, variant: 'scenes-and-musical-numbers'}},
    }, script(doc));
    const contents = plan.leadingPages.initialPages.find(page => page.kind === 'contents');

    expect(contents?.acts[0]?.scenes).toHaveLength(1);
    expect(contents?.acts[0]?.scenes[0]?.sceneNumber).toBe(preserve ? 2 : 1);
    expect(contents?.acts[0]?.scenes[0]?.music[0]?.number).toBe(preserve ? '2)' : '1)');
});
