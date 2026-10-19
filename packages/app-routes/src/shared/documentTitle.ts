const BASE_DOCUMENT_TITLE = 'Stagistic Editor';

export const formatDocumentTitle = (context?: string) => {
    const normalizedContext = context?.trim();

    return normalizedContext
        ? `${normalizedContext} — ${BASE_DOCUMENT_TITLE}`
        : BASE_DOCUMENT_TITLE;
};
