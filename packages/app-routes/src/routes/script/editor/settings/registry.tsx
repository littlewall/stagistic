import {
    SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT,
    SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS,
    SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
} from '../../settings/settingsMenu';
import {PageLayoutSettingsPanel} from './page-layout/PageLayoutSettingsPanel';
import {StructureMarkersSettingsPanel} from './structure-markers/StructureMarkersSettingsPanel';
import type {SectionRenderer} from './types';
import {VisualPreferencesSettingsPanel} from './visual-preferences/VisualPreferencesSettingsPanel';

export const SECTION_RENDERERS: Partial<Record<string, SectionRenderer>> = {
    [SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT]: props => (
        <PageLayoutSettingsPanel
            resolvedScriptSettings={props.resolvedScriptSettings}
            onUpdatePageSettings={props.pageLayoutHandlers.onUpdatePageSettings}
        />
    ),
    [SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES]: props => (
        <VisualPreferencesSettingsPanel
            characterColorSaturation={props.resolvedScriptSettings.visual.characterColorSaturation}
            onUpdateCharacterColorSaturation={props.visualPreferencesHandlers.onUpdateCharacterColorSaturation}
        />
    ),
    [SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS]: props => (
        <StructureMarkersSettingsPanel
            structureSettings={props.resolvedScriptSettings.structure}
            onUpdateStructureSettings={props.structureHandlers.onUpdateStructureSettings}
        />
    ),
};
