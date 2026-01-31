export const createNodeId = () => {
    const globalCrypto = (globalThis as {crypto?: {randomUUID?: () => string}}).crypto;

    if (globalCrypto?.randomUUID) {
        return globalCrypto.randomUUID();
    }

    const now = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);

    return `${now}-${rand}`;
};
