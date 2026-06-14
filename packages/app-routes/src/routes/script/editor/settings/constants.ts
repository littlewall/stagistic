import {
    type ScriptBlockNodeType,
} from '@stagistic/script';

import {
    SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
    SCRIPT_SETTINGS_PANEL_HEADERS,
    SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT,
    SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
} from '../../settings/settingsMenu';

export const SCREENPLAY_CHARS_PER_INCH = 10;
export const PX_PER_INCH = 96;
export const MIN_PREVIEW_CONTENT_CHARS = 30;
export const MIN_PAGE_MARGIN_HORIZONTAL_PX = 48; // 0.5"
export const MARGIN_ROW_OPTIONS = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
] as const;

const INDENT_SPACING_STEPS = Array.from({length: 41}, (_, index) => index);

export const MAX_INDENT_CHARS = INDENT_SPACING_STEPS[INDENT_SPACING_STEPS.length - 1] ?? 40;

export const SPACING_BEFORE_OPTIONS = [
    0,
    1,
    1.5,
    2,
] as const;

export const LINE_HEIGHT_OPTIONS = [
    1,
    1.25,
    1.5,
    1.75,
    2,
] as const;

export const BLOCK_PREVIEW_TEXT: Record<ScriptBlockNodeType, string> = {
    scene: 'INT. LOREM MANSION - DAY',
    act: 'ACT 1',
    stageDirection: 'She closes the door and exhales.',
    character: 'ALEX',
    aside: '(quietly)',
    dialogue: 'I think this is where it starts.',
    lyrics: 'Sing me a line for the morning.',
    note: '[[Production note goes here.]]',
};

export const BLOCK_PREVIEW_TEXT_COLOR: Record<ScriptBlockNodeType, string> = {
    scene: 'var(--color-block-scene-heading)',
    act: 'var(--color-block-scene-heading)',
    stageDirection: 'var(--color-block-stage-directions)',
    character: 'var(--color-block-character)',
    aside: 'var(--color-block-aside)',
    dialogue: 'var(--color-block-dialogue)',
    lyrics: 'var(--color-block-lyrics)',
    note: 'var(--color-block-note, var(--color-block-stage-directions))',
};

export const PANEL_DESCRIPTIONS: Record<string, {
    title: string,
    description: string,
}> = {
    [SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO]: {
        title: 'Title Page',
        description: 'Title page metadata for PDF and Fountain export.',
    },
    [SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES]: {
        title: 'Visual Preferences',
        description: 'Customize character color intensity for better readability.',
    },
    [SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT]: {
        title: 'Page Layout',
        description: 'Page size, margins, and typography settings panel placeholder.',
    },
    [SCRIPT_SETTINGS_PANEL_HEADERS]: {
        title: 'Headers and Footers',
        description: 'Header and footer controls placeholder.',
    },
    notes: {
        title: 'Notes',
        description: 'Document notes configuration placeholder.',
    },
};
