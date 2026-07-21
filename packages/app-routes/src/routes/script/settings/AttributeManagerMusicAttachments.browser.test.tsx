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

import {MusicAttachmentsDetail} from '../attributes/MusicAttachmentsDetail';
import type {useMusicAttachmentsState} from '../attributes/useMusicAttachmentsState';

vi.mock('../export/renderPdfToCanvases', () => ({
    renderPdfToCanvases: () => {
        const canvas = document.createElement('canvas');

        canvas.width = 600;
        canvas.height = 800;

        return Promise.resolve([canvas]);
    },
}));

const mountedRoots: Root[] = [];
const music = {
    id: 'music-1',
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
    integratedScoresByMusic: new Map([['music-1', attachment]]),
    uploadingMusicIds: new Set<string>(),
    uploadIntegratedScore: () => Promise.resolve(),
    removeIntegratedScore: () => Promise.resolve(),
    getBlob: () => Promise.resolve(null),
}) as unknown as ReturnType<typeof useMusicAttachmentsState>;

const TestDetail = ({
    state,
    onUpdateMusic,
}: {
    state: ReturnType<typeof useMusicAttachmentsState>,
    onUpdateMusic: ComponentProps<typeof MusicAttachmentsDetail>['onUpdateMusic'],
}) => {
    const [displayTitle, setDisplayTitle] = useState(music.title);

    return (
        <MusicAttachmentsDetail
            music={music}
            displayTitle={displayTitle}
            state={state}
            onTitleDraftChange={setDisplayTitle}
            onUpdateMusic={onUpdateMusic}
        />
    );
};

const renderDetail = (
    state: ReturnType<typeof useMusicAttachmentsState>,
    onUpdateMusic = vi.fn(),
) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <TestDetail
            state={state}
            onUpdateMusic={onUpdateMusic}
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

describe('MusicAttachmentsDetail', () => {
    it('shows the empty state and upload control', async () => {
        const {host} = renderDetail(makeState(null));

        await waitFor(() => host.textContent?.includes('No PDF uploaded.'));

        const uploadButton = [...host.querySelectorAll('button')]
            .find(button => button.textContent?.includes('Upload PDF'));

        expect(host.textContent).toContain('Integrated score');
        expect(host.textContent).not.toContain('Attachments');
        expect(uploadButton).toBeTruthy();
    });

    it('edits the music name and type', async () => {
        const onUpdateMusic = vi.fn();
        const {host} = renderDetail(makeState(null), onUpdateMusic);

        await waitFor(() => host.querySelector<HTMLInputElement>('#music-name-music-1') !== null);

        const nameInput = host.querySelector<HTMLInputElement>('#music-name-music-1');

        if (!nameInput) {
            throw new Error('Music name input not found');
        }

        await userEvent.click(nameInput);
        nameInput.select();
        await userEvent.type(nameInput, 'Overture');
        await userEvent.keyboard('{Tab}');

        await waitFor(() => onUpdateMusic.mock.calls.length === 1);

        expect(onUpdateMusic).toHaveBeenNthCalledWith(1, 'music-1', {
            title: 'Overture',
            kind: 'song',
        });

        const typeButton = host.querySelector<HTMLButtonElement>('[aria-label="Music type"]');

        if (!typeButton) {
            throw new Error('Music type select not found');
        }

        await userEvent.click(typeButton);

        const instrumentalOption = [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')]
            .find(option => option.textContent === 'Instrumental');

        if (!instrumentalOption) {
            throw new Error('Instrumental option not found');
        }

        await userEvent.click(instrumentalOption);

        expect(onUpdateMusic).toHaveBeenNthCalledWith(2, 'music-1', {
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
        } as ReturnType<typeof useMusicAttachmentsState>;
        const {host, root} = renderDetail(firstState);

        await waitFor(() => host.textContent?.includes('score.pdf'));

        const previewButton = [...host.querySelectorAll('button')]
            .find(button => button.textContent === 'score.pdf');

        previewButton?.click();
        await waitFor(() => getBlob.mock.calls.length === 1);

        const nextState = {
            ...makeState(attachment),
            getBlob,
        } as ReturnType<typeof useMusicAttachmentsState>;

        root.render(
            <MusicAttachmentsDetail
                music={music}
                state={nextState}
                onUpdateMusic={vi.fn()}
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
        } as ReturnType<typeof useMusicAttachmentsState>;
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
