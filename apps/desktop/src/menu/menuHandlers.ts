import type {ScriptMenuCommand} from '@stagistic/app-routes';

import {
    CHANGELOG_URL,
    DOCS_URL,
    FEEDBACK_URL,
} from '../links/helpLinks';
import {isMenuAction, type MenuAction} from './menuActions';
import type {HistoryDirection} from './undoRedo';

export interface MenuHandlerDeps {
    checkForUpdates: () => unknown,
    openSettings: () => unknown,
    openNewScript: () => unknown,
    openImportScript: () => unknown,
    openScriptLibrary: () => unknown,
    runHistory: (direction: HistoryDirection) => unknown,
    runScriptCommand: (command: ScriptMenuCommand) => unknown,
    openWhatsNew: () => unknown,
    openExternal: (url: string) => unknown,
    showBackupsFolder: () => unknown,
    openLicenses: () => unknown,
}

/** What each native menu action does. A failing action never breaks the menu. */
export const createMenuHandlers = (deps: MenuHandlerDeps): Record<MenuAction, () => void> => {
    const run = (action: () => unknown) => () => {
        try {
            void Promise.resolve(action()).catch(() => undefined);
        } catch {
            // Nothing to report: the menu stays usable.
        }
    };

    return {
        'app.check-updates': run(deps.checkForUpdates),
        'app.settings': run(deps.openSettings),
        'file.new-script': run(deps.openNewScript),
        'file.import': run(deps.openImportScript),
        'file.script-library': run(deps.openScriptLibrary),
        'edit.undo': run(() => deps.runHistory('undo')),
        'edit.redo': run(() => deps.runHistory('redo')),
        'script.settings': run(() => deps.runScriptCommand('settings')),
        'script.attributes': run(() => deps.runScriptCommand('attributes')),
        'script.export': run(() => deps.runScriptCommand('export')),
        'script.save': run(() => deps.runScriptCommand('save')),
        'help.docs': run(() => deps.openExternal(DOCS_URL)),
        'help.whats-new': run(deps.openWhatsNew),
        'help.changelog': run(() => deps.openExternal(CHANGELOG_URL)),
        'help.report-problem': run(() => deps.openExternal(FEEDBACK_URL)),
        'help.backups-folder': run(deps.showBackupsFolder),
        'help.licenses': run(deps.openLicenses),
    };
};

/** Runs the handler for a `menu-action` payload; unknown payloads are ignored. */
export const dispatchMenuAction = (
    payload: unknown,
    handlers: Record<MenuAction, () => void>,
): void => {
    if (isMenuAction(payload)) {
        handlers[payload]();
    }
};
