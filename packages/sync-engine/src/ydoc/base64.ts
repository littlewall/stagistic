/*
 * Base64 over `btoa`/`atob`: works in windows, workers, Node and Deno. lib0's
 * `toBase64`/`fromBase64` pick the Node variant (`Buffer`) whenever there is no
 * `document`, so they throw in the PGlite leader worker.
 */

const CHUNK = 0x8000;

export const toBase64 = (bytes: Uint8Array) => {
    let binary = '';

    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
    }

    return btoa(binary);
};

export const fromBase64 = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
