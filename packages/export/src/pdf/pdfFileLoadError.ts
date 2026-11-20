/** A file the PDF export loads late (its worker or a font) is gone, most likely after a deploy. */
export class PdfFileLoadError extends Error {
    override name = 'PdfFileLoadError';
}
