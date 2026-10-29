import {expect, it} from 'vite-plus/test';

import {planIntegratedAssembly} from './planIntegratedAssembly';

it.each(Array.from({length: 7}, (_, i) => i + 2).flatMap(pages => Array.from({length: 5}, (_, count) => ({pages, count}))))('uses actual final parity for $pages script pages and $count score pages', ({pages, count}) => {
    const source = Array.from({length: pages}, (_, i) => [`b${i}`]);
    const plan = planIntegratedAssembly({
        scriptPageSourceBlockIds: source,
        scores: [
            {
                musicId: 'song',
                startBlockId: 'b0',
                afterBlockId: 'b1',
                pageCount: count,
            },
        ],
    });
    const script = plan.steps.flatMap((step, i) => step.kind === 'script' ? [{source: step.scriptPageIndex, number: i + 1}] : []);
    const score = plan.steps.flatMap((step, i) => step.kind === 'score' ? [i + 1] : []);

    expect(script.map(page => page.source)).toEqual(source.map((_value, i) => i));
    expect((script.find(page => page.source === 1)?.number ?? 0) % 2).toBe(1);

    if (pages > 2) expect((script.find(page => page.source === 2)?.number ?? 0) % 2).toBe(1);

    expect(score).toHaveLength(count);

    if (count) {
        expect(score[0] % 2).toBe(1);
        expect(plan.scoreStartPageByMusicId.get('song')).toBe(score[0]);
    } else expect(plan.scoreStartPageByMusicId.has('song')).toBe(false);
});

it('recomputes generated blank pages and odd-scene starts after score insertion', () => {
    const plan = planIntegratedAssembly({
        scriptPageSourceBlockIds: [
            ['cue'],
            [],
            ['song', 'out'],
            [],
            ['scene'],
        ],
        oddPageBlockIds: ['scene'],
        scores: [
            {
                musicId: 'm',
                startBlockId: 'cue',
                afterBlockId: 'out',
                pageCount: 1,
            },
        ],
    });
    const numbered = plan.steps.map((step, i) => ({...step, page: i + 1}));

    expect((numbered.find(step => step.kind === 'score')?.page ?? 0) % 2).toBe(1);
    expect((numbered.find(step => step.scriptPageIndex === 4)?.page ?? 0) % 2).toBe(1);
    expect(numbered.filter(step => step.kind === 'script').map(step => step.scriptPageIndex)).toEqual([
        0,
        2,
        4,
    ]);
});
