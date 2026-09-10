import {
    parseStagistic,
    type TitlePageSettings,
    trimOrFallback,
} from '@stagistic/script';

import scoreUrl from './example-score.pdf?url&no-inline';
import source from './example-script.stagistic?raw';
import {
    type PreparedExampleScript,
    prepareExampleScriptDocument,
} from './prepareExampleScriptDocument';

export interface ExampleScriptTemplate extends PreparedExampleScript {
    title: string,
    titlePage: TitlePageSettings,
    score: {
        name: string,
        type: 'application/pdf',
        size: number,
        blob: Blob,
    },
}

export const loadExampleScriptTemplate = async (): Promise<ExampleScriptTemplate> => {
    const parsed = parseStagistic(source);
    const prepared = prepareExampleScriptDocument(parsed.document);
    const response = await fetch(scoreUrl);

    if (!response.ok) {
        throw new Error(`Example score could not be loaded (${response.status}).`);
    }

    const blob = await response.blob();

    if (blob.size === 0 || blob.type !== 'application/pdf') {
        throw new Error('Example score must be a non-empty PDF.');
    }

    return {
        ...prepared,
        title: trimOrFallback(parsed.title ?? '', 'Example musical'),
        titlePage: parsed.titlePage,
        score: {
            name: 'example-score.pdf',
            type: 'application/pdf',
            size: blob.size,
            blob,
        },
    };
};
