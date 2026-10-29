import type {FormatTemplate} from '../types';
import {manuscriptSettings} from './common';

const settings = manuscriptSettings(1);

export const samuelFrench: FormatTemplate = {
    id: 'samuel-french',
    label: 'Samuel French / Concord — Manuscript',
    description: 'Publisher manuscript. Single-spaced, underlined scene headings.',
    settings: {
        ...settings,
        blocks: {
            ...settings.blocks,
            stageDirection: {...settings.blocks?.stageDirection, parenWrap: true},
            character: {...settings.blocks?.character, indentLeftChars: 20},
            aside: {...settings.blocks?.aside, indentLeftChars: 15},
            scene: {...settings.blocks?.scene, isUnderline: true},
            lyrics: {
                ...settings.blocks?.lyrics,
                casing: 'uppercase',
                isItalic: false,
                spacingBeforeEm: 1,
                spacingAfterEm: 1,
            },
        },
    },
};
