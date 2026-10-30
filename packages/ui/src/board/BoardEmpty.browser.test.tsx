import '../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Button} from '../atoms/Button/Button';
import {BoardEmpty} from './BoardEmpty';

let root: Root | null = null;

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('BoardEmpty', () => {
    it('states the absence and offers the next step', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(<BoardEmpty action={<Button>Open Editor</Button>}>No scenes yet.</BoardEmpty>);
        await new Promise(resolve => window.setTimeout(resolve, 50));

        const sentence = host.querySelector<HTMLElement>('[class*="notice"]');
        const action = host.querySelector<HTMLElement>('button');

        expect(sentence?.textContent).toBe('No scenes yet.');
        expect(action?.textContent).toBe('Open Editor');
        expect(sentence?.getBoundingClientRect().bottom).toBeLessThanOrEqual(action?.getBoundingClientRect().top ?? 0);
    });
});
