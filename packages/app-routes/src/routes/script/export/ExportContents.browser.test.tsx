import '@stagistic/ui/styles/base.css';

import {createDefaultScriptDocument, DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {createRoot} from 'react-dom/client';
import {
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ExportControlPanel} from './ExportControlPanel';
import {ExportProvider} from './ExportProvider';

// The full editor provides this navigation action; this test only mounts export controls.
vi.mock('../settings/ScriptSettingsModalContext', () => ({useScriptSettingsModal: () => ({openAttributeManagerMusic: () => {}})}));

const select = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
const choose = async (label: string, value: string) => {
    await expect.poll(() => select(label)).toBeTruthy();
    await userEvent.click(requireValue(select(label)));
    await expect.poll(() => options().some(option => option.textContent?.trim() === value)).toBe(true);
    await userEvent.click(requireValue(options().find(option => option.textContent?.trim() === value)));
};
const openInitialPages = async () => {
    const trigger = () => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === 'Opening pages');

    await expect.poll(trigger).toBeTruthy();

    const button = requireValue(trigger());

    if (button.getAttribute('aria-expanded') === 'false') await userEvent.click(button);
};

it('offers music contents only for Integrated score and retains that selection across Basic', async () => {
    const host = document.createElement('div');

    document.body.append(host);

    const root = createRoot(host);

    root.render(
        <ExportProvider
            script={{
                doc: createDefaultScriptDocument('scene'),
                characters: [],
                groups: [],
                initialCharacters: [],
                initialPlaces: [],
                initialVocalRanges: [],
                scriptTitle: 'Draft',
                titlePage: null,
            }}
            settings={DEFAULT_EDITOR_SETTINGS}
        ><ExportControlPanel />
        </ExportProvider>,
    );
    try {
        await openInitialPages();
        await expect.poll(() => select('Show contents as')?.textContent?.trim()).toBe('scenes');
        await userEvent.click(requireValue(select('Show contents as')));
        expect(options().map(option => option.textContent?.trim())).toEqual(['scenes']);
        await userEvent.keyboard('{Escape}');
        await choose('Export type', 'Integrated score');
        await openInitialPages();
        await userEvent.click(requireValue(select('Show contents as')));
        expect(options().map(option => option.textContent?.trim())).toEqual([
            'scenes',
            'musical numbers',
            'scenes and musical numbers',
        ]);
        await userEvent.click(requireValue(options().find(option => option.textContent?.trim() === 'musical numbers')));
        await choose('Export type', 'Basic');
        await openInitialPages();
        await expect.poll(() => select('Show contents as')?.textContent?.trim()).toBe('scenes');
        await choose('Export type', 'Integrated score');
        await openInitialPages();
        await expect.poll(() => select('Show contents as')?.textContent?.trim()).toBe('musical numbers');
    } finally {
        root.unmount();
        host.remove();
    }
});
