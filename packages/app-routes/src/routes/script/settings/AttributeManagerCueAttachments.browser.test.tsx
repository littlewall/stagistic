import '@stagistic/ui/styles/base.css';

import {
    type ComponentProps,
    useState,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {CueAttachmentsDetail} from '../attributes/CueAttachmentsDetail';
import type {useCueAttachmentsState} from '../attributes/useCueAttachmentsState';

vi.mock('../export/renderPdfToCanvases', () => ({
    renderPdfToCanvases: () => {
        const canvas = document.createElement('canvas');

        canvas.width = 600;
        canvas.height = 800;

        return Promise.resolve([canvas]);
    },
}));

const mountedRoots: Root[] = [];
const cue = {
    id: 'cue-1',
    title: 'Opening number',
    kind: 'song' as const,
    assignmentLabel: 'Assigned',
};

const waitFor = async (predicate: () => boolean): Promise<void> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const makeState = (
    attachment: {
        id: string,
        filename: string,
        sizeBytes: number,
        storageKey: string,
    } | null,
) => ({
    integratedScoresByCue: new Map([['cue-1', attachment]]),
    uploadingCueIds: new Set<string>(),
    uploadIntegratedScore: () => Promise.resolve(),
    removeIntegratedScore: () => Promise.resolve(),
    getBlob: () => Promise.resolve(null),
}) as unknown as ReturnType<typeof useCueAttachmentsState>;

const TestDetail = ({
    state,
    onUpdateCue,
}: {
    state: ReturnType<typeof useCueAttachmentsState>,
    onUpdateCue: ComponentProps<typeof CueAttachmentsDetail>['onUpdateCue'],
}) => {
    const [displayTitle, setDisplayTitle] = useState(cue.title);

    return (
        <CueAttachmentsDetail
            cue={cue}
            displayTitle={displayTitle}
            state={state}
            onTitleDraftChange={setDisplayTitle}
            onUpdateCue={onUpdateCue}
        />
    );
};

const renderDetail = (
    state: ReturnType<typeof useCueAttachmentsState>,
    onUpdateCue = vi.fn(),
) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <TestDetail
            state={state}
            onUpdateCue={onUpdateCue}
        />,
    );
    mountedRoots.push(root);

    return {host, root};
};

afterEach(() => {
    while (mountedRoots.length > 0) {
        const root = mountedRoots.pop();

        root?.unmount();
    }

    document.body.innerHTML = '';
});

describe('CueAttachmentsDetail', () => {
    it('shows the empty state and upload control', async () => {
        const {host} = renderDetail(makeState(null));

        await waitFor(() => host.textContent?.includes('No PDF uploaded.'));

        const uploadButton = [...host.querySelectorAll('button')]
            .find(button => button.textContent?.includes('Upload PDF'));

        expect(host.textContent).toContain('Integrated score');
        expect(host.textContent).not.toContain('Attachments');
        expect(uploadButton).toBeTruthy();
    });

    it('edits the cue name and type', async () => {
        const onUpdateCue = vi.fn();
        const {host} = renderDetail(makeState(null), onUpdateCue);

        await waitFor(() => host.querySelector<HTMLInputElement>('#cue-name-cue-1') !== null);

        const nameInput = host.querySelector<HTMLInputElement>('#cue-name-cue-1');

        if (!nameInput) {
            throw new Error('Cue name input not found');
        }

        await userEvent.click(nameInput);
        nameInput.select();
        await userEvent.type(nameInput, 'Overture');
        await userEvent.keyboard('{Tab}');

        await waitFor(() => onUpdateCue.mock.calls.length === 1);

        expect(onUpdateCue).toHaveBeenNthCalledWith(1, 'cue-1', {
            title: 'Overture',
            kind: 'song',
        });

        const typeButton = host.querySelector<HTMLButtonElement>('[aria-label="Cue type"]');

        if (!typeButton) {
            throw new Error('Cue type select not found');
        }

        await userEvent.click(typeButton);

        const instrumentalOption = [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')]
            .find(option => option.textContent === 'Instrumental');

        if (!instrumentalOption) {
            throw new Error('Instrumental option not found');
        }

        await userEvent.click(instrumentalOption);

        expect(onUpdateCue).toHaveBeenNthCalledWith(2, 'cue-1', {
            title: 'Overture',
            kind: 'instrumental',
        });
    });

    it('lists an existing attachment', async () => {
        const attachment = {
            id: 'a1',
            filename: 'score.pdf',
            sizeBytes: 2048,
            storageKey: 'k',
        };
        const {host} = renderDetail(makeState(attachment));

        await waitFor(() => host.textContent?.includes('score.pdf'));

        expect(host.textContent).toContain('score.pdf');
        expect(host.textContent).toContain('Replace PDF');
    });

    it('does not restart an open preview when the state container identity changes', async () => {
        const attachment = {
            id: 'a1',
            filename: 'score.pdf',
            sizeBytes: 2048,
            storageKey: 'k',
        };
        const getBlob = vi.fn(() => new Promise<Blob | null>(() => {}));
        const firstState = {
            ...makeState(attachment),
            getBlob,
        } as ReturnType<typeof useCueAttachmentsState>;
        const {host, root} = renderDetail(firstState);

        await waitFor(() => host.textContent?.includes('score.pdf'));

        const previewButton = [...host.querySelectorAll('button')]
            .find(button => button.textContent === 'score.pdf');

        previewButton?.click();
        await waitFor(() => getBlob.mock.calls.length === 1);

        const nextState = {
            ...makeState(attachment),
            getBlob,
        } as ReturnType<typeof useCueAttachmentsState>;

        root.render(
            <CueAttachmentsDetail
                cue={cue}
                state={nextState}
                onUpdateCue={vi.fn()}
            />,
        );
        await new Promise(resolve => window.setTimeout(resolve, 50));

        expect(getBlob).toHaveBeenCalledTimes(1);
    });

    it('shows the missing-blob state without removing metadata', async () => {
        const attachment = {
            id: 'a1',
            filename: 'missing.pdf',
            sizeBytes: 2048,
            storageKey: 'missing-key',
        };
        const {host} = renderDetail(makeState(attachment));

        await waitFor(() => host.textContent?.includes('missing.pdf') ?? false);

        const previewButton = [...host.querySelectorAll('button')]
            .find(button => button.textContent === 'missing.pdf');

        previewButton?.click();
        await waitFor(() => document.body.textContent?.includes(
            'This attachment is not available in this browser.',
        ) ?? false);

        expect(host.textContent).toContain('missing.pdf');
    });

    it('fits the PDF preview to the available width', async () => {
        const attachment = {
            id: 'a1',
            filename: 'score.pdf',
            sizeBytes: 2048,
            storageKey: 'k',
        };
        const state = {
            ...makeState(attachment),
            getBlob: () => Promise.resolve(new Blob(['pdf'], {type: 'application/pdf'})),
        } as ReturnType<typeof useCueAttachmentsState>;
        const {host} = renderDetail(state);

        await waitFor(() => host.textContent?.includes('score.pdf'));

        const previewButton = [...host.querySelectorAll('button')]
            .find(button => button.textContent === 'score.pdf');

        previewButton?.click();
        await waitFor(() => document.querySelector('canvas') !== null);

        const canvas = document.querySelector('canvas');
        const frame = canvas?.parentElement;

        expect(canvas?.style.width).toBe('100%');
        expect(canvas?.style.height).toBe('auto');
        expect(canvas?.getBoundingClientRect().width).toBe(frame?.getBoundingClientRect().width);
    });
});
