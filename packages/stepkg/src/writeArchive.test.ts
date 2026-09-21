import {unzipSync} from 'fflate';
import {describe, expect, it} from 'vite-plus/test';

import {STEPKG_MEDIA_TYPE} from './constants';
import {writeStepkgArchive} from './writeArchive';

describe('writeStepkgArchive', () => {
    it('creates a standard ZIP while retaining per-file compression policy', async () => {
        const blob = await writeStepkgArchive([
            {path: 'script.stagistic', mediaType: 'text/plain;charset=utf-8', bytes: new TextEncoder().encode('Line one\nLine two\n'), compression: 'deflate'},
            {path: 'assets/att-1/score.pdf', mediaType: 'application/pdf', bytes: new TextEncoder().encode('%PDF-test'), compression: 'store'},
        ]);
        const archive = new Uint8Array(await blob.arrayBuffer());
        const extracted = unzipSync(archive);

        expect(blob.type).toBe(STEPKG_MEDIA_TYPE);
        expect(new TextDecoder().decode(extracted['script.stagistic'])).toBe('Line one\nLine two\n');
        expect(new TextDecoder().decode(extracted['assets/att-1/score.pdf'])).toBe('%PDF-test');
        expect(readCentralDirectoryMethod(archive, 'script.stagistic')).toBe(8);
        expect(readCentralDirectoryMethod(archive, 'assets/att-1/score.pdf')).toBe(0);
    });
});

const readCentralDirectoryMethod = (archive: Uint8Array, target: string): number | undefined => {
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    for (let index = 0; index <= archive.length - 46; index += 1) {
        if (view.getUint32(index, true) !== 0x02014b50) continue;
        const filenameLength = view.getUint16(index + 28, true);
        const extraLength = view.getUint16(index + 30, true);
        const commentLength = view.getUint16(index + 32, true);
        const filename = new TextDecoder().decode(archive.slice(index + 46, index + 46 + filenameLength));
        if (filename === target) return view.getUint16(index + 10, true);
        index += 46 + filenameLength + extraLength + commentLength - 1;
    }
    return undefined;
};
