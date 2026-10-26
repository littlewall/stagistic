import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {ChangeSummary} from './ChangeSummary';

let root: Root | null = null;

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('ChangeSummary', () => {
    it('lists each outcome with its label and colours only the labels by tone', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(
            <ChangeSummary
                items={[
                    {
                        tone: 'in',
                        label: 'Restored',
                        text: 'Text',
                    },
                    {
                        tone: 'kept',
                        label: 'Kept',
                        text: 'Settings',
                    },
                    {
                        tone: 'out',
                        label: 'Dropped',
                        text: 'Comments',
                    },
                ]}
            />,
        );

        await vi.waitFor(() => expect(host.querySelectorAll('li')).toHaveLength(3));

        const items = [...host.querySelectorAll('li')];
        const tagColor = (index: number) => getComputedStyle(items[index]?.firstElementChild ?? host).color;
        const textColor = getComputedStyle(items[0]?.lastElementChild ?? host).color;

        expect(items.map(item => item.textContent)).toEqual([
            'RestoredText',
            'KeptSettings',
            'DroppedComments',
        ]);
        expect(new Set([
            tagColor(0),
            tagColor(1),
            tagColor(2),
        ]).size).toBe(3);
        expect([tagColor(0), tagColor(2)]).not.toContain(textColor);
    });
});
