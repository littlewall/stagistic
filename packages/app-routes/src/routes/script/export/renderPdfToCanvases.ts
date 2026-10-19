import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const renderPage = async (page: pdfjs.PDFPageProxy, scale: number): Promise<HTMLCanvasElement> => {
    // Render at device resolution so the preview stays sharp on HiDPI screens.
    const pixelRatio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({scale: scale * pixelRatio});
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context unavailable');
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${canvas.width / pixelRatio}px`;
    canvas.style.height = `${canvas.height / pixelRatio}px`;

    await page.render({
        canvas,
        canvasContext: context,
        viewport,
    }).promise;

    return canvas;
};

export const renderPdfToCanvases = async (data: ArrayBuffer, scale: number): Promise<HTMLCanvasElement[]> => {
    const pdf = await pdfjs.getDocument({data}).promise;
    const canvases: HTMLCanvasElement[] = [];

    try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);

            canvases.push(await renderPage(page, scale));
        }

        return canvases;
    } finally {
        await pdf.destroy();
    }
};
