import {parseStagistic, type TitlePageLogo, type TitlePageSettings, trimOrFallback} from '@stagistic/script';

import logoUrl from './example-logo.png?url&no-inline';
import scoreUrl from './example-score.pdf?url&no-inline';
import source from './example-script.stagistic?raw';
import {type PreparedExampleScript, prepareExampleScriptDocument} from './prepareExampleScriptDocument';

export interface ExampleScriptTemplate extends PreparedExampleScript {
    title: string;
    titlePage: TitlePageSettings;
    score: {
        name: string;
        type: 'application/pdf';
        size: number;
        blob: Blob;
    };
}

const EXAMPLE_LOGO_SIZE = {widthPx: 888, heightPx: 451};

const fetchAsset = async (url: string, label: string, type: string) => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Example ${label} could not be loaded (${response.status}).`);
    }

    const blob = await response.blob();

    if (blob.size === 0 || blob.type !== type) {
        throw new Error(`Example ${label} must be a non-empty ${type} file.`);
    }

    return blob;
};

const readDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener('load', () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }

            reject(new Error('Example logo could not be read.'));
        });
        reader.addEventListener('error', () => reject(new Error('Example logo could not be read.')));
        reader.readAsDataURL(blob);
    });

const loadLogo = async (): Promise<TitlePageLogo> => {
    const blob = await fetchAsset(logoUrl, 'logo', 'image/png');

    return {
        dataUrl: await readDataUrl(blob),
        filename: 'one-small-light-logo.png',
        mimeType: 'image/png',
        ...EXAMPLE_LOGO_SIZE,
        sizeBytes: blob.size,
    };
};

export const loadExampleScriptTemplate = async (): Promise<ExampleScriptTemplate> => {
    const parsed = parseStagistic(source);
    const prepared = prepareExampleScriptDocument(parsed.document);
    const [blob, logo] = await Promise.all([fetchAsset(scoreUrl, 'score', 'application/pdf'), loadLogo()]);

    return {
        ...prepared,
        title: trimOrFallback(parsed.title ?? '', 'Example musical'),
        titlePage: {...parsed.titlePage, logo},
        score: {
            name: 'example-score.pdf',
            type: 'application/pdf',
            size: blob.size,
            blob,
        },
    };
};
