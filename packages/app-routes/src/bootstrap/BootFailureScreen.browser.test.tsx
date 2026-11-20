import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {BootFailureScreen} from './BootFailureScreen';

const roots: Root[] = [];

const mount = (element: React.ReactElement) => {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);

    roots.push(root);
    root.render(element);

    return container;
};

const findButton = (container: HTMLElement, label: string) => [...container.querySelectorAll('button')].find(button => button.textContent === label);

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
});

describe('boot failure screen', () => {
    it('says an older version is running and does not offer a reload', async () => {
        const container = mount(<BootFailureScreen failure={{kind: 'older-version-running', message: ''}} />);

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
            'An older version of Stagistic is running',
        );
        expect(container.textContent).toContain('Close it');
        expect(container.textContent).toContain('Tabs of this Release can stay open');
        expect(container.textContent).not.toMatch(/one tab|single tab|only works/i);
        expect(container.querySelector('button')).toBeNull();
    });

    it('offers a reload when the database is newer than the app', async () => {
        const onReload = vi.fn();
        const container = mount(
            <BootFailureScreen
                failure={{kind: 'database-newer-than-app', message: 'Database migration 9999_x is newer than this app.'}}
                onReload={onReload}
            />,
        );

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
            'Your scripts need a newer Release of Stagistic',
        );
        findButton(container, 'Reload')?.click();
        expect(onReload).toHaveBeenCalledTimes(1);
    });

    it('explains a failed migration, shows its id and renders the extra actions', async () => {
        const container = mount(
            <BootFailureScreen
                failure={{
                    kind: 'migration-failed',
                    message: 'Migration 0042_x failed.',
                    migrationId: '0042_x',
                }}
                actions={<button type="button">Download backup</button>}
            />,
        );

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
            'Stagistic could not update your database',
        );
        expect(container.textContent).toContain('0042_x');
        expect(findButton(container, 'Download backup')).toBeDefined();
    });

    it('falls back to a generic message with technical details', async () => {
        const container = mount(<BootFailureScreen failure={{kind: 'unknown', message: 'Worker blew up'}} />);

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
        expect(container.querySelector('pre')?.textContent).toBe('Worker blew up');
        expect(findButton(container, 'Reload')).toBeDefined();
    });
});
