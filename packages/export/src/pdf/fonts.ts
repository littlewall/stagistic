import type {jsPDF} from 'jspdf';

const COURIER_PRIME_FAMILY = 'CourierPrime';

const FONT_DEFINITIONS = [
    {
        fileName: 'courier-prime-regular.ttf',
        style: 'normal',
        url: new URL('./fonts/courier-prime-regular.ttf', import.meta.url),
    },
    {
        fileName: 'courier-prime-bold.ttf',
        style: 'bold',
        url: new URL('./fonts/courier-prime-bold.ttf', import.meta.url),
    },
    {
        fileName: 'courier-prime-italic.ttf',
        style: 'italic',
        url: new URL('./fonts/courier-prime-italic.ttf', import.meta.url),
    },
    {
        fileName: 'courier-prime-bold-italic.ttf',
        style: 'bolditalic',
        url: new URL('./fonts/courier-prime-bold-italic.ttf', import.meta.url),
    },
] as const;

type LoadedFont = {
    fileName: string,
    style: string,
    base64: string,
};

let fontDataPromise: Promise<LoadedFont[]> | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return btoa(binary);
};

const loadFontData = async (): Promise<LoadedFont[]> => Promise.all(
    FONT_DEFINITIONS.map(async font => {
        const response = await fetch(font.url);

        if (!response.ok) {
            throw new Error(`Failed to load export font ${font.fileName}`);
        }

        return {
            fileName: font.fileName,
            style: font.style,
            base64: arrayBufferToBase64(await response.arrayBuffer()),
        };
    }),
);

export const registerFonts = async (doc: jsPDF) => {
    fontDataPromise ??= loadFontData();

    const fonts = await fontDataPromise;

    fonts.forEach(font => {
        doc.addFileToVFS(font.fileName, font.base64);
        doc.addFont(font.fileName, COURIER_PRIME_FAMILY, font.style);
    });
};

export const getPdfMonoFontFamily = () => {
    return COURIER_PRIME_FAMILY;
};
