import type {FormatTemplate} from '../types';
import {manuscriptSettings} from './common';

const settings = manuscriptSettings();

export const dgTraditional: FormatTemplate = {
    id: 'dg-traditional',
    label: 'Dramatists Guild — Traditional',
    description: 'Dramatists Guild paper standard. Indented, parenthesized directions.',
    settings: {
        ...settings,
        blocks: {...settings.blocks, stageDirection: {...settings.blocks?.stageDirection, parenWrap: true}},
    },
};
