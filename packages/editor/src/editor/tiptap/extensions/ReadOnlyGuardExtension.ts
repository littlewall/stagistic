import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';

const readOnlyGuardKey = new PluginKey('readOnlyGuard');

/**
 * A stored script state must not change. `editable: false` only stops user
 * input; editor commands (structure requests, menus, sync extensions) still
 * dispatch. This guard drops every document-changing transaction, while
 * selection, decorations and pagination meta keep working.
 */
export const ReadOnlyGuardExtension = Extension.create({
    name: 'readOnlyGuard',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: readOnlyGuardKey,
                filterTransaction: transaction => !transaction.docChanged,
            }),
        ];
    },
});
