import {scriptBlockCharacterRefs, scriptBlocks} from './blocks';
import {scriptCharacterGenders, scriptCharacterGroupMembers, scriptCharacters} from './characters';
import {scriptCommentMessages, scriptCommentThreads} from './comments';
import {scriptAttachments, scriptMusic, scriptMusicAttachments} from './music';
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
import {scriptActs, scriptLocations, scriptSceneLocations, scriptScenes} from './structure';

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
export {scriptCharacterGenders, scriptCharacterGroupMembers, scriptCharacters} from './characters';
export {scriptActs, scriptLocations, scriptSceneLocations, scriptScenes} from './structure';
export {scriptBlockCharacterRefs, scriptBlocks} from './blocks';
export {scriptAttachments, scriptMusic, scriptMusicAttachments} from './music';
export {scriptCommentMessages, scriptCommentThreads} from './comments';

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
