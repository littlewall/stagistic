const sanitizeFileName = (value: string) => {
    const normalized = value
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-')
        .replace(/[. ]+$/u, '');

    return normalized || 'Untitled';
};

export const downloadStagistic = (scriptTitle: string, content: string) => {
    const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${sanitizeFileName(scriptTitle)}.stagistic`;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};
