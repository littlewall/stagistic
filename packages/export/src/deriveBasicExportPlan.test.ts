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
import {sampleDoc} from './testUtils';

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
    it('adds scene page breaks', () => {
        const plan = deriveBasicExportPlan(withConfig({
            pageBreaks: {
                ...BASIC_DEFAULTS.pageBreaks,
                sceneOnNewPage: true,
            },
        }), script);

        expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'sceneA', kind: 'new-page'}, {blockId: 'sceneB', kind: 'new-page'}]);
    });

    it('uses odd-page scene breaks when requested', () => {
        const plan = deriveBasicExportPlan(withConfig({
            pageBreaks: {
                actOnNewPage: false,
                sceneOnNewPage: true,
                sceneOnOddPage: true,
            },
        }), script);

        expect(plan.pagination.forcedBreaks.every(item => item.kind === 'odd-page')).toBe(true);
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
