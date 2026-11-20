import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {browserStorageSettingsSection} from './browserStorageSettingsSection';

let root: Root | null = null;

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
});

describe('browserStorageSettingsSection', () => {
    it('is the Storage tab and lists the three points of the browser notice', async () => {
        const host = document.createElement('div');

        document.body.append(host);
        root = createRoot(host);
        root.render(browserStorageSettingsSection.content);

        await expect.poll(() => host.querySelectorAll('li').length).toBe(3);

        expect(browserStorageSettingsSection).toMatchObject({id: 'storage', label: 'Storage'});
        expect(host.textContent).toContain('Scripts are stored only in this browser');
        expect(host.textContent).toContain('Clearing browser data removes them.');
        expect(host.textContent).toContain('Back up your work regularly');
        expect(host.querySelector('dialog')).toBeNull();
    });
});
