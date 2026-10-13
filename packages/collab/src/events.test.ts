import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {type CloudEvent, createChangeCoalescer} from './events';

const changed = (stateVector: string, scriptId = 's1'): CloudEvent & {type: 'changed'} => ({
    type: 'changed',
    scriptId,
    kind: 'body',
    stateVector,
});

describe('change hints', () => {
    it('sends the first hint at once and collapses a burst into one trailing hint', async () => {
        const sent: string[] = [];
        const coalescer = createChangeCoalescer({publish: event => sent.push(`${event.scriptId}:${event.stateVector}`), intervalMs: 50});

        coalescer.push(changed('v1'));
        coalescer.push(changed('v2'));
        coalescer.push(changed('v3'));
        coalescer.push(changed('w1', 's2'));

        expect(sent).toEqual(['s1:v1', 's2:w1']);
        await new Promise(resolve => setTimeout(resolve, 80));
        expect(sent).toEqual([
            's1:v1',
            's2:w1',
            's1:v3',
        ]);
        coalescer.stop();
    });
});
