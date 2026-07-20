import '@stagistic/ui/styles/base.css';

import type {
    EditorSettingsOverride,
    ScriptDocument,
} from '@stagistic/script';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import ScriptEditor from '../Editor';
import {createEditorSurfaceCache, type EditorSurfaceCache} from './editorSurfaceCache';

const createDocument = (): ScriptDocument => ({
    type: 'doc',
    content: Array.from({length: 40}, (_, index) => ({
        type: 'stageDirection',
        attrs: {id: `block-${index}`},
        content: [
            {
                type: 'text',
                text: `Line ${index}: the quick brown fox jumps over the lazy dog.`,
            },
        ],
    })),
});

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean, timeoutMs = 10_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error('Timed out waiting for condition');
};

const mountEditor = (initialValue: ScriptDocument, surfaceCache?: EditorSurfaceCache) => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue,
                persistentCharacters: [],
            }}
            layout={{autoFocus: false}}
            surfaceCache={surfaceCache}
        />,
    );
    mountedRoots.push(root);
};

const unmountAll = () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
};

const editorDom = () => document.querySelector<HTMLElement>('[data-editor]');

const SettingsHarness = ({surfaceCache}: {surfaceCache: EditorSurfaceCache}) => {
    const [settings, setSettings] = useState<EditorSettingsOverride>({
        initialPages: {
            castAndPlace: {showOutline: true},
        },
    });

    return (
        <>
            <button
                data-testid="change-export-setting"
                onClick={() => setSettings(current => ({
                    ...current,
                    initialPages: {
                        ...current.initialPages,
                        castAndPlace: {
                            ...current.initialPages?.castAndPlace,
                            showOutline: !current.initialPages?.castAndPlace?.showOutline,
                        },
                    },
                }))}
                type="button"
            >
                Change export setting
            </button>
            <button
                data-testid="change-live-settings"
                onClick={() => setSettings(current => ({
                    ...current,
                    page: {
                        ...current.page,
                        heightPx: current.page?.heightPx === 1200 ? 1300 : 1200,
                    },
                    typography: {
                        ...current.typography,
                        lineHeight: current.typography?.lineHeight === 1.5 ? 1.6 : 1.5,
                    },
                    headerFooter: {
                        header: {
                            left: {
                                text: 'Updated header',
                                isHiddenInEditor: false,
                            },
                        },
                    },
                }))}
                type="button"
            >
                Change live settings
            </button>
            <button
                data-testid="change-block-setting"
                onClick={() => setSettings(current => ({
                    ...current,
                    blocks: {
                        ...current.blocks,
                        dialogue: {
                            ...current.blocks?.dialogue,
                            spacingBeforeEm: current.blocks?.dialogue?.spacingBeforeEm === 1 ? 2 : 1,
                        },
                    },
                }))}
                type="button"
            >
                Change block setting
            </button>
            <ScriptEditor
                document={{
                    initialValue: createDocument(),
                    persistentCharacters: [],
                }}
                layout={{autoFocus: false}}
                settings={{scriptSettings: settings}}
                surfaceCache={surfaceCache}
            />
        </>
    );
};

const mountSettingsHarness = (surfaceCache: EditorSurfaceCache) => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<SettingsHarness surfaceCache={surfaceCache} />);
    mountedRoots.push(root);
};

afterEach(unmountAll);

describe('editor surface reuse', () => {
    it('keeps live settings mounted and rebuilds for block settings', async () => {
        const cache = createEditorSurfaceCache();

        mountSettingsHarness(cache);
        await waitFor(() => editorDom() !== null);

        const initialDom = editorDom();
        const exportSettingButton = document.querySelector<HTMLElement>(
            '[data-testid="change-export-setting"]',
        );

        await userEvent.click(exportSettingButton as HTMLElement);

        expect(editorDom()).toBe(initialDom);

        const liveSettingsButton = document.querySelector<HTMLElement>(
            '[data-testid="change-live-settings"]',
        );

        await userEvent.click(liveSettingsButton as HTMLElement);
        await waitFor(() => document
            .querySelector('[data-header-footer-layer="true"]')
            ?.textContent
            ?.includes('Updated header') === true);

        expect(editorDom()).toBe(initialDom);

        const blockSettingButton = document.querySelector<HTMLElement>(
            '[data-testid="change-block-setting"]',
        );

        await userEvent.click(blockSettingButton as HTMLElement);
        await waitFor(() => editorDom() !== initialDom);

        expect(editorDom()).not.toBe(initialDom);

        cache.destroy();
    });

    it('re-attaches the same live instance and keeps typed content', async () => {
        const cache = createEditorSurfaceCache();
        const documentValue = createDocument();

        mountEditor(documentValue, cache);
        await waitFor(() => editorDom() !== null);

        const firstDom = editorDom();

        // Type into the live editor so its content diverges from initialValue.
        firstDom?.focus();
        await userEvent.click(firstDom as HTMLElement);
        await userEvent.keyboard('XYZQ');
        await waitFor(() => Boolean(firstDom?.textContent?.includes('XYZQ')));

        unmountAll();

        // The cache keeps the instance alive across the unmount.
        mountEditor(documentValue, cache);
        await waitFor(() => editorDom() !== null);

        const secondDom = editorDom();

        expect(secondDom).toBe(firstDom);
        expect(secondDom?.textContent).toContain('XYZQ');

        cache.destroy();
    });

    it('rebuilds from the initial value without a cache (previous behavior)', async () => {
        const documentValue = createDocument();

        mountEditor(documentValue);
        await waitFor(() => editorDom() !== null);

        const firstDom = editorDom();

        firstDom?.focus();
        await userEvent.click(firstDom as HTMLElement);
        await userEvent.keyboard('XYZQ');
        await waitFor(() => Boolean(firstDom?.textContent?.includes('XYZQ')));

        unmountAll();

        mountEditor(documentValue);
        await waitFor(() => editorDom() !== null);

        const secondDom = editorDom();

        expect(secondDom).not.toBe(firstDom);
        expect(secondDom?.textContent).not.toContain('XYZQ');
    });

    it('rebuilds when the initial content changes (signature miss)', async () => {
        const cache = createEditorSurfaceCache();

        mountEditor(createDocument(), cache);
        await waitFor(() => editorDom() !== null);

        const firstDom = editorDom();

        unmountAll();

        const changedDocument: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'other-block'},
                    content: [{type: 'text', text: 'A different script.'}],
                },
            ],
        };

        mountEditor(changedDocument, cache);
        await waitFor(() => editorDom() !== null);

        const secondDom = editorDom();

        expect(secondDom).not.toBe(firstDom);
        expect(secondDom?.textContent).toContain('A different script.');

        cache.destroy();
    });
});
