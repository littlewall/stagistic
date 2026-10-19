const sanitizeFileName = (value: string) => {
    const normalized = value
        .trim()
        // Control chars are intentionally stripped from file names.
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-')
        .replace(/[. ]+$/u, '');

    return normalized || 'Untitled';
};

export const downloadBlob = (fileName: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

export const downloadStagistic = (scriptTitle: string, content: string) => {
    downloadBlob(`${sanitizeFileName(scriptTitle)}.stagistic`, new Blob([content], {type: 'text/plain;charset=utf-8'}));
};
