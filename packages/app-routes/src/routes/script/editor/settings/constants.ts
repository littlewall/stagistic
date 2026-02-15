import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/script-core';

export const SCREENPLAY_CHARS_PER_INCH = 10;
export const PX_PER_INCH = 96;
export const MIN_PREVIEW_CONTENT_CHARS = 30;

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

export const BLOCK_PREVIEW_TEXT: Record<FountainElementType, string> = {
    [ELEMENT_SCENE_HEADING]: 'INT. LOREM MANSION - DAY',
    [ELEMENT_ACTION]: 'She closes the door and exhales.',
    [ELEMENT_CHARACTER]: 'ALEX',
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: 'ALEX',
    [ELEMENT_DUAL_DIALOGUE]: 'I will answer you on the overlap.',
    [ELEMENT_PARENTHETICAL]: '(quietly)',
    [ELEMENT_DIALOGUE]: 'I think this is where it starts.',
    [ELEMENT_TRANSITION]: 'CUT TO:',
    [ELEMENT_LYRICS]: 'Sing me a line for the morning.',
    [ELEMENT_CENTERED]: 'THE END',
};

export const BLOCK_PREVIEW_TEXT_COLOR: Record<FountainElementType, string> = {
    [ELEMENT_SCENE_HEADING]: 'var(--color-block-scene-heading)',
    [ELEMENT_ACTION]: 'var(--color-block-action)',
    [ELEMENT_CHARACTER]: 'var(--color-block-character)',
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: 'var(--color-block-dual-character)',
    [ELEMENT_DUAL_DIALOGUE]: 'var(--color-block-dual-dialogue)',
    [ELEMENT_PARENTHETICAL]: 'var(--color-block-parenthetical)',
    [ELEMENT_DIALOGUE]: 'var(--color-block-dialogue)',
    [ELEMENT_TRANSITION]: 'var(--color-block-transition)',
    [ELEMENT_LYRICS]: 'var(--color-block-lyrics)',
    [ELEMENT_CENTERED]: 'var(--color-block-centered)',
};

export const panelDescriptions: Record<string, {
    title: string,
    description: string,
}> = {
    'document-info': {
        title: 'Script Info',
        description: 'Script metadata panel placeholder.',
    },
    'visual-preferences': {
        title: 'Visual Preferences',
        description: 'Customize character color intensity for better readability.',
    },
    production: {
        title: 'Production',
        description: 'Production panel placeholder.',
    },
    'page-layout': {
        title: 'Page Layout',
        description: 'Page size, margins, and typography settings panel placeholder.',
    },
    'headers-footers': {
        title: 'Headers and Footers',
        description: 'Header and footer controls placeholder.',
    },
    'document-statuses': {
        title: 'Document Statuses',
        description: 'Document statuses setup placeholder.',
    },
    notes: {
        title: 'Notes',
        description: 'Document notes configuration placeholder.',
    },
    'project-statuses': {
        title: 'Project Statuses',
        description: 'Project statuses placeholder.',
    },
};
