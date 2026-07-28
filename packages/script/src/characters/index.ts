export {
    linkCharacterRefInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
    unlinkCharacterRefInScriptDocument,
} from './characterRefsInScriptDocument';
export type {CharacterTagRef} from './characterTagMarks';
export {
    canBlockTypeHaveCharacterTags,
    CHARACTER_TAG_BLOCK_TYPES,
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    collectCharacterTagRefByKey,
    collectCharacterTags,
    countCharacterTagsByKey,
    mapCharacterTagMarks,
    renameCharacterTagsInNode,
} from './characterTagMarks';
export {collectScriptCharacterStats} from './collectScriptCharacterStats';
export {normalizeCharacterColorHex} from './color';
export {normalizeCharacterDisplayName} from './documentHelpers';
export {renameCharacterInScriptDocument} from './renameCharacterInScriptDocument';
export type {
    CharacterGenderOption,
    ScriptCharacterRecord,
    ScriptCharacterStats,
} from './types';
