import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createSaveFile} from './saveFile';

const setup = (path: string | null, writeError?: Error) => {
    const write = vi.fn(() => (writeError ? Promise.reject(writeError) : Promise.resolve()));
    const pickPath = vi.fn(() => Promise.resolve(path));
    const onError = vi.fn();

    return {
        write,
        pickPath,
        onError,
        saveFile: createSaveFile({
            pickPath,
            write,
            onError,
        }),
    };
};

describe('desktop saveFile', () => {
    it('writes the blob bytes to the chosen path', async () => {
        const {
            saveFile,
            write,
            pickPath,
        } = setup('/tmp/Play.pdf');

        await saveFile({data: new Blob(['abc']), suggestedName: 'Play.pdf'});

        expect(pickPath).toHaveBeenCalledWith('Play.pdf');
        expect(write).toHaveBeenCalledWith('/tmp/Play.pdf', new Uint8Array([
            97,
            98,
            99,
        ]));
    });

    it('writes raw bytes as given', async () => {
        const {saveFile, write} = setup('/tmp/a.stepkg');
        const bytes = new Uint8Array([1, 2]);

        await saveFile({data: bytes, suggestedName: 'a.stepkg'});

        expect(write).toHaveBeenCalledWith('/tmp/a.stepkg', bytes);
    });

    it('does nothing on cancel', async () => {
        const {
            saveFile,
            write,
            onError,
        } = setup(null);

        await saveFile({data: new Blob(['x']), suggestedName: 'a.pdf'});

        expect(write).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    it('reports a failed write', async () => {
        const failure = new Error('disk full');
        const {saveFile, onError} = setup('/tmp/a.pdf', failure);

        await saveFile({data: new Blob(['x']), suggestedName: 'a.pdf'});

        expect(onError).toHaveBeenCalledWith(failure);
    });
});
