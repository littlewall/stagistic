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

import ScriptEditor from '../../../Editor';

const createLongDocument = (): ScriptDocument => ({
    type: 'doc',
    content: Array.from({length: 120}, (_, index) => ({
        type: 'stageDirection',
        attrs: {id: `block-${index}`},
        content: [
            {
                type: 'text',
                text: `Line ${index}: the quick brown fox jumps over the lazy dog repeatedly.`,
            },
        ],
    })),
});

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean): Promise<void> => {
    const deadline = Date.now() + 3000;

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

const holdAnimationFrames = () => {
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;

    window.requestAnimationFrame = callback => {
        const id = nextId;

        nextId += 1;
        callbacks.set(id, callback);

        return id;
    };
    window.cancelAnimationFrame = id => {
        callbacks.delete(id);
    };

    return {
        flush: () => {
            let pass = 0;

            while (callbacks.size > 0 && pass < 20) {
                const pending = [...callbacks.values()];

                callbacks.clear();
                pending.forEach(callback => callback(performance.now()));
                pass += 1;
            }
        },
        restore: () => {
            window.requestAnimationFrame = originalRequestAnimationFrame;
            window.cancelAnimationFrame = originalCancelAnimationFrame;
        },
    };
};

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector}`);
};

const waitForCount = async (selector: string, minimum: number): Promise<number> => {
    const deadline = Date.now() + 3000;

    while (Date.now() < deadline) {
        const count = document.querySelectorAll(selector).length;

        if (count >= minimum) {
            return count;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 25);
        });
    }

    return document.querySelectorAll(selector).length;
};

const renderEditor = (scriptSettings?: EditorSettingsOverride) => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue: createLongDocument(),
                persistentCharacters: [],
            }}
            settings={{scriptSettings}}
            layout={{autoFocus: true}}
        />,
    );

    mountedRoots.push(root);
};

const SettingsHarness = () => {
    const [scriptSettings, setScriptSettings] = useState<EditorSettingsOverride>({
        visual: {characterColorSaturation: 0.5},
    });

    return (
        <>
            <button
                data-testid="replace-editor"
                onClick={() => setScriptSettings({
                    visual: {characterColorSaturation: 0.75},
                })}
                type="button"
            >Replace editor
            </button>
            <ScriptEditor
                document={{
                    initialValue: createLongDocument(),
                    persistentCharacters: [],
                }}
                settings={{scriptSettings}}
                layout={{autoFocus: true}}
            />
        </>
    );
};

const renderSettingsHarness = () => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<SettingsHarness />);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('pagination', () => {
    it('does not bring the initial loader back after replacing a visible editor', async () => {
        const animationFrames = holdAnimationFrames();

        try {
            renderSettingsHarness();

            const editorRoot = await waitForElement<HTMLElement>('[data-editor-ready]');

            expect(editorRoot.dataset.editorReady).toBe('false');
            animationFrames.flush();
            await waitFor(() => editorRoot.dataset.editorReady === 'true');

            const previousEditor = document.querySelector('[data-editor="true"]');
            const replaceButton = await waitForElement<HTMLButtonElement>(
                '[data-testid="replace-editor"]',
            );
            let loaderReturned = false;
            const loaderObserver = new MutationObserver(records => {
                loaderReturned ||= records.some(record => [...record.addedNodes].some(node => {
                    if (!(node instanceof Element)) {
                        return false;
                    }

                    return node.matches('[role="status"]')
                        || Boolean(node.querySelector('[role="status"]'));
                }));
            });

            loaderObserver.observe(document.body, {childList: true, subtree: true});
            replaceButton.click();
            await waitFor(() => document.querySelector('[data-editor="true"]') !== previousEditor);
            loaderObserver.disconnect();

            const nextEditorRoot = await waitForElement<HTMLElement>('[data-editor-ready]');
            const nextEditor = document.querySelector('[data-editor="true"]');

            expect(nextEditor).not.toBe(previousEditor);
            expect(nextEditorRoot.dataset.editorReady).toBe('true');
            expect(document.querySelector('[role="status"]')).toBeNull();
            expect(loaderReturned).toBe(false);
        } finally {
            animationFrames.restore();
        }
    });

    it('keeps the loader visible until script, header, and footer can paint together', async () => {
        const animationFrames = holdAnimationFrames();

        try {
            renderEditor({
                headerFooter: {
                    header: {
                        left: {
                            text: 'Header ready',
                            isHiddenInEditor: false,
                        },
                    },
                    footer: {
                        center: {text: 'Footer ready'},
                    },
                },
            });

            await waitForElement('[contenteditable="true"]');

            const editorRoot = await waitForElement<HTMLElement>('[data-editor-ready]');
            const canvasHost = await waitForElement<HTMLElement>('[data-editor-canvas-host="true"]');

            expect(editorRoot.dataset.editorReady).toBe('false');
            expect(document.querySelector('[role="status"]')?.textContent).toContain('Laying out pages');
            expect(window.getComputedStyle(canvasHost).visibility).toBe('visible');

            animationFrames.flush();

            await waitFor(() => editorRoot.dataset.editorReady === 'true');

            const headerFooterLayer = await waitForElement<HTMLElement>(
                '[data-header-footer-layer="true"]',
            );

            expect(document.querySelector('[role="status"]')).toBeNull();
            expect(headerFooterLayer.textContent).toContain('Header ready');
            expect(headerFooterLayer.textContent).toContain('Footer ready');
        } finally {
            animationFrames.restore();
        }
    });

    it('inserts a page-break divider when content overflows a single page', async () => {
        renderEditor();

        await waitForElement('[contenteditable="true"]');

        // The trailing spacer is always present; a divider marks a real page break.
        const dividerCount = await waitForCount('[data-pagination-divider="true"]', 1);

        expect(dividerCount).toBeGreaterThanOrEqual(1);
    });
});
