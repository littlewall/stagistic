import {scriptBlockCharacterRefs, scriptBlocks} from './blocks';
import {
    scriptCharacterGenders,
    scriptCharacterGroupMembers,
    scriptCharacters,
} from './characters';
import {scriptCommentMessages, scriptCommentThreads} from './comments';
import {
    scriptAttachments,
    scriptMusic,
    scriptMusicAttachments,
} from './music';
import {scripts, syncOutbox} from './scripts';
import {
    scriptSettingsBlocks,
    scriptSettingsHeadersFooters,
    scriptSettingsInitialPages,
    scriptSettingsPageLayout,
    scriptSettingsStructure,
    scriptSettingsTitlePage,
    scriptSettingsVisualPreferences,
} from './settings';
import {
    scriptActs,
    scriptLocations,
    scriptSceneLocations,
    scriptScenes,
} from './structure';

export {scriptBlockCharacterRefs, scriptBlocks} from './blocks';
export {
    scriptCharacterGenders,
    scriptCharacterGroupMembers,
    scriptCharacters,
} from './characters';
export {scriptCommentMessages, scriptCommentThreads} from './comments';
export {
    scriptAttachments,
    scriptMusic,
    scriptMusicAttachments,
} from './music';
export {scripts, syncOutbox} from './scripts';
export {
    scriptSettingsBlocks,
    scriptSettingsHeadersFooters,
    scriptSettingsInitialPages,
    scriptSettingsPageLayout,
    scriptSettingsStructure,
    scriptSettingsTitlePage,
    scriptSettingsVisualPreferences,
} from './settings';
export {
    scriptActs,
    scriptLocations,
    scriptSceneLocations,
    scriptScenes,
} from './structure';

export const dbSchema = {
    scripts,
    syncOutbox,
    scriptSettingsPageLayout,
    scriptSettingsVisualPreferences,
    scriptSettingsStructure,
    scriptSettingsInitialPages,
    scriptSettingsHeadersFooters,
    scriptSettingsBlocks,
    scriptCharacters,
    scriptCharacterGroupMembers,
    scriptCharacterGenders,
    scriptLocations,
    scriptScenes,
    scriptSceneLocations,
    scriptSettingsTitlePage,
    scriptActs,
    scriptBlocks,
    scriptBlockCharacterRefs,
    scriptMusic,
    scriptAttachments,
    scriptMusicAttachments,
    scriptCommentThreads,
    scriptCommentMessages,
};
