import {
    type DatabaseHandover,
    DatabaseHandoverProvider,
    type DatabaseHandoverState,
} from '@stagistic/app-core';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {DatabaseHandoverOverlay} from './DatabaseHandoverOverlay';

const roots: Root[] = [];

const createHandover = (initial: DatabaseHandoverState) => {
    let state = initial;
    const listeners = new Set<() => void>();
    const handover: DatabaseHandover = {
        getState: () => state,
        subscribe: listener => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        addParticipant: () => () => {},
    };

    return {
        handover,
        set: (next: DatabaseHandoverState) => {
            state = next;
            listeners.forEach(listener => listener());
        },
    };
};

const mount = (handover: DatabaseHandover, onReload = vi.fn()) => {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);

    roots.push(root);
    root.render(
        <DatabaseHandoverProvider handover={handover}>
            <DatabaseHandoverOverlay onReload={onReload} />
        </DatabaseHandoverProvider>,
    );

    return {container, onReload};
};

const findButton = (label: string) => [...document.querySelectorAll('button')].find(button => button.textContent === label);
const dialogTitle = () => document.querySelector('dialog h2')?.textContent;

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('database handover overlay', () => {
    it('shows nothing while the tab keeps working', async () => {
        const {container} = mount(createHandover({status: 'idle'}).handover);

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(container.textContent).toBe('');
        expect(document.querySelector('dialog')).toBeNull();
    });

    it('blocks the page while saving, with no way out', async () => {
        mount(createHandover({status: 'saving'}).handover);

        await expect.poll(dialogTitle).toBe('Saving your work');
        expect(document.querySelector('dialog')?.open).toBe(true);
        expect(document.querySelector('dialog button')).toBeNull();

        document.querySelector('dialog')?.dispatchEvent(new Event('cancel', {cancelable: true}));
        expect(document.querySelector('dialog')?.open).toBe(true);
    });

    it('prompts a reload once the work is saved, without suggesting one tab only', async () => {
        const {handover, set} = createHandover({status: 'saving'});
        const {onReload} = mount(handover);

        await expect.poll(dialogTitle).toBe('Saving your work');
        set({status: 'saved'});
        await expect.poll(dialogTitle).toBe('Stagistic has been updated');

        const text = document.querySelector('dialog')?.textContent;

        expect(text).toContain('Your work is saved');
        expect(text).not.toMatch(/one tab|single tab|only tab/iu);

        findButton('Reload')?.click();
        expect(onReload).toHaveBeenCalledOnce();
    });

    it('offers copying the text when saving failed', async () => {
        const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

        mount(createHandover({status: 'save-failed', text: 'INT. THE UNSAVED LINE'}).handover);

        await expect.poll(dialogTitle).toBe('Your latest changes could not be saved');
        expect(document.querySelector('textarea')?.value).toBe('INT. THE UNSAVED LINE');

        findButton('Copy text')?.click();
        await expect.poll(() => findButton('Copied')).toBeDefined();
        expect(writeText).toHaveBeenCalledWith('INT. THE UNSAVED LINE');
    });

    it('keeps the text selectable when the clipboard refuses', async () => {
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
        mount(createHandover({status: 'save-failed', text: 'INT. THE UNSAVED LINE'}).handover);

        await expect.poll(() => findButton('Copy text')).toBeDefined();
        findButton('Copy text')?.click();

        const textarea = document.querySelector('textarea');

        await expect.poll(() => textarea?.selectionEnd).toBe('INT. THE UNSAVED LINE'.length);
        expect(findButton('Copied')).toBeUndefined();
    });

    it('offers the text and a reload when the tab lost the database, without blaming a newer Release', async () => {
        const {onReload} = mount(createHandover({status: 'database-lost', text: 'INT. THE UNSAVED LINE'}).handover);

        await expect.poll(dialogTitle).toBe('This tab lost access to your scripts');
        expect(document.querySelector('dialog')?.textContent).not.toContain('newer Release');
        expect(document.querySelector('textarea')?.value).toBe('INT. THE UNSAVED LINE');
        expect(findButton('Copy text')).toBeDefined();

        findButton('Reload')?.click();
        expect(onReload).toHaveBeenCalledOnce();
    });

    it('prompts a reload when the tab lost the database with no text to rescue', async () => {
        mount(createHandover({status: 'database-lost', text: ''}).handover);

        await expect.poll(dialogTitle).toBe('This tab lost access to your scripts');
        expect(document.querySelector('textarea')).toBeNull();
        expect(findButton('Reload')).toBeDefined();
    });

    it('does not offer copying when there is no text to rescue', async () => {
        mount(createHandover({status: 'save-failed', text: ''}).handover);

        await expect.poll(dialogTitle).toBe('Your latest changes could not be saved');
        expect(findButton('Copy text')).toBeUndefined();
        expect(document.querySelector('textarea')).toBeNull();
    });
});
