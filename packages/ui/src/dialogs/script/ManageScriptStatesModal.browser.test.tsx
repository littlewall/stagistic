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

import {type ManagedScriptState, ManageScriptStatesModal} from './ManageScriptStatesModal';

let root: Root | null = null;

const STATES: ManagedScriptState[] = [
    {
        id: 'd2',
        kind: 'draft',
        label: 'Draft 2',
        detail: 'Oct 9, 2026 · new final monologue',
        name: null,
        note: 'new final monologue',
    },
    {
        id: 'v1',
        kind: 'version',
        label: 'Festival',
        detail: 'Oct 8, 2026',
        name: 'Festival',
        note: null,
    },
];

const findButton = (label: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')]
        .find(candidate => candidate.getAttribute('aria-label') === label || candidate.textContent === label);

    if (!button) {
        throw new Error(`Expected button ${label}`);
    }

    return button;
};

const renderModal = (handlers: {onUpdate?: () => void, onDelete?: () => void} = {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ManageScriptStatesModal
            isOpen
            states={STATES}
            onClose={vi.fn()}
            onUpdate={handlers.onUpdate ?? vi.fn()}
            onDelete={handlers.onDelete ?? vi.fn()}
        />,
    );
};

const settle = () => new Promise(resolve => window.setTimeout(resolve, 20));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('ManageScriptStatesModal', () => {
    it('offers Mark as version only for drafts', async () => {
        renderModal();
        await settle();

        const labels = [...document.querySelectorAll('dialog[open] button')].map(button => button.textContent);

        expect(labels.filter(label => label === 'Mark as version')).toHaveLength(1);
    });

    it('needs a name to mark a draft as a version and keeps its note', async () => {
        const onUpdate = vi.fn();

        renderModal({onUpdate});
        await settle();
        await userEvent.click(findButton('Mark as version'));
        await settle();

        const submit = findButton('Mark as version');

        expect(submit.disabled).toBe(true);

        await userEvent.type(document.querySelector<HTMLInputElement>('dialog[open] input')!, 'Tour 2027');
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
        await userEvent.click(findButton('Delete Festival'));
        await settle();

        expect(onDelete).not.toHaveBeenCalled();
        expect(document.querySelector('dialog[open]')?.textContent).toContain('Delete permanently?');

        const confirmGroup = document.querySelector('dialog[open] [role="group"][aria-label="Delete Festival?"]');
        const confirm = [...confirmGroup?.querySelectorAll('button') ?? []].find(button => button.textContent === 'Delete');

        await userEvent.click(confirm!);

        expect(onDelete).toHaveBeenCalledWith('v1');
    });
});
