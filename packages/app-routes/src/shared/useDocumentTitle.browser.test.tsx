import {flushSync} from 'react-dom';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useDocumentTitle} from './useDocumentTitle';

const roots: Root[] = [];

const TitleProbe = ({context}: {context?: string}) => {
    useDocumentTitle(context);

    return null;
};

const waitForTitle = async (expected: string) => {
    await expect.poll(() => document.title).toBe(expected);
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
});

describe('useDocumentTitle', () => {
    it('updates the title in the same commit as the route', () => {
        document.title = 'Previous route';

        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);

        flushSync(() => {
            root.render(<TitleProbe context="Next route" />);
        });

        expect(document.title).toBe('Next route — Stagistic Editor');
    });

    it('updates with live context and restores the previous title on unmount', async () => {
        document.title = 'Previous title';

        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);

        root.render(<TitleProbe context="First Draft" />);
        await waitForTitle('First Draft — Stagistic Editor');

        root.render(<TitleProbe context="Second Draft" />);
        await waitForTitle('Second Draft — Stagistic Editor');

        root.unmount();
        roots.splice(roots.indexOf(root), 1);

        expect(document.title).toBe('Previous title');
        host.remove();
    });
});
