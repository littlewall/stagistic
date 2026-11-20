import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createEditorFocusState, readEditorFocusBlockId} from './editorFocusState';

describe('editor focus state', () => {
    it('round-trips a block id', () => {
        expect(readEditorFocusBlockId(createEditorFocusState('scene-1'))).toBe('scene-1');
    });

    it.each([
        null,
        undefined,
        'scene-1',
        {},
        {focusBlockId: ''},
        {focusBlockId: 4},
    ])('ignores %j', state => {
        expect(readEditorFocusBlockId(state)).toBeNull();
    });
});
