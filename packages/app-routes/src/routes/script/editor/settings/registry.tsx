import {
    SCRIPT_SETTINGS_PANEL_DANGER_ZONE,
    SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
    SCRIPT_SETTINGS_PANEL_HEADERS,
    SCRIPT_SETTINGS_PANEL_INITIAL_PAGES,
    SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT,
    SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS,
    SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
} from '../../settings/settingsMenu';
import {DangerZoneSettingsPanel} from './danger-zone/DangerZoneSettingsPanel';
import {TitlePageSettingsPanel} from './document-info/TitlePageSettingsPanel';
import {HeaderFooterSettingsPanel} from './header-footer/HeaderFooterSettingsPanel';
import {InitialPagesSettingsPanel} from './initial-pages/InitialPagesSettingsPanel';
import {PageLayoutSettingsPanel} from './page-layout/PageLayoutSettingsPanel';
import {StructureMarkersSettingsPanel} from './structure-markers/StructureMarkersSettingsPanel';
import type {SectionRenderer} from './types';
import {VisualPreferencesSettingsPanel} from './visual-preferences/VisualPreferencesSettingsPanel';

export const SECTION_RENDERERS: Partial<Record<string, SectionRenderer>> = {
    [SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO]: props => (
        <TitlePageSettingsPanel
            scriptTitle={props.titlePageHandlers.scriptTitle}
            settings={props.titlePageHandlers.titlePageSettings}
            onUpdateScriptTitle={props.titlePageHandlers.onUpdateScriptTitle}
            onUpdate={props.titlePageHandlers.onUpdateTitlePage}
        />
    ),
    [SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT]: props => (
        <PageLayoutSettingsPanel
            resolvedScriptSettings={props.resolvedScriptSettings}
            onUpdatePageSettings={props.pageLayoutHandlers.onUpdatePageSettings}
        />
    ),
    [SCRIPT_SETTINGS_PANEL_HEADERS]: props => (
        <HeaderFooterSettingsPanel
            settings={props.resolvedScriptSettings.headerFooter}
            scriptTitle={props.titlePageHandlers.scriptTitle}
            titlePageSettings={props.titlePageHandlers.titlePageSettings}
            onUpdate={props.headerFooterHandlers.onUpdateHeaderFooterSettings}
        />
    ),
    [SCRIPT_SETTINGS_PANEL_INITIAL_PAGES]: props => (
        <InitialPagesSettingsPanel
            settings={props.resolvedScriptSettings.initialPages}
            onUpdate={props.initialPagesHandlers.onUpdateInitialPagesSettings}
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
    [SCRIPT_SETTINGS_PANEL_DANGER_ZONE]: props => (
        <DangerZoneSettingsPanel
            scriptTitle={props.dangerZoneHandlers.scriptTitle}
            onDeleteScript={props.dangerZoneHandlers.onDeleteScript}
        />
    ),
};
