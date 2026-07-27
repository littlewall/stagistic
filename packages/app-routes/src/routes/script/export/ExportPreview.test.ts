import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {DEFAULT_EXPORT_PREVIEW_ZOOM} from './exportPreviewZoom';

describe('ExportPreview', () => {
    it('starts at 120 percent zoom', () => {
        expect(DEFAULT_EXPORT_PREVIEW_ZOOM).toBe(1.2);
    });
});
