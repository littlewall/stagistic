import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    type ScriptStateRecord,
    ScriptStatesModal,
    type ScriptStatesModalProps,
} from './ScriptStatesModal';

let root: Root | null = null;

const STATES: ScriptStateRecord[] = [
    {
        id: 'd2',
        kind: 'draft',
        label: 'Draft 2',
        name: null,
        note: 'new final monologue',
        savedAt: 'Oct 9, 2026',
        origin: null,
        facts: ['4 scenes'],
    },
    {
        id: 'd1',
        kind: 'draft',
        label: 'Draft 1',
        name: null,
        note: null,
        savedAt: 'Oct 8, 2026',
        origin: null,
        facts: [],
    },
    {
        id: 'v1',
        kind: 'version',
        label: 'Festival',
        name: 'Festival',
        note: null,
        savedAt: 'Oct 7, 2026',
        origin: 'from Draft 1',
        facts: [],
    },
];

const settle = () => new Promise(resolve => window.setTimeout(resolve, 20));

const modal = () => document.querySelector('[role="dialog"][aria-label="Drafts and versions"]');

const button = (label: string, scope: ParentNode = document) => {
    const found = [...scope.querySelectorAll<HTMLButtonElement>('button')]
        .find(candidate => candidate.getAttribute('aria-label') === label || candidate.textContent === label);

    if (!found) {
        throw new Error(`Expected button ${label}`);
    }

    return found;
};

const renderModal = (props: Partial<ScriptStatesModalProps> = {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ScriptStatesModal
            isOpen
            activeKind="draft"
            states={STATES}
            shownStateId={null}
            onClose={vi.fn()}
            onSelectKind={vi.fn()}
            onUpdate={vi.fn()}
            onDelete={vi.fn()}
            onOpen={vi.fn()}
            onRestore={vi.fn()}
            onRestoreAsNew={vi.fn()}
            {...props}
        />,
    );
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('ScriptStatesModal', () => {
    it('lists one kind and offers saving only when given', async () => {
        renderModal({onCreate: vi.fn()});
        await settle();

        const items = [...modal()!.querySelectorAll('[aria-label="Draft list"] li button')].map(item => item.textContent);

        expect(items).toEqual(['Draft 2Oct 9, 2026 · new final monologue', 'Draft 1Oct 8, 2026']);
        expect(button('Save the current script as a new draft')).toBeTruthy();

        root?.unmount();
        renderModal();
        await settle();

        expect(modal()?.querySelector('[aria-label="Save the current script as a new draft"]')).toBeNull();
    });

    it('needs a name to mark a draft as a version and keeps its note', async () => {
        const onUpdate = vi.fn();

        renderModal({onUpdate});
        await settle();
        await userEvent.click(button('Mark as version…'));
        await settle();

        const submit = button('Mark as version');

        expect(submit.disabled).toBe(true);

        await userEvent.type(modal()!.querySelector<HTMLInputElement>('input[autocomplete="off"]')!, 'Tour 2027');
        await userEvent.click(submit);

        expect(onUpdate).toHaveBeenCalledWith('d2', {
            kind: 'version',
            name: 'Tour 2027',
            note: 'new final monologue',
        });
    });

    it('deletes only after confirmation', async () => {
        const onDelete = vi.fn();

        renderModal({onDelete});
        await settle();
        await userEvent.click(button('Delete Draft 2'));
        await settle();

        expect(onDelete).not.toHaveBeenCalled();

        await userEvent.click(button('Delete', document.querySelector('dialog[open]')!));

        expect(onDelete).toHaveBeenCalledWith('d2');
    });

    it('cannot open the state already on screen', async () => {
        const onOpen = vi.fn();

        renderModal({shownStateId: 'd2', onOpen});
        await settle();

        expect(button('On screen', modal()!.querySelector('section[aria-label="Draft 2 actions"]')!).disabled).toBe(true);

        await userEvent.click(button('Draft 1Oct 8, 2026'));
        await userEvent.click(button('Open'));

        expect(onOpen).toHaveBeenCalledWith('d1');
    });
});
