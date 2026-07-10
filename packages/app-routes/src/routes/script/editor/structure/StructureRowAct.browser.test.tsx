import {
    useCallback,
    useState,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {StructureRowActStatic} from './StructureRowAct';

const BLOCK_ID = 'act-1';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const getInput = () => document.querySelector('input[aria-label^="Rename act"]') as HTMLInputElement;

/**
 * Mirrors the sidebar's preview lifecycle: drafts are stored verbatim and
 * dropped on blur. `name` is settable from the outside to simulate a rename
 * made in the editor propagating back through live structure.
 */
const Harness = ({onRename}: {onRename: (value: string) => void}) => {
    const [name, setName] = useState('Act');
    const [previewById, setPreviewById] = useState<Record<string, string>>({});

    const handleNamePreview = useCallback((blockId: string, nextName: string) => {
        setPreviewById(prev => ({...prev, [blockId]: nextName}));
    }, []);
    const handleNamePreviewClear = useCallback((blockId: string) => {
        setPreviewById(prev => {
            if (!(blockId in prev)) {
                return prev;
            }

            const next = {...prev};

            delete next[blockId];

            return next;
        });
    }, []);
    const handleRename = useCallback((_blockId: string, nextName: string) => {
        onRename(nextName);
    }, [onRename]);

    return (
        <ul>
            <StructureRowActStatic
                blockId={BLOCK_ID}
                name={name}
                isFirstAct
                namePreview={previewById[BLOCK_ID]}
                onRename={handleRename}
                onNamePreview={handleNamePreview}
                onNamePreviewClear={handleNamePreviewClear}
                onDelete={() => {}}
            />
            <button
                type="button"
                data-testid="editor-rename"
                onClick={() => setName('Editor Edited')}
            >
                editor rename
            </button>
        </ul>
    );
};

const mount = (onRename: (value: string) => void = () => {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    mountedRoots.push(root);
    root.render(<Harness onRename={onRename} />);
};

const typeAtEnd = async (text: string) => {
    const input = getInput();

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    await userEvent.type(input, text);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('StructureRowAct rename input', () => {
    it('keeps spaces while typing a multi-word act name', async () => {
        const committed: string[] = [];

        mount(value => committed.push(value));
        await waitFor(() => getInput() !== null);

        await typeAtEnd(' Two');

        expect(getInput().value).toBe('Act Two');
        expect(committed.at(-1)).toBe('Act Two');
    });

    it('lets an editor rename propagate into the sidebar after the draft is committed', async () => {
        mount();
        await waitFor(() => getInput() !== null);

        // Edit + commit in the sidebar, then edit the same act from the editor.
        await typeAtEnd(' X');
        getInput().blur();
        await userEvent.click(document.querySelector('[data-testid="editor-rename"]') as HTMLElement);

        await waitFor(() => getInput().value === 'Editor Edited');

        expect(getInput().value).toBe('Editor Edited');
    });
});
