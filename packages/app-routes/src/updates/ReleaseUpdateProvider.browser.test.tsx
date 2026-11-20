import '@stagistic/ui/styles/tokens.css';

import {
    type DatabaseHandover,
    DatabaseHandoverProvider,
    type DatabaseHandoverState,
    dismissRuntimeFileFailure,
    reportRuntimeFileFailure,
} from '@stagistic/app-core';
import {createUnsavedWorkMark} from '@stagistic/shared';
import {AppFooter} from '@stagistic/ui';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {LAST_SEEN_RELEASE_STORAGE_KEY} from '../whats-new/lastSeenRelease';
import {ReleaseNotesProvider} from '../whats-new/ReleaseNotesProvider';
import {ReleaseUpdateProvider, useQuietReloadOnReturn} from './ReleaseUpdateProvider';

let root: Root | null = null;

const jsonResponse = (release: string, dbGeneration: string) => new Response(
    JSON.stringify({release, dbGeneration}),
    {headers: {'content-type': 'application/json'}},
);

const ScriptListProbe = () => {
    useQuietReloadOnReturn();

    return <p>script list</p>;
};

const Screen = () => {
    const [isListShown, setIsListShown] = useState(false);

    return (
        <>
            <button type="button" onClick={() => setIsListShown(shown => !shown)}>Toggle list</button>
            {isListShown ? <ScriptListProbe /> : null}
        </>
    );
};

const createHandover = (state: DatabaseHandoverState): DatabaseHandover => ({
    getState: () => state,
    subscribe: () => () => {},
    addParticipant: () => () => {},
});

interface MountOptions {
    serverRelease?: string,
    serverDbGeneration?: string,
    runningDbGeneration?: string,
    handoverState?: DatabaseHandoverState,
}

const RUNNING_GENERATION = '27/20261103094608_x/0.3.15';

const mount = ({
    serverRelease = '0.3.0',
    serverDbGeneration = RUNNING_GENERATION,
    runningDbGeneration = RUNNING_GENERATION,
    handoverState = {status: 'idle'},
}: MountOptions = {}) => {
    const reload = vi.fn();
    const focusTarget = new EventTarget();
    const fetchManifest = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse(serverRelease, serverDbGeneration)));
    const monitorOptions = {
        fetch: fetchManifest,
        focusTarget,
        isOnline: () => true,
    };
    const host = document.body.appendChild(document.createElement('div'));

    root = createRoot(host);
    root.render(
        <DatabaseHandoverProvider handover={createHandover(handoverState)}>
            <ReleaseUpdateProvider
                currentRelease="0.2.0"
                dbGeneration={runningDbGeneration}
                monitorOptions={monitorOptions}
                quietReloadDelayMs={30}
                reload={reload}
            >
                <ReleaseNotesProvider releaseNumber="0.2.0" releases={[]}>
                    <AppFooter />
                    <Screen />
                </ReleaseNotesProvider>
            </ReleaseUpdateProvider>
        </DatabaseHandoverProvider>,
    );

    return {
        reload,
        fetchManifest,
        // Resolves once the check the focus started has been read and rendered.
        focus: async () => {
            // The monitor starts listening in an effect, after the first render.
            await new Promise(resolve => window.setTimeout(resolve, 20));
            focusTarget.dispatchEvent(new Event('focus'));
            await vi.waitFor(() => expect(fetchManifest).toHaveBeenCalled());
            await new Promise(resolve => window.setTimeout(resolve, 20));
        },
    };
};

const button = (label: string) => [...document.querySelectorAll('button')].find(item => item.textContent?.startsWith(label));
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
    window.sessionStorage.clear();
    window.localStorage.removeItem(LAST_SEEN_RELEASE_STORAGE_KEY);
    dismissRuntimeFileFailure();
});

describe('a newer Release', () => {
    it('shows a quiet reload in the footer and reloads only when the writer asks', async () => {
        const {reload, focus} = mount();

        expect(button('A new Release is ready')).toBeUndefined();

        await focus();
        expect(button('A new Release is ready')).toBeDefined();
        expect(reload).not.toHaveBeenCalled();

        button('A new Release is ready')?.click();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('shows nothing when the server has the same Release', async () => {
        const {focus} = mount({serverRelease: '0.2.0'});

        await focus();
        expect(button('A new Release is ready')).toBeUndefined();
    });

    it('keeps showing the reload after What\'s new was opened', async () => {
        const {focus} = mount();

        await focus();
        button('What\'s new')?.click();
        await wait(30);

        expect(button('A new Release is ready')).toBeDefined();
    });
});

describe('quiet reload on return to the script list', () => {
    const returnToList = async () => {
        button('Toggle list')?.click();
        await wait(120);
    };

    it('reloads once when a newer Release is known and nothing needs attention', async () => {
        const {reload, focus} = mount();

        await focus();
        await returnToList();

        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does nothing while no newer Release is known', async () => {
        const {reload} = mount();

        await returnToList();
        expect(reload).not.toHaveBeenCalled();
    });

    it('does not reload while text is unsaved', async () => {
        const markUnsavedWork = createUnsavedWorkMark();
        const {reload, focus} = mount();

        markUnsavedWork(true);
        await focus();
        await returnToList();
        markUnsavedWork(false);

        expect(reload).not.toHaveBeenCalled();
    });

    it('does not reload while a dialog is open', async () => {
        const {reload, focus} = mount();
        const dialog = document.body.appendChild(document.createElement('dialog'));

        dialog.setAttribute('open', '');
        await focus();
        await returnToList();

        expect(reload).not.toHaveBeenCalled();
    });

    it('does not reload during a database handover', async () => {
        const {reload, focus} = mount({handoverState: {status: 'saving'}});

        await focus();
        await returnToList();

        expect(reload).not.toHaveBeenCalled();
    });

    it('does not reload while a runtime file failure prompt is showing', async () => {
        const {reload, focus} = mount();

        reportRuntimeFileFailure('A file is gone.');
        await focus();
        await returnToList();

        expect(reload).not.toHaveBeenCalled();
    });

    it('does not reload when the writer leaves the list before the delay ends', async () => {
        const {reload, focus} = mount();

        await focus();
        button('Toggle list')?.click();
        await wait(5);
        button('Toggle list')?.click();
        await wait(120);

        expect(reload).not.toHaveBeenCalled();
    });

    it('reloads at most once per Release even when the server still reports it afterwards', async () => {
        const {reload, focus} = mount();

        await focus();
        await returnToList();
        expect(reload).toHaveBeenCalledTimes(1);

        // The reload brought the same stale build back; the tab finds the Release again.
        await returnToList();
        await returnToList();
        expect(reload).toHaveBeenCalledTimes(1);
        expect(button('A new Release is ready')).toBeDefined();
    });

    it('does not quiet-reload when the deployed generation differs, but still offers the footer prompt', async () => {
        const {reload, focus} = mount({runningDbGeneration: '27/20261103094608_x/0.3.15', serverDbGeneration: '28/other/0.3.15'});

        await focus();
        expect(button('A new Release is ready')).toBeDefined();

        await returnToList();
        expect(reload).not.toHaveBeenCalled();
    });
});
