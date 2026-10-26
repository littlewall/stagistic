import type {ScriptRepository} from '@stagistic/app-core';
import {act, useLayoutEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import type {GlobalModalActions} from './globalModalTypes';
import {useGlobalModalActions} from './useGlobalModalActions';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = '';
});

describe('global modal return targets', () => {
    it('keeps targets independent and replaces the target on every open', () => {
        let actions: GlobalModalActions | null = null;
        const Harness = () => {
            const current = useGlobalModalActions({
                scriptActions: {
                    createScript: vi.fn(),
                    renameScript: vi.fn(),
                    duplicateScript: vi.fn(),
                    deleteScript: vi.fn(),
                },
                repository: {} as ScriptRepository,
                saveTitlePage: vi.fn(),
                navigation: {navigate: vi.fn()},
                notifications: {addToast: vi.fn()},
            });

            useLayoutEffect(() => {
                actions = current;
            }, [current]);

            return null;
        };
        const host = document.createElement('div');
        const first = document.createElement('button');
        const second = document.createElement('button');

        document.body.append(host, first, second);
        root = createRoot(host);
        act(() => root?.render(<Harness />));

        const controller = () => {
            if (!actions) {
                throw new Error('Global modal actions are not mounted');
            }

            return actions;
        };
        const script = {
            id: 'script',
            title: 'Draft',
            subtitle: '',
        };

        act(() => {
            controller().openNewScript(first);
            controller().openImportScript(second);
            controller().openDeleteScript(script, first);
            controller().openRenameScript(script, second);
            controller().openDuplicateScript(script, first);
        });

        expect(controller().newScriptReturnFocus.current).toBe(first);
        expect(controller().importScriptReturnFocus.current).toBe(second);
        expect(controller().deleteScriptReturnFocus.current).toBe(first);
        expect(controller().renameScriptReturnFocus.current).toBe(second);
        expect(controller().duplicateScriptReturnFocus.current).toBe(first);

        act(() => {
            controller().closeNewScript();
            controller().closeImportScript();
            controller().closeDeleteScript();
            controller().closeRenameScript();
            controller().closeDuplicateScript();
        });

        expect(controller().newScriptReturnFocus.current).toBe(first);

        act(() => {
            controller().openNewScript();
            controller().openImportScript();
            controller().openDeleteScript(script);
            controller().openRenameScript(script);
            controller().openDuplicateScript(script);
        });

        expect(controller().newScriptReturnFocus.current).toBeNull();
        expect(controller().importScriptReturnFocus.current).toBeNull();
        expect(controller().deleteScriptReturnFocus.current).toBeNull();
        expect(controller().renameScriptReturnFocus.current).toBeNull();
        expect(controller().duplicateScriptReturnFocus.current).toBeNull();
    });
});
