import {
    describe, expect, it,
} from 'vite-plus/test';

import {PACKAGE_NAME} from './index';

describe('@stagistic/script-pagination', () => {
    it('exposes its package name marker', () => {
        expect(PACKAGE_NAME).toBe('@stagistic/script-pagination');
    });
});
