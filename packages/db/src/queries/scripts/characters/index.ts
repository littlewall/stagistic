export type {
    ScriptCharacterGenderOption,
    ScriptCharacterGroupRef,
    ScriptCharacterRef,
    ScriptSpeakingEntityRef,
} from '../../../types';
export {
    getScriptCharacterGenderByKey,
    listScriptCharacterGenders,
    upsertScriptCharacterGender,
} from './genders';
export {
    createScriptCharacterGroup,
    deleteScriptCharacterGroup,
    getScriptCharacterGroupById,
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
