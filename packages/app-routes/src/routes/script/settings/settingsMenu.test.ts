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
