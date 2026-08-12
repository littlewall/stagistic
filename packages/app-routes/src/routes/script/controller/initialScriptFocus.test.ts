import {
    createActlessScriptDocument,
    createDefaultScriptDocument,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {shouldAutoFocusInitialScript} from './initialScriptFocus';

describe('shouldAutoFocusInitialScript', () => {
    it('treats the untouched multi-act template as ready for writing', () => {
        expect(shouldAutoFocusInitialScript(createDefaultScriptDocument('scene-1'))).toBe(true);
    });

    it('treats the untouched one-act template as ready for writing', () => {
        expect(shouldAutoFocusInitialScript(createActlessScriptDocument('scene-1'))).toBe(true);
    });

    it('leaves a script with authored content unfocused', () => {
        const document = createDefaultScriptDocument('scene-1');

        document.content[1] = {
            ...document.content[1],
            content: [{type: 'text', text: 'INT. STUDIO - DAY'}],
        };

        expect(shouldAutoFocusInitialScript(document)).toBe(false);
    });
});
