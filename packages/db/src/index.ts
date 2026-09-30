// ─── Types & repository contracts ──────────────────────────────────────────────
export type {
    CommentAnchorKind,
    CommentThreadStatus,
    MusicAttachmentRole,
    Script,
    ScriptAct,
    ScriptAttachment,
    ScriptBlock,
    ScriptBlockCharacterRef,
    ScriptCharacter,
    ScriptCharacterGender,
    ScriptCharacterGenderOption,
    ScriptCharacterGroupRef,
    ScriptCharacterKind,
    ScriptCharacterRef,
    ScriptCommentMessage,
    ScriptCommentThread,
    ScriptLocation,
    ScriptMusic,
    ScriptMusicAttachment,
    ScriptMusicAttachmentBinding,
    ScriptScene,
    ScriptSettingsBlock,
    ScriptSpeakingEntityRef,
    ScriptSummary,
    ScriptTitlePageField,
} from './types';
export {LOCAL_COMMENT_AUTHOR_ID, MUSIC_ATTACHMENT_ROLES} from './types';
export type {ScriptPackageSource} from './types/scriptPackageSource';
export type {
    ScriptPackageWrite,
    ScriptPackageWriteAttachment,
    ScriptPackageWriteBinding,
    ScriptPackageWriteCharacter,
    ScriptPackageWriteCommentMessage,
    ScriptPackageWriteCommentThread,
    ScriptPackageWriteGender,
    ScriptPackageWriteGroup,
    ScriptPackageWriteLocation,
    ScriptPackageWriteMusic,
    ScriptPackageWriteScene,
} from './types/scriptPackageWrite';
export type {
    AddScriptCommentMessageInput,
    CreateScriptCommentThreadInput,
    CreateScriptLocationInput,
    CreateScriptLocationWithIdInput,
    CreateScriptMusicInput,
    CreateScriptWithIdInput,
    DuplicateScriptInput,
    DuplicateScriptWithIdInput,
    ListScriptsOptions,
    MusicAttachmentUpload,
    RenameScriptInput,
    ScriptCommentsRepository,
    ScriptCommentThreadSnapshot,
    ScriptEditorSettingsRecord,
    ScriptLocationsRepository,
    ScriptMusicRepository,
    ScriptRepository,
    ScriptSceneLocationAssignment,
    ScriptTitlePageRecord,
    ScriptTitlePageRepository,
    UpdateScriptMusicInput,
} from './types/scriptRepository';

// ─── Schema ────────────────────────────────────────────────────────────────────
export * from './schema';

// ─── PGlite ────────────────────────────────────────────────────────────────────
export * from './pglite';
export {compiledMigrations} from './pglite/migrations.compiled';

// ─── Queries ───────────────────────────────────────────────────────────────────
export * from './queries';
export * as dbQueries from './queries';

// ─── Blocks (document ↔ rows) ──────────────────────────────────────────────────
export * from './blocks';

// ─── Local repository ──────────────────────────────────────────────────────────
export {createLocalPgliteRepository, type LocalPgliteRepositoryDeps} from './repo/createLocalPgliteRepository';
export {
    createProjectedTableDocumentSource,
    createSqlScriptDocumentProjectionWriter,
    type LoadedProjectionDocument,
    type LoadedScriptDocument,
    loadScriptDocumentFromProjection,
    rebuildScriptProjection,
    type RebuildScriptProjectionArgs,
    type SaveScriptDocumentOptions,
    type ScriptDocumentProjectionWriter,
    type ScriptDocumentSource,
} from './repo/document/documentProjection';

// ─── Reactive sources ──────────────────────────────────────────────────────────
export * from './reactive';

// ─── File storage ──────────────────────────────────────────────────────────────
export {type FileStorage, InMemoryFileStorage} from './storage/fileStorage';
