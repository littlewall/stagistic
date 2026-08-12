import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    createActlessScriptDocument,
    createDefaultScriptDocument,
    getScriptBlockId,
    getScriptBlockNodeType,
} from './scriptDocument';
import {ensureSceneHeading} from './scriptDocumentHelpers';

describe('initial script documents', () => {
    it('creates a multi-act document by default', () => {
        const document = createDefaultScriptDocument('scene-1');

        expect(document.content.map(node => getScriptBlockNodeType(node))).toEqual(['act', 'scene']);
        expect(getScriptBlockId(document.content[1])).toBe('scene-1');
    });

    it('creates an actless document with only a scene', () => {
        const document = createActlessScriptDocument('scene-1');

        expect(document.content.map(node => getScriptBlockNodeType(node))).toEqual(['scene']);
        expect(getScriptBlockId(document.content[0])).toBe('scene-1');
    });

    it('keeps an empty actless document actless during loader normalization', () => {
        const document = createActlessScriptDocument('scene-1');
        const normalized = ensureSceneHeading(document);

        expect(normalized.content.map(node => getScriptBlockNodeType(node)))
            .toEqual(['scene']);
        expect(getScriptBlockId(normalized.content[0])).toBe('scene-1');
    });
});
