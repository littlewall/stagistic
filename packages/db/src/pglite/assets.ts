export const loadPgliteFsBundle = async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load PGlite fs bundle (${response.status})`);
    }

    return response.blob();
};

export const loadPgliteWasmModule = async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load PGlite wasm (${response.status})`);
    }

    return WebAssembly.compile(await response.arrayBuffer());
};
