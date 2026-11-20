import type {FormatTemplate} from '../types';
import {manuscriptSettings} from './common';

const settings = manuscriptSettings();

export const dgMusical: FormatTemplate = {
    id: 'dg-musical',
    label: 'Dramatists Guild — Musical',
    description: 'Dramatists Guild for musicals. Lyrics in capitals.',
    settings: {
        ...settings,
        blocks: {
            ...settings.blocks,
            stageDirection: {...settings.blocks?.stageDirection, parenWrap: true},
            lyrics: {
                ...settings.blocks?.lyrics,
                indentLeftChars: 4,
                casing: 'uppercase',
                isItalic: false,
                spacingBeforeEm: 1,
                spacingAfterEm: 1,
            },
        },
    },
};
