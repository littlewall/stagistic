import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {MENU_ACTIONS} from './menuActions';
import {createMenuHandlers, dispatchMenuAction} from './menuHandlers';

const setup = () => {
    const calls: string[] = [];
    const record = (name: string) => (...args: unknown[]) => {
        calls.push([name, ...args].join(' '));
    };
    const handlers = createMenuHandlers({
        checkForUpdates: record('checkForUpdates'),
        openSettings: record('openSettings'),
        openNewScript: record('openNewScript'),
        openImportScript: record('openImportScript'),
        openScriptLibrary: record('openScriptLibrary'),
        runHistory: record('history'),
        runScriptCommand: record('script'),
        openWhatsNew: record('openWhatsNew'),
        openExternal: record('external'),
        showBackupsFolder: record('showBackupsFolder'),
        openLicenses: record('openLicenses'),
    });

    return {calls, handlers};
};

const expectations: Record<(typeof MENU_ACTIONS)[number], string> = {
    'app.check-updates': 'checkForUpdates',
    'app.settings': 'openSettings',
    'file.new-script': 'openNewScript',
    'file.import': 'openImportScript',
    'file.script-library': 'openScriptLibrary',
    'edit.undo': 'history undo',
    'edit.redo': 'history redo',
    'script.settings': 'script settings',
    'script.attributes': 'script attributes',
    'script.export': 'script export',
    'script.save': 'script save',
    'help.docs': 'external https://docs.stagistic.com',
    'help.whats-new': 'openWhatsNew',
    'help.changelog': 'external https://stagistic.com/changelog',
    'help.report-problem': 'external https://feedback.stagistic.com',
    'help.backups-folder': 'showBackupsFolder',
    'help.licenses': 'openLicenses',
};

describe('native menu actions', () => {
    it.each(MENU_ACTIONS)('%s runs its action', action => {
        const {calls, handlers} = setup();

        dispatchMenuAction(action, handlers);

        expect(calls).toEqual([expectations[action]]);
    });

    it('ignores unknown payloads', () => {
        const {calls, handlers} = setup();

        dispatchMenuAction('view.zoom-in', handlers);
        dispatchMenuAction(42, handlers);
        dispatchMenuAction(null, handlers);

        expect(calls).toEqual([]);
    });

    it('survives actions that reject or throw', async () => {
        const unhandled = vi.fn();

        process.on('unhandledRejection', unhandled);

        const handlers = createMenuHandlers({
            checkForUpdates: () => Promise.reject(new Error('offline')),
            openSettings: () => {
                throw new Error('broken');
            },
            openNewScript: () => undefined,
            openImportScript: () => undefined,
            openScriptLibrary: () => undefined,
            runHistory: () => undefined,
            runScriptCommand: () => undefined,
            openWhatsNew: () => undefined,
            openExternal: () => undefined,
            showBackupsFolder: () => undefined,
            openLicenses: () => undefined,
        });

        expect(() => dispatchMenuAction('app.check-updates', handlers)).not.toThrow();
        expect(() => dispatchMenuAction('app.settings', handlers)).not.toThrow();
        await new Promise(resolve => setTimeout(resolve, 0));
        process.off('unhandledRejection', unhandled);

        expect(unhandled).not.toHaveBeenCalled();
    });
});
