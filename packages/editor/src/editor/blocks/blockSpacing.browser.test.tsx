import '@stagistic/ui/styles/base.css';

import {createRoot} from 'react-dom/client';
import {expect, it} from 'vite-plus/test';

import ScriptEditor from '../Editor';

it.each([
    'dialogue',
    'lyrics',
    'stageDirection',
    'character',
    'aside',
    'note',
    'act',
    'scene',
])('shares spacing around a %s run in the editor', async type => {
    const host = document.createElement('div');

    document.body.append(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{initialValue: {
                type: 'doc',
                content: [
                    'One',
                    'Two',
                    'Three',
                ].map((text, i) => ({
                    type,
                    attrs: {id: `item-${i}`},
                    content: [{type: 'text', text}],
                })),
            }}}
            settings={{scriptSettings: {blocks: {[type]: {spacingBeforeEm: 1, spacingAfterEm: 1}}}}}
        />,
    );
    try {
        const blocks = () => Array.from(host.querySelectorAll<HTMLElement>(`p[blocktype="${type}"]`));

        await expect.poll(() => blocks().length).toBe(3);

        const grouped = !['act', 'scene'].includes(type);

        await expect.poll(() => blocks().map(element => [getComputedStyle(element).paddingTop, getComputedStyle(element).paddingBottom])).toEqual(grouped
            ? [
                ['16px', '0px'],
                ['0px', '0px'],
                ['0px', '16px'],
            ]
            : [
                ['16px', '16px'],
                ['16px', '16px'],
                ['16px', '16px'],
            ]);
    } finally {
        root.unmount();
        host.remove();
    }
});
