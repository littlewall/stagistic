import type {FormatTemplate} from '../types';
import {manuscriptSettings} from './common';

const settings = manuscriptSettings(1.13);

export const sketchComedy: FormatTemplate = {
    id: 'sketch-comedy',
    label: 'Sketch Comedy — Sketchworks',
    description: 'Sketchworks. Compact headings and indented dialogue.',
    settings: {
        ...settings,
        blocks: {
            ...settings.blocks,
            act: {
                ...settings.blocks?.act,
                textAlign: 'left',
                isBold: true,
            },
            scene: {
                ...settings.blocks?.scene,
                textAlign: 'left',
                isBold: true,
            },
            dialogue: {
                ...settings.blocks?.dialogue,
                indentLeftChars: 15,
                indentRightChars: 15,
            },
            stageDirection: {...settings.blocks?.stageDirection, indentLeftChars: 0},
            aside: {
                ...settings.blocks?.aside,
                indentRightChars: 10,
                isItalic: true,
            },
            lyrics: {
                ...settings.blocks?.lyrics,
                indentLeftChars: 15,
                casing: 'uppercase',
                isItalic: false,
            },
        },
    },
};
