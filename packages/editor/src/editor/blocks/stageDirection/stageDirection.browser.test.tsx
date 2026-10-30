import '@stagistic/ui/styles/base.css';

import {requireValue} from '@stagistic/shared';
import {createRoot} from 'react-dom/client';
import {expect, it} from 'vite-plus/test';

import ScriptEditor from '../../Editor';

it('wraps Stage direction with generated parentheses without changing script text', async () => {
    const host = document.createElement('div');

    document.body.append(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{initialValue: {
                type: 'doc',
                content: [
                    {
                        type: 'stageDirection',
                        attrs: {id: 'direction'},
                        content: [{type: 'text', text: 'She exits.'}],
                    },
                ],
            }}}
            settings={{scriptSettings: {blocks: {stageDirection: {parenWrap: true}}}}}
        />,
    );
    try {
        await expect.poll(() => host.querySelector('p[blocktype="stageDirection"]')).toBeTruthy();

        const paragraph = requireValue(host.querySelector<HTMLElement>('p[blocktype="stageDirection"]'));

        await expect.poll(() => getComputedStyle(paragraph, '::before').content).toBe('"("');
        expect(getComputedStyle(paragraph, '::after').content).toBe('")"');
        expect(paragraph.textContent).toBe('She exits.');
    } finally {
        root.unmount();
        host.remove();
    }
});
