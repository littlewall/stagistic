import type {BlockSpacingSettings, EditorSettingsOverride} from '../../settings/types';

const block = (overrides: BlockSpacingSettings): BlockSpacingSettings => ({
    spacingBeforeEm: 0,
    spacingAfterEm: 0,
    indentLeftChars: 0,
    indentRightChars: 0,
    textAlign: 'left',
    casing: 'normal',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    ...overrides,
});

export const manuscriptSettings = (lineHeight = 1.2): Pick<EditorSettingsOverride, 'blocks'> => ({
    blocks: {
        act: block({
            spacingBeforeEm: 2,
            spacingAfterEm: 1,
            lineHeight,
            textAlign: 'center',
            casing: 'uppercase',
        }),
        scene: block({
            spacingBeforeEm: 1,
            spacingAfterEm: 1,
            lineHeight,
            textAlign: 'center',
            casing: 'uppercase',
            sceneNumberFormat: 'none',
        }),
        character: block({
            spacingBeforeEm: 1,
            lineHeight,
            indentLeftChars: 25,
            casing: 'uppercase',
        }),
        dialogue: block({lineHeight}),
        stageDirection: block({
            spacingBeforeEm: 1,
            spacingAfterEm: 1,
            lineHeight,
            indentLeftChars: 15,
        }),
        aside: block({lineHeight, indentLeftChars: 20}),
        lyrics: block({
            lineHeight,
            indentLeftChars: 5,
            isItalic: true,
        }),
        note: block({
            spacingBeforeEm: 1,
            lineHeight,
            isItalic: true,
        }),
    },
});
