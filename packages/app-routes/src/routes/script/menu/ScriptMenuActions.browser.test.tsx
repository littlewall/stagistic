import {useEffect} from 'react';
import {flushSync} from 'react-dom';
import {createRoot, type Root} from 'react-dom/client';
import {
    MemoryRouter,
    useLocation,
} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    ScriptMenuActionsProvider,
    type ScriptMenuCommand,
    useRegisterScriptMenuActions,
    useRunScriptMenuCommand,
} from './ScriptMenuActions';

const workspace = vi.hoisted(() => ({currentScriptId: 's1' as string | null}));

vi.mock('../workspace/ScriptWorkspaceContext', () => ({
    useScriptWorkspace: () => ({currentScriptId: workspace.currentScriptId}),
}));

type Handler = (actionId: string) => void;

const runner: {run: ((command: ScriptMenuCommand) => void) | null} = {run: null};
let root: Root | null = null;
let container: HTMLElement | null = null;

const Registered = ({handler}: {handler: Handler}) => {
    useRegisterScriptMenuActions(handler);

    return null;
};

const Runner = () => {
    const run = useRunScriptMenuCommand();

    useEffect(() => {
        runner.run = run;
    }, [run]);

    return null;
};

const Location = () => <output data-testid="path">{useLocation().pathname}</output>;

const tree = (handler: Handler | null, withProvider = true) => {
    const body = (
        <>
            <Runner />
            <Location />
            {handler ? <Registered handler={handler} /> : null}
        </>
    );

    return (
        <MemoryRouter initialEntries={['/script/s1/editor']}>
            {withProvider ? <ScriptMenuActionsProvider>{body}</ScriptMenuActionsProvider> : body}
        </MemoryRouter>
    );
};

const mount = (handler: Handler | null, withProvider = true) => {
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
    flushSync(() => root?.render(tree(handler, withProvider)));
};

const pathname = () => document.querySelector('[data-testid="path"]')?.textContent;
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
    root?.unmount();
    container?.remove();
    root = null;
    container = null;
    runner.run = null;
    workspace.currentScriptId = 's1';
});

describe('Script menu actions', () => {
    it('runs the open script header actions', async () => {
        const handler = vi.fn<Handler>();

        mount(handler);
        await settle();

        runner.run?.('settings');
        runner.run?.('attributes');
        runner.run?.('save');

        expect(handler.mock.calls.map(([id]) => id)).toEqual([
            'settings',
            'attributes',
            'export-stepkg',
        ]);
    });

    it('opens the Export view of the shown script', async () => {
        const handler = vi.fn<Handler>();

        mount(handler);
        await settle();

        runner.run?.('export');

        await vi.waitFor(() => expect(pathname()).toBe('/script/s1/export'));
        expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing once the script route is unmounted', async () => {
        const handler = vi.fn<Handler>();

        mount(handler);
        await settle();
        flushSync(() => root?.render(tree(null)));
        await settle();

        runner.run?.('settings');
        runner.run?.('export');
        await settle();

        expect(handler).not.toHaveBeenCalled();
        expect(pathname()).toBe('/script/s1/editor');
    });

    it('registers nothing while no script is loaded', async () => {
        workspace.currentScriptId = null;

        const handler = vi.fn<Handler>();

        mount(handler);
        await settle();

        runner.run?.('settings');

        expect(handler).not.toHaveBeenCalled();
    });

    it('is inert without a provider, as in the Web app', async () => {
        const handler = vi.fn<Handler>();

        mount(handler, false);
        await settle();

        expect(() => runner.run?.('settings')).not.toThrow();
        expect(handler).not.toHaveBeenCalled();
    });
});
