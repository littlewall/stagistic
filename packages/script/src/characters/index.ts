export {
    linkCharacterRefInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
    unlinkCharacterRefInScriptDocument,
} from './characterRefsInScriptDocument';
export {collectScriptCharacterStats} from './collectScriptCharacterStats';
export {normalizeCharacterColorHex} from './color';
export {normalizeCharacterDisplayName} from './documentHelpers';
// TEMPORARY export — remove together with the one-shot '+' → '/' migration.
export {migrateCharacterDelimitersInScriptDocument} from './migrateCharacterDelimiters';
export {renameCharacterInScriptDocument} from './renameCharacterInScriptDocument';
export type {
    CharacterGenderOption,
    ScriptCharacterRecord,
    ScriptCharacterStats,
} from './types';
