import '@stagistic/ui/styles/base.css';

import type {ScriptData} from '@stagistic/export';
import {
    createDefaultScriptDocument,
    DEFAULT_EDITOR_SETTINGS,
    type ScriptDocument,
} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {ExportControlPanel} from './ExportControlPanel';
import {ExportPreview} from './ExportPreview';
import {ExportProvider} from './ExportProvider';

vi.mock('./renderPdfToCanvases', () => ({
    renderPdfToCanvases: () => Promise.resolve([]),
}));

const roots: Root[] = [];

const toScriptData = (doc: ScriptDocument): ScriptData => ({
    doc,
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    initialVocalRanges: [],
    scriptTitle: 'Draft',
    titlePage: null,
});

const mountExport = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <ExportProvider
            script={toScriptData(createDefaultScriptDocument('scene-1'))}
            settings={DEFAULT_EDITOR_SETTINGS}
        >
            <ExportControlPanel />
            <ExportPreview />
        </ExportProvider>,
    );
    roots.push(root);

    return host;
};

const poll = async <T, >(getValue: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('export accessibility structure', () => {
    it('keeps the page h1 out of the complementary landmark', async () => {
        mountExport();

        const h1 = await poll(() => document.querySelector('h1'), 'export h1');
        const complementary = document.querySelector('[aria-label="Export controls"]');

        expect(complementary?.contains(h1)).toBe(false);
    });

    it('gives the PDF preview region its own heading', async () => {
        mountExport();

        await poll(() => document.querySelector('h1'), 'export h1');

        const preview = document.querySelector('[aria-label="PDF preview"]');

        expect(preview?.querySelector('h1, h2, h3, h4, h5, h6')).not.toBeNull();
    });

    it('places the download action in the PDF preview toolbar', async () => {
        mountExport();

        const preview = await poll(
            () => document.querySelector<HTMLElement>('[aria-label="PDF preview"]'),
            'PDF preview',
        );
        const controlPanelHeading = document.querySelector('h1');
        const controlPanelHeader = controlPanelHeading?.parentElement;
        const previewDownload = Array.from(preview.querySelectorAll('button'))
            .find(button => button.textContent?.trim() === 'Download PDF');

        expect(previewDownload).not.toBeUndefined();
        expect(controlPanelHeader?.textContent).not.toContain('Download PDF');
    });

    it('does not reuse the same heading text for unrelated Characters controls', async () => {
        mountExport();

        await poll(() => document.querySelector('h1'), 'export h1');

        const headingTexts = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(heading => heading.textContent?.trim())
            .filter(text => text === 'Characters');

        expect(headingTexts.length).toBeLessThan(2);
    });
});
