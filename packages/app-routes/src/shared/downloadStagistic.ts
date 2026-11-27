import type {SaveFileRequest} from './saveFile';

export const sanitizeFileName = (value: string) => {
    const normalized = value
        .trim()
        // Control chars are intentionally stripped from file names.
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-')
        .replace(/[. ]+$/u, '');

    return normalized || 'Untitled';
};

export const stagisticFileRequest = (scriptTitle: string, content: string): SaveFileRequest => ({
    suggestedName: `${sanitizeFileName(scriptTitle)}.stagistic`,
    data: new Blob([content], {type: 'text/plain;charset=utf-8'}),
});
