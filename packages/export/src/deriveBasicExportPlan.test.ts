import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    BASIC_DEFAULTS,
    type BasicExportConfig,
} from './config';
import {deriveBasicExportPlan} from './deriveBasicExportPlan';
import {
    block,
    sampleDoc,
} from './testUtils';

const script = {
    doc: sampleDoc(),
    characters: [],
    scriptTitle: 'Test',
    titlePage: null,
};

const withConfig = (patch: Partial<BasicExportConfig>): BasicExportConfig => ({
    characterFilter: patch.characterFilter ?? BASIC_DEFAULTS.characterFilter,
    pageBreaks: patch.pageBreaks ?? BASIC_DEFAULTS.pageBreaks,
    blankPages: patch.blankPages ?? BASIC_DEFAULTS.blankPages,
});

describe('deriveBasicExportPlan', () => {
    it('adds scene page breaks by default', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, script);

        expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'sceneA', kind: 'new-page'}, {blockId: 'sceneB', kind: 'new-page'}]);
    });

    it('uses odd-page scene breaks when requested', () => {
        const plan = deriveBasicExportPlan(withConfig({
            pageBreaks: {
                sceneOnNewPage: true,
                sceneOnOddPage: true,
            },
        }), script);

        expect(plan.pagination.forcedBreaks.every(item => item.kind === 'odd-page')).toBe(true);
    });

    it('starts later acts on new pages automatically', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            doc: {
                type: 'doc',
                content: [
                    block('act', 'actA', 'Act One'),
                    block('scene', 'sceneA', 'Scene A'),
                    block('act', 'actB', 'Act Two'),
                    block('scene', 'sceneB', 'Scene B'),
                ],
            },
        });

        expect(plan.pagination.forcedBreaks).toEqual([
            {blockId: 'sceneA', kind: 'new-page'},
            {blockId: 'actB', kind: 'new-page'},
            {blockId: 'sceneB', kind: 'new-page'},
        ]);
    });

    it('carries the title page and script title through', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            scriptTitle: 'My Play',
            titlePage: {subtitle: 'A Comedy'},
        });

        expect(plan.scriptTitle).toBe('My Play');
        expect(plan.titlePage).toEqual({subtitle: 'A Comedy'});
    });

    it('carries blank-page settings through', () => {
        const plan = deriveBasicExportPlan(withConfig({
            blankPages: {
                betweenTitleAndScript: {
                    count: 2,
                    countsInNumbering: true,
                },
            },
        }), script);

        expect(plan.pagination.blankPagesBeforeScript).toEqual({
            count: 2,
            countsInNumbering: true,
        });
    });
});
