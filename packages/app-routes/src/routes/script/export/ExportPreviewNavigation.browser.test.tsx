import '@stagistic/ui/styles/base.css';

import type {ScriptData} from '@stagistic/export';
import {
    createDefaultScriptDocument,
    DEFAULT_EDITOR_SETTINGS,
    type ScriptDocument,
} from '@stagistic/script';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ExportPreview} from './ExportPreview';
import {
    ExportProvider,
    useExportContext,
} from './ExportProvider';

vi.mock('./renderPdfToCanvases', () => ({
    renderPdfToCanvases: () => Promise.resolve(Array.from({length: 3}, () => {
        const canvas = document.createElement('canvas');

        canvas.style.width = '480px';
        canvas.style.height = '680px';

        return canvas;
    })),
}));

const roots: Root[] = [];

const toScriptData = (doc: ScriptDocument): ScriptData => ({
    doc,
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    scriptTitle: 'Draft',
    titlePage: null,
});

const ArtifactProbe = () => {
    const {setArtifact} = useExportContext();

    useEffect(() => {
        setArtifact(new Blob(['pdf'], {type: 'application/pdf'}));
    }, [setArtifact]);

    return null;
};

const mountPreview = () => {
    const scriptDocument = createDefaultScriptDocument('scene-1');
    const host = document.createElement('div');
    const root = createRoot(host);

    scriptDocument.content[1] = {
        ...scriptDocument.content[1],
        content: [{type: 'text', text: 'A room.'}],
    };
    document.body.appendChild(host);
    root.render(
        <ExportProvider script={toScriptData(scriptDocument)} settings={DEFAULT_EDITOR_SETTINGS}>
            <ArtifactProbe />
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

describe('export preview page navigation', () => {
    it('keeps zoom left, pagination centered, and download right', async () => {
        const host = mountPreview();
        const pageNumberInput = await poll(
            () => {
                const input = host.querySelector<HTMLInputElement>('input[aria-label="Page number"]');

                return input && !input.disabled && input.value === '1' ? input : null;
            },
            'enabled page number input',
        );
        const preview = host.querySelector<HTMLElement>('[aria-label="PDF preview"]');
        const pagination = host.querySelector<HTMLElement>('[aria-label="Preview page navigation"]');
        const zoomOut = host.querySelector<HTMLButtonElement>('button[aria-label="Zoom out"]');
        const download = Array.from(host.querySelectorAll('button'))
            .find(button => button.textContent?.trim() === 'Download PDF');

        if (!preview || !pagination || !zoomOut || !download) {
            throw new Error('Expected all preview toolbar controls');
        }

        const previewBounds = preview.getBoundingClientRect();
        const paginationBounds = pagination.getBoundingClientRect();
        const zoomBounds = zoomOut.getBoundingClientRect();
        const downloadBounds = download.getBoundingClientRect();
        const previewCenter = previewBounds.left + (previewBounds.width / 2);
        const paginationCenter = paginationBounds.left + (paginationBounds.width / 2);

        expect(pageNumberInput.value).toBe('1');
        expect(zoomBounds.right).toBeLessThan(paginationBounds.left);
        expect(Math.abs(previewCenter - paginationCenter)).toBeLessThan(1);
        expect(downloadBounds.left).toBeGreaterThan(paginationBounds.right);
        expect(host.textContent).not.toContain('3 pages');
    });

    it('moves between rendered pages from the preview toolbar', async () => {
        const host = mountPreview();
        const nextButton = await poll(
            () => {
                const button = host.querySelector<HTMLButtonElement>('button[aria-label="Next page"]');

                return button && !button.disabled ? button : null;
            },
            'enabled next page button',
        );
        const previousButton = host.querySelector<HTMLButtonElement>('button[aria-label="Previous page"]');
        const pageNumberInput = host.querySelector<HTMLInputElement>('input[aria-label="Page number"]');

        await poll(() => pageNumberInput?.value === '1', 'initial page number');
        expect(previousButton?.disabled).toBe(true);
        expect(nextButton.disabled).toBe(false);

        nextButton.click();

        await poll(() => pageNumberInput?.value === '2', 'second page indicator');
        expect(previousButton?.disabled).toBe(false);

        nextButton.click();

        await poll(() => pageNumberInput?.value === '3', 'third page indicator');
        expect(nextButton.disabled).toBe(true);
    });

    it('opens the last page when the entered page number is too high', async () => {
        const host = mountPreview();
        const pageNumberInput = await poll(
            () => {
                const input = host.querySelector<HTMLInputElement>('input[aria-label="Page number"]');

                return input && !input.disabled ? input : null;
            },
            'enabled page number input',
        );
        const nextButton = host.querySelector<HTMLButtonElement>('button[aria-label="Next page"]');

        await userEvent.fill(pageNumberInput, '99');
        await userEvent.keyboard('{Enter}');

        await poll(() => pageNumberInput.value === '3', 'clamped page number');
        expect(nextButton?.disabled).toBe(true);
    });

    it('tracks the most visible page while scrolling the preview', async () => {
        const host = mountPreview();

        const pageNumberInput = await poll(
            () => host.querySelector<HTMLInputElement>('input[aria-label="Page number"]'),
            'page number input',
        );

        await poll(() => pageNumberInput.value === '1', 'initial page indicator');

        const pageFrames = Array.from(host.querySelectorAll('canvas'))
            .map(canvas => canvas.parentElement)
            .filter((page): page is HTMLElement => page !== null);
        const pages = pageFrames[0]?.parentElement;

        if (!pages || pageFrames.length !== 3) {
            throw new Error('Expected three rendered preview pages');
        }

        pages.getBoundingClientRect = () => DOMRect.fromRect({
            x: 0,
            y: 100,
            width: 480,
            height: 500,
        });
        pageFrames[0].getBoundingClientRect = () => DOMRect.fromRect({
            x: 0,
            y: -500,
            width: 480,
            height: 680,
        });
        pageFrames[1].getBoundingClientRect = () => DOMRect.fromRect({
            x: 0,
            y: 200,
            width: 480,
            height: 680,
        });
        pageFrames[2].getBoundingClientRect = () => DOMRect.fromRect({
            x: 0,
            y: 900,
            width: 480,
            height: 680,
        });

        pages.dispatchEvent(new Event('scroll', {bubbles: true}));

        await poll(() => pageNumberInput.value === '2', 'scrolled page indicator');
    });
});
