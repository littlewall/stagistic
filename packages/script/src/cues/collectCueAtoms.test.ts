import {
    describe, expect, it,
} from 'vite-plus/test';

import {collectCueAtoms} from './collectCueAtoms';

describe('collectCueAtoms', () => {
    it('returns start and out atoms in order, ignoring text', () => {
        const block = {
            type: 'stageDirection',
            content: [
                {type: 'text', text: 'Lights fade.'},
                {type: 'cueStart',
                    attrs: {
                        cueId: 'c1', mode: 'open', title: 'Night', kind: null,
                    }},
                {type: 'cueOut'},
            ],
        };

        expect(collectCueAtoms(block as never)).toEqual([
            {
                role: 'start', cueId: 'c1', mode: 'open', title: 'Night', kind: null,
            }, {role: 'out'},
        ]);
    });

    it('defaults a malformed start to open with empty strings', () => {
        const block = {type: 'stageDirection', content: [{type: 'cueStart', attrs: {}}]};

        expect(collectCueAtoms(block as never)).toEqual([
            {
                role: 'start', cueId: '', mode: 'open', title: '', kind: null,
            },
        ]);
    });

    it('returns [] when the block has no content', () => {
        expect(collectCueAtoms({type: 'stageDirection'} as never)).toEqual([]);
    });
});
