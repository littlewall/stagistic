import type {EditorSettings} from '@stagistic/script';
import {
    Extension,
    type RawCommands,
} from '@tiptap/core';

import {DEFAULT_OPTIONS} from './pagination/constants';
import {
    createPaginationPlugin,
    PAGINATION_CONTROL_META_KEY,
} from './pagination/plugin/createPaginationPlugin';
import {arePaginationSettingsApplied} from './pagination/settingsEqual';
import {createInitialPaginationState} from './pagination/state/createInitialPaginationState';
import {
    type PaginationOptions,
    type PaginationStorage,
} from './pagination/types';

export const PaginationExtension = Extension.create<PaginationOptions, PaginationStorage>({
    name: 'Pagination',

    addOptions() {
        return DEFAULT_OPTIONS;
    },

    addStorage() {
        return {
            options: this.options,
            optionsVersion: 0,
            state: createInitialPaginationState(this.options),
            forceRecalcToken: 0,
        };
    },

    addCommands() {
        return {
            updatePaginationSettings: (settings: Partial<PaginationOptions>) => () => {
                if (arePaginationSettingsApplied(this.storage.options, settings)) {
                    return true;
                }

                this.storage.options = {
                    ...this.storage.options,
                    ...settings,
                };

                this.storage.optionsVersion += 1;

                this.editor.view.dispatch(
                    this.editor.state.tr.setMeta(PAGINATION_CONTROL_META_KEY, {
                        forceRecalcToken: this.storage.forceRecalcToken,
                    }),
                );

                return true;
            },
            forcePaginationRecalc: () => () => {
                /*
                 * A detached view has no layout to measure — recalc would corrupt
                 * the preserved pagination state of a cached surface.
                 */
                if (!this.editor.view.dom.isConnected) {
                    return true;
                }

                this.storage.forceRecalcToken += 1;

                this.editor.view.dispatch(
                    this.editor.state.tr.setMeta(PAGINATION_CONTROL_META_KEY, {
                        forceRecalcToken: this.storage.forceRecalcToken,
                    }),
                );

                return true;
            },
        } as Partial<RawCommands>;
    },

    addProseMirrorPlugins() {
        return [createPaginationPlugin(this.storage)];
    },
});

const scaleValue = (value: number, scale: number) => value * scale;

export const createPaginationExtension = (settings: EditorSettings, scale = 1) => {
    const page = settings.page;
    const fontSize = settings.typography.fontSizePx;
    const lineHeight = settings.typography.lineHeight;

    return PaginationExtension.configure({
        pageHeight: scaleValue(page.heightPx, scale),
        pageWidth: scaleValue(page.widthPx, scale),
        marginTop: scaleValue(page.marginTopPx, scale),
        marginBottom: scaleValue(page.marginBottomPx, scale),
        marginLeft: scaleValue(page.marginLeftPx, scale),
        marginRight: scaleValue(page.marginRightPx, scale),
        lineHeightPx: scaleValue(fontSize * lineHeight, scale),
        dividerColor: 'var(--color-divider)',
        dividerThickness: 1,
    });
};
