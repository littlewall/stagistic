import {
    applyFormatTemplate,
    DEFAULT_EDITOR_SETTINGS,
    getFormatTemplate,
    mergeEditorSettings,
} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {expect, it} from 'vite-plus/test';

import {templateChanges} from './templateChanges';

it('does not report a change for identical block styles with independent page and typing values', () => {
    const template = requireValue(getFormatTemplate('dg-modern'));
    const copy = applyFormatTemplate({templateId: template.id, lock: false}, {page: {widthPx: 900}, blocks: {character: {shortcut: '5', nextElement: 'aside'}}});
    const current = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, copy.settings);

    current.blocks.character.fontSizePx = current.typography.fontSizePx;

    expect(templateChanges(current, template)).toEqual([]);
});
