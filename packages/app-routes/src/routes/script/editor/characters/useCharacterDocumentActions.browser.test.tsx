import type {ScriptDocument} from '@stagistic/script';
import {useRef, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {useCharacterDocumentActions} from './useCharacterDocumentActions';

const roots: Root[] = [];

const documentWithCharacter: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'character',
            attrs: {
                id: 'block-1',
                characterRefs: {ALICE: 'character-1'},
            },
            content: [{type: 'text', text: 'ALICE'}],
        },
    ],
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for document action');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = ({handleAutoSave}: {
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
}) => {
    const valueRef = useRef(documentWithCharacter);
    const [override, setOverride] = useState<ScriptDocument | null>(null);
    const actions = useCharacterDocumentActions({
        getEditorValue: () => valueRef.current,
        setEditorValue: value => {
            if (value) {
                valueRef.current = value;
            }
        },
        setEditorOverrideValue: setOverride,
        handleAutoSave,
        getCharacterNameForBlockType: name => name,
    });

    return (
        <div>
            <output>{override ? JSON.stringify(override) : ''}</output>
            <button
                type="button"
                onClick={() => {
                    void actions.unlinkCharacter('character-1');
                }}
            >
                Unlink
            </button>
        </div>
    );
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useCharacterDocumentActions', () => {
    it('retains the transformed document when autosave reports failure', async () => {
        const handleAutoSave = vi.fn(() => Promise.resolve(false));
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(<Harness handleAutoSave={handleAutoSave} />);
        await waitFor(() => Boolean(host.querySelector('button')));

        host.querySelector<HTMLButtonElement>('button')?.click();
        await waitFor(() => Boolean(host.querySelector('output')?.textContent));

        expect(host.querySelector('output')?.textContent).not.toContain('character-1');
        expect(handleAutoSave).toHaveBeenCalledTimes(1);
    });
});
