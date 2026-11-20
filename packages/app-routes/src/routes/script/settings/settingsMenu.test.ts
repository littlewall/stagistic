import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    readOnlyScriptSettingsMenu,
    SCRIPT_SETTINGS_PANEL_DANGER_ZONE,
    scriptSettingsMenu,
} from './settingsMenu';

const itemIds = (groups: typeof scriptSettingsMenu) => groups.flatMap(group => group.items.map(item => item.id));

describe('readOnlyScriptSettingsMenu', () => {
    it('drops the danger zone and its separator, keeping every other panel', () => {
        expect(itemIds(scriptSettingsMenu)).toContain(SCRIPT_SETTINGS_PANEL_DANGER_ZONE);
        expect(itemIds(readOnlyScriptSettingsMenu)).toEqual(
            itemIds(scriptSettingsMenu).filter(id => id !== SCRIPT_SETTINGS_PANEL_DANGER_ZONE && id !== 'danger-zone-separator'),
        );
    });
});

it('groups Script before Format and exposes Page format', () => {
    expect(scriptSettingsMenu.map(group => group.id)).toEqual([
        'script',
        'format',
        'danger',
    ]);
    expect(scriptSettingsMenu[0].items.filter(item => item.kind === 'item').map(item => item.label)).toEqual([
        'Title page',
        'Initial pages',
        'Visual preferences',
        'Page format',
        'Header and footer',
    ]);
    expect(scriptSettingsMenu[1].items.filter(item => item.kind !== 'separator').map(item => item.label)).toEqual(['Block settings']);
    expect(scriptSettingsMenu.at(-1)?.items.filter(item => item.kind === 'item').map(item => item.label)).toEqual(['Danger zone']);
    expect(scriptSettingsMenu.at(-1)?.label).toBeUndefined();
});
