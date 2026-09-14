import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {planIntegratedAssembly} from './planIntegratedAssembly';

const kinds = (steps: ReturnType<typeof planIntegratedAssembly>['steps']) => steps.map(step => step.kind);

describe('planIntegratedAssembly', () => {
    it('passes script pages straight through when there are no scores', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [
                ['b1'],
                ['b2'],
                ['b3'],
            ],
            scores: [],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'script',
        ]);
        expect(plan.scoreStartPageByMusicId.size).toBe(0);
    });

    it('inserts a score on an odd book page and reports its number', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['start'], ['end']],
            scores: [
                {
                    musicId: 'm1', startBlockId: 'start', afterBlockId: 'end', pageCount: 2,
                },
            ],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'blank',
            'score',
            'score',
        ]);
        expect(plan.scoreStartPageByMusicId.get('m1')).toBe(4);
    });

    it('forces an odd book page after the music start page', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [
                ['intro'],
                ['start'],
                ['mid'],
                ['end'],
            ],
            scores: [
                {
                    musicId: 'm1', startBlockId: 'start', afterBlockId: 'end', pageCount: 1,
                },
            ],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'blank',
            'script',
            'script',
            'blank',
            'score',
        ]);
        expect(plan.scoreStartPageByMusicId.get('m1')).toBe(7);
    });

    it('uses the last page a music ends on', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['end'], ['end', 'other']],
            scores: [
                {
                    musicId: 'm1', startBlockId: 'end', afterBlockId: 'end', pageCount: 1,
                },
            ],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'blank',
            'score',
        ]);
    });

    it('reserves the odd book page for a score with no pages but inserts nothing', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [
                ['start'],
                ['end'],
                ['after'],
            ],
            scores: [
                {
                    musicId: 'm1', startBlockId: 'start', afterBlockId: 'end', pageCount: 0,
                },
            ],
        });

        expect(kinds(plan.steps)).toEqual([
            'script',
            'script',
            'blank',
            'script',
        ]);
        expect(plan.scoreStartPageByMusicId.has('m1')).toBe(false);
    });

    it('ignores scores whose blocks are not on any page', () => {
        const plan = planIntegratedAssembly({
            scriptPageSourceBlockIds: [['b1']],
            scores: [
                {
                    musicId: 'm1', startBlockId: 'gone', afterBlockId: 'gone', pageCount: 3,
                },
            ],
        });

        expect(kinds(plan.steps)).toEqual(['script']);
        expect(plan.scoreStartPageByMusicId.size).toBe(0);
    });
});
