export interface ParsedDeepLink {
    scriptId: string,
    blockId?: string,
    sceneId?: string,
}

export const parseDeepLink = (rawUrl: string): ParsedDeepLink | null => {
    try {
        const url = new URL(rawUrl);

        if (url.protocol !== 'stagistic:') {
            return null;
        }

        const path = (url.host ? `${url.host}${url.pathname}` : url.pathname).replace(/^\/+/, '');
        const segments = path.split('/');

        if (segments[0] !== 'script' || !segments[1]) {
            return null;
        }

        const scriptId = decodeURIComponent(segments[1]);
        const blockId = url.searchParams.get('block') ?? undefined;
        const sceneId = url.searchParams.get('scene') ?? undefined;

        return {
            scriptId,
            ...blockId ? {blockId} : {},
            ...sceneId ? {sceneId} : {},
        };
    } catch {
        return null;
    }
};
