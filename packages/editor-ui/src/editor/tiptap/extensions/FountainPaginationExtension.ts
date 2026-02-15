import type {EditorSettings} from '@stagistic/script-core';
import {
    Extension,
    type RawCommands,
} from '@tiptap/core';

import {DEFAULT_OPTIONS} from './pagination/constants';
import {createPaginationPlugin} from './pagination/plugin/createPaginationPlugin';
import {createInitialPaginationState} from './pagination/state/createInitialPaginationState';
import {
    type PaginationOptions,
    type PaginationStorage,
} from './pagination/types';

export const FountainPaginationExtension = Extension.create<PaginationOptions, PaginationStorage>({
    name: 'FountainPagination',

    addOptions() {
        return DEFAULT_OPTIONS;
    },

    addStorage() {
        return {
            optionsVersion: 0,
            state: createInitialPaginationState(this.options),
        };
    },

    addCommands() {
        return {
            updatePaginationSettings: (settings: Partial<PaginationOptions>) => () => {
                this.options = {
                    ...this.options,
                    ...settings,
                };

                this.storage.optionsVersion += 1;

                return true;
            },
        } as Partial<RawCommands>;
    },

    addProseMirrorPlugins() {
        return [createPaginationPlugin(this)];
    },
});

const scaleValue = (value: number, scale: number) => value * scale;

export const createPaginationExtension = (settings: EditorSettings, scale = 1) => {
    const page = settings.page;
    const fontSize = settings.typography.fontSizePx;
    const lineHeight = settings.typography.lineHeight;

    return FountainPaginationExtension.configure({
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
