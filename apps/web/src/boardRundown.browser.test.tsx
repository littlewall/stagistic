import '@stagistic/ui/styles/base.css';

import {requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    findButton,
    locationText,
    mountApp,
    repository,
    waitFor,
} from './boardTestFixtures';

type ScriptDocument = NonNullable<Parameters<typeof repository.createScript>[1]>;

const block = (type: string, id: string, text: string, content: ScriptDocument['content'] = []) => ({
    type,
    attrs: {id},
    content: [...text ? [{type: 'text', text}] : [], ...content],
});

const MUSIC = {
    type: 'musicStart',
    attrs: {
        musicId: 'm1',
        mode: 'open',
        title: 'Small Light',
        kind: 'song',
        draft: false,
    },
};

const createMusicScript = async () => {
    const scriptId = await repository.createScript('Rundown test', {
        type: 'doc',
        content: [
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'The Lighthouse'),
            block('character', 'c1', 'MARA'),
            block('stageDirection', 'x1', 'She sings.', [MUSIC]),
            block('lyrics', 'l1', 'la la'),
            block('scene', 's2', 'The Harbour'),
            block('dialogue', 'd2', 'Ahoy.'),
        ],
    });

    return scriptId;
};

/* Labels gain a page range once the editor has paginated, so rows match by prefix. */
const row = (prefix: string) => [...document.querySelectorAll<HTMLElement>('[data-row]')].find(element => element.getAttribute('aria-label')?.startsWith(prefix));

describe('Board Rundown', () => {
    it('lists acts, scenes and songs on its tab and opens the Editor at the song start', async () => {
        const scriptId = await createMusicScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => findButton('Rundown'));
        await userEvent.click(requireValue(findButton('Rundown')));

        await waitFor(() => row('Scene 2, The Harbour'));
        expect(locationText()).toContain(`/script/${scriptId}/board/rundown`);
        expect(document.querySelector('section[aria-label="ACT ONE"]')?.textContent).toContain('2 scenes · 1 song');
        expect(findButton('View')).toBeUndefined();

        await userEvent.click(requireValue(await waitFor(() => row('Song 1, Small Light'))));
        await waitFor(() => locationText().includes('/editor'));
        expect(locationText()).toContain('"focusBlockId":"x1"');
    });
});
