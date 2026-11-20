import {worker} from '@electric-sql/pglite/worker';

// Waits for leadership like the real worker, then never finishes opening.
void worker({init: () => new Promise(() => {})});
