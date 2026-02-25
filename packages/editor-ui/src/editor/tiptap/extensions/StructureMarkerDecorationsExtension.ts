import {type StructureSettings} from '@stagistic/script-core';
import {Extension} from '@tiptap/core';

import {createStructureMarkerDecorationsPlugin} from '../fountainBlock/structureMarkerDecorations';

export const StructureMarkerDecorationsExtension = Extension.create<{
    structureSettings?: Partial<StructureSettings>,
}>({
    name: 'StructureMarkerDecorations',

    addOptions() {
        return {
            structureSettings: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            createStructureMarkerDecorationsPlugin({
                structureSettings: this.options.structureSettings,
            }),
        ];
    },
});
