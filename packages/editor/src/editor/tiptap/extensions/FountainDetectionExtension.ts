import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';

const fountainDetectionPluginKey = new PluginKey('fountain-detection');

export const FountainDetectionExtension = Extension.create({
    name: 'FountainDetection',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: fountainDetectionPluginKey,
            }),
        ];
    },
});
