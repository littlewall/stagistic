import {describe, expect, it} from 'vite-plus/test';

import {getStepkgAssetPath, isSafeStepkgPath} from './paths';

describe('stepkg paths', () => {
    it('uses a safe leaf filename for assets', () => {
        expect(getStepkgAssetPath({id: 'att-1', filename: '../../score?.pdf'})).toBe('assets/att-1/score-.pdf');
    });

    it('rejects paths that can escape the package', () => {
        expect(isSafeStepkgPath('../manifest.json')).toBe(false);
        expect(isSafeStepkgPath('/assets/a.pdf')).toBe(false);
        expect(isSafeStepkgPath('assets\\a.pdf')).toBe(false);
        expect(isSafeStepkgPath('assets/a.pdf')).toBe(true);
    });
});
