import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createBackupWriter} from './backupWriter';

const setup = (initialFiles: string[] = []) => {
    const state = {
        marker: 'm1',
        files: [...initialFiles],
        time: new Date(2026, 10, 25, 10, 0, 0),
        dumps: 0,
        failWrite: false,
    };
    const writer = createBackupWriter({
        readMarker: () => Promise.resolve(state.marker),
        dump: () => {
            state.dumps += 1;

            // Identical data, different bytes, like gzip.
            return Promise.resolve(new Uint8Array([state.dumps]));
        },
        writeFile: name => {
            if (state.failWrite) {
                return Promise.reject(new Error('disk full'));
            }

            state.files.push(name);

            return Promise.resolve();
        },
        listNames: () => Promise.resolve(state.files),
        removeFiles: names => {
            state.files = state.files.filter(file => !names.includes(file));

            return Promise.resolve();
        },
        now: () => state.time,
    });

    return {state, writer};
};

describe('createBackupWriter', () => {
    it('does not count a pre-migration backup as a periodic one', async () => {
        const {state, writer} = setup(['stagistic-premigration-20261125-090000.pgdata.gz']);

        await writer.start();

        expect(await writer.writeIfChanged()).toBe(true);
        expect(state.files.some(name => name.startsWith('stagistic-2026'))).toBe(true);
    });

    it('writes the first backup when none exists', async () => {
        const {state, writer} = setup();

        await writer.start();

        expect(await writer.writeIfChanged()).toBe(true);
        expect(state.files).toHaveLength(1);
    });

    it('writes nothing while the data is unchanged, however often it runs', async () => {
        const {state, writer} = setup(['stagistic-20261125-090000.pgdata.gz']);

        await writer.start();

        expect(await writer.writeIfChanged()).toBe(false);
        expect(await writer.writeIfChanged()).toBe(false);
        expect(state.dumps).toBe(0);
    });

    it('writes once after a change and not again until the next change', async () => {
        const {state, writer} = setup(['stagistic-20261125-090000.pgdata.gz']);

        await writer.start();
        state.marker = 'm2';
        expect(await writer.writeIfChanged()).toBe(true);

        state.time = new Date(2026, 10, 25, 10, 15, 0);
        expect(await writer.writeIfChanged()).toBe(false);
        expect(state.files).toHaveLength(2);

        state.marker = 'm3';
        expect(await writer.writeIfChanged()).toBe(true);
    });

    it('keeps the change pending when writing fails', async () => {
        const {state, writer} = setup(['stagistic-20261125-090000.pgdata.gz']);

        await writer.start();
        state.marker = 'm2';
        state.failWrite = true;
        await expect(writer.writeIfChanged()).rejects.toThrow('disk full');

        state.failWrite = false;
        expect(await writer.writeIfChanged()).toBe(true);
    });

    it('writeAlways writes even when unchanged', async () => {
        const {state, writer} = setup(['stagistic-20261125-090000.pgdata.gz']);

        await writer.start();
        await writer.writeAlways();

        expect(state.files).toHaveLength(2);
        expect(await writer.writeIfChanged()).toBe(false);
    });

    it('prunes with the retention rules after writing', async () => {
        const old = Array.from({length: 4}, (_, index) => `stagistic-2026112${index}-000000.pgdata.gz`);
        const {state, writer} = setup(old);

        state.marker = 'm0';
        await writer.writeAlways();

        expect(state.files).toHaveLength(5 - 1);
    });
});
