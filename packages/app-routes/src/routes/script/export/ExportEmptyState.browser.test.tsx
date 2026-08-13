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

import {ExportPreview} from './ExportPreview';
import {
    ExportProvider,
    useExportContext,
} from './ExportProvider';

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

const mountExport = (doc: ScriptDocument) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <ExportProvider script={toScriptData(doc)} settings={DEFAULT_EDITOR_SETTINGS}>
            <ArtifactProbe />
            <ExportPreview />
        </ExportProvider>,
    );
    roots.push(root);
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

const getDownloadButton = () => Array.from(document.querySelectorAll('button'))
    .find(button => button.textContent?.includes('Download PDF'));

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('empty export state', () => {
    it('explains why preview and download are unavailable for a blank script', async () => {
        mountExport(createDefaultScriptDocument('scene-1'));

        await poll(
            () => document.body.textContent?.includes('Add script content to generate a PDF preview.'),
            'empty export explanation',
        );

        expect(getDownloadButton()?.disabled).toBe(true);
        expect(document.body.textContent).not.toContain('Preview will appear here.');
    });

    it('enables download once the script has printable content', async () => {
        const scriptDocument = createDefaultScriptDocument('scene-1');

        scriptDocument.content[1] = {
            ...scriptDocument.content[1],
            content: [{type: 'text', text: 'A room.'}],
        };
        mountExport(scriptDocument);

        const downloadButton = await poll(
            () => getDownloadButton()?.disabled === false ? getDownloadButton() : null,
            'enabled download',
        );

        expect(downloadButton.disabled).toBe(false);
        expect(document.body.textContent).not.toContain('Add script content to generate a PDF preview.');
    });
});
