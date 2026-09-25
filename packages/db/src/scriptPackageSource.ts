import type {EditorSettingsOverride, ScriptDocument, TitlePageSettings} from '@stagistic/script';
import type {InferSelectModel} from 'drizzle-orm';

import type {scriptCharacterGroupMembers, scriptMusicAttachments, scriptSceneLocations} from './schema';
import type {
    ScriptAttachment,
    ScriptCharacter,
    ScriptCharacterGender,
    ScriptCommentMessage,
    ScriptCommentThread,
    ScriptLocation,
    ScriptMusic,
    ScriptScene,
    ScriptSummary,
} from './types';

export type ScriptCharacterGroupMember = Pick<InferSelectModel<typeof scriptCharacterGroupMembers>, 'groupId' | 'characterId'>;
export type ScriptSceneLocationAssignment = InferSelectModel<typeof scriptSceneLocations>;
export type ScriptMusicAttachmentBinding = InferSelectModel<typeof scriptMusicAttachments>;

export interface ScriptPackageSource {
    script: ScriptSummary;
    document: ScriptDocument;
    titlePage: TitlePageSettings;
    settings: EditorSettingsOverride;
    characters: ScriptCharacter[];
    characterGroupMembers: ScriptCharacterGroupMember[];
    characterGenders: ScriptCharacterGender[];
    music: ScriptMusic[];
    locations: ScriptLocation[];
    scenes: ScriptScene[];
    sceneLocations: ScriptSceneLocationAssignment[];
    attachments: ScriptAttachment[];
    musicAttachmentBindings: ScriptMusicAttachmentBinding[];
    comments: {threads: ScriptCommentThread[]; messages: ScriptCommentMessage[]};
}
