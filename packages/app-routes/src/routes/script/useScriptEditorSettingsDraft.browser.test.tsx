import type {
    ScriptEditorSettingsRecord,
    ScriptRepository,
} from '@stagistic/app-core';
import type {EditorSettingsOverride} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {useScriptEditorSettingsDraft} from './useScriptEditorSettingsDraft';

const roots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for settings draft');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const createRepository = () => {
    let rows: readonly ScriptEditorSettingsRecord[] = [];
    let shouldFail = true;
    const listeners = new Set<(value: readonly ScriptEditorSettingsRecord[]) => void>();
    const saveCalls: EditorSettingsOverride[] = [];
    const source = {
        read: () => Promise.resolve(rows),
        subscribe: (listener: (value: readonly ScriptEditorSettingsRecord[]) => void) => {
            listeners.add(listener);
            listener(rows);

            return Promise.resolve(() => {
                listeners.delete(listener);
            });
        },
        refresh: () => {
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
    };
    const repository = {
        getScriptEditorSettingsSource: () => source,
        saveScriptSettings: (scriptId: string, settings: EditorSettingsOverride) => {
            saveCalls.push(settings);

            if (shouldFail) {
                shouldFail = false;

                return Promise.reject(new Error('disk full'));
            }

            rows = [{scriptId, settings}];
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
        deleteScriptSettings: () => Promise.resolve(),
    } as unknown as ScriptRepository;

    return {repository, saveCalls};
};

const Harness = ({repository}: {repository: ScriptRepository}) => {
    const settings = useScriptEditorSettingsDraft({
        currentScriptId: 'script-1',
        repository,
    });
    const override = settings.scriptSettingsDraft;

    return (
        <>
            <button
                type="button"
                data-testid="toggle"
                onClick={() => settings.updateInitialPagesSettings({
                    castAndPlace: {showOutline: false},
                })}
            >
                toggle
            </button>
            <button
                type="button"
                data-testid="format"
                onClick={() => settings.updateBlockSettings('dialogue', {isBold: true})}
            >
                format
            </button>
            <button
                type="button"
                data-testid="retry"
                onClick={() => void settings.retryScriptSettings()}
            >
                retry
            </button>
            <output>
                {String(override.initialPages?.castAndPlace?.showOutline)}:
                {String(override.blocks?.dialogue?.isBold)}:
                {settings.scriptSettingsDraftStatus}
            </output>
        </>
    );
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useScriptEditorSettingsDraft', () => {
    it('retains toggle and formatting changes after failure and retries them together', async () => {
        const {repository, saveCalls} = createRepository();
        const host = document.createElement('div');
        const root = createRoot(host);

        roots.push(root);
        document.body.appendChild(host);
        root.render(<Harness repository={repository} />);
        await waitFor(() => host.textContent?.includes('undefined:undefined:idle') ?? false);

        await userEvent.click(host.querySelector('[data-testid="toggle"]') as HTMLButtonElement);
        await userEvent.click(host.querySelector('[data-testid="format"]') as HTMLButtonElement);
        await waitFor(() => host.textContent?.includes('false:true:error') ?? false);

        expect(saveCalls).toHaveLength(1);

        await userEvent.click(host.querySelector('[data-testid="retry"]') as HTMLButtonElement);
        await waitFor(() => host.textContent?.includes('false:true:saved') ?? false);

        expect(saveCalls).toHaveLength(2);
        expect(saveCalls[1]).toMatchObject({
            initialPages: {castAndPlace: {showOutline: false}},
            blocks: {dialogue: {isBold: true}},
        });
    });
});
