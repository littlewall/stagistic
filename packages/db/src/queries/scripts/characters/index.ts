export type {ScriptCharacterGenderOption, ScriptCharacterGroupRef, ScriptCharacterRef, ScriptSpeakingEntityRef} from '../../../types';
export {getScriptCharacterGenderByKey, insertScriptCharacterGenders, listScriptCharacterGenders, upsertScriptCharacterGender} from './genders';
export {
    createScriptCharacterGroup,
    deleteScriptCharacterGroup,
    getScriptCharacterGroupById,
    insertScriptCharacterGroupMembers,
    listScriptCharacterGroups,
    renameScriptCharacterGroup,
    replaceScriptCharacterGroupMembers,
    setScriptCharacterGroupColor,
} from './groups';
export {
    getScriptCharacterById,
    getScriptCharacterByKey,
    getScriptSpeakingEntityById,
    getScriptSpeakingEntityByKey,
    listScriptCharacters,
    listScriptSpeakingEntities,
} from './read';
export {
    deleteScriptCharacter,
    insertScriptCharacters,
    touchScriptCharacter,
    updateScriptCharacterBackstory,
    updateScriptCharacterColor,
    updateScriptCharacterGender,
    updateScriptCharacterKey,
    updateScriptCharacterNotes,
    updateScriptCharacterOutline,
    updateScriptCharacterVocalRange,
    updateScriptCharacterVoiceType,
    upsertScriptCharacter,
} from './write';
