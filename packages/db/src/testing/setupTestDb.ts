import {beforeAll} from 'vite-plus/test';

import {loadMigratedDataDir} from './createTestDb';

// Cold PGlite start + migrations is per-worker setup: keep it out of the first test's timeout.
beforeAll(async () => {
    await loadMigratedDataDir();
});
