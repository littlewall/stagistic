import {
    describe, expect, it,
} from 'vite-plus/test';

import {collectMusicAtoms} from './collectMusicAtoms';

describe('collectMusicAtoms', () => {
    it('returns start and out atoms in order, ignoring text', () => {
        const block = {
            type: 'stageDirection',
            content: [
                {type: 'text', text: 'Lights fade.'},
                {type: 'musicStart',
                    attrs: {
                        musicId: 'c1', mode: 'open', title: 'Night', kind: null,
                    }},
                {type: 'musicOut'},
            ],
        };

        expect(collectMusicAtoms(block as never)).toEqual([
            {
                role: 'start', musicId: 'c1', mode: 'open', title: 'Night', kind: null,
            }, {role: 'out'},
        ]);
    });

    it('defaults a malformed start to open with empty strings', () => {
        const block = {type: 'stageDirection', content: [{type: 'musicStart', attrs: {}}]};

        expect(collectMusicAtoms(block as never)).toEqual([
            {
                role: 'start', musicId: '', mode: 'open', title: '', kind: null,
            },
        ]);
    });

    it('returns [] when the block has no content', () => {
        expect(collectMusicAtoms({type: 'stageDirection'} as never)).toEqual([]);
    });
});
