import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {getSceneTextTransform} from './boardSceneCasing';

describe('getSceneTextTransform', () => {
    it('follows the script settings and defaults to uppercase', () => {
        expect(getSceneTextTransform(undefined)).toBe('uppercase');
        expect(getSceneTextTransform({blocks: {scene: {casing: 'normal'}}})).toBe('none');
        expect(getSceneTextTransform({blocks: {scene: {casing: 'lowercase'}}})).toBe('lowercase');
        expect(getSceneTextTransform({blocks: {scene: {casing: 'uppercase'}}})).toBe('uppercase');
    });
});
