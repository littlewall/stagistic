import type {FormatTemplate} from '../types';
import {manuscriptSettings} from './common';

const settings = manuscriptSettings();

export const dgModern: FormatTemplate = {
    id: 'dg-modern',
    label: 'Dramatists Guild — Modern',
    description: 'Dramatists Guild, contemporary. Deep-indented directions without parentheses.',
    settings: {...settings, blocks: {...settings.blocks, stageDirection: {...settings.blocks?.stageDirection, indentLeftChars: 25}}},
};
