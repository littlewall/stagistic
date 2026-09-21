import {MUSIC_ATTACHMENT_ROLES, type MusicAttachmentRole, type ScriptPackageWrite} from '@stagistic/db';
import type {StepkgSnapshot} from '@stagistic/stepkg';

const toEpoch = (iso: string): number => new Date(iso).getTime();

const toBlobPart = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const KNOWN_MUSIC_ATTACHMENT_ROLES: string[] = Object.values(MUSIC_ATTACHMENT_ROLES);

const toMusicAttachmentRole = (role: string): MusicAttachmentRole =>
    (KNOWN_MUSIC_ATTACHMENT_ROLES.includes(role) ? role : MUSIC_ATTACHMENT_ROLES.integratedScore) as MusicAttachmentRole;

export const mapStepkgSnapshotToPackageWrite = (snapshot: StepkgSnapshot, assets: Map<string, Uint8Array>): ScriptPackageWrite => ({
    script: {
        id: snapshot.script.id,
        title: snapshot.script.title,
        subtitle: snapshot.script.subtitle,
        createdAt: toEpoch(snapshot.script.createdAt),
        updatedAt: toEpoch(snapshot.script.updatedAt),
    },
    document: snapshot.document,
    titlePage: snapshot.titlePage,
    settings: snapshot.settings,
    characters: snapshot.characters.characters.map(character => ({
        id: character.id,
        key: character.key,
        colorHex: character.colorHex,
        genderKey: character.genderKey,
        notes: character.notes,
        backstory: character.backstory,
        outline: character.outline,
        voiceType: character.voiceType,
        vocalRangeLow: character.vocalRangeLow,
        vocalRangeHigh: character.vocalRangeHigh,
        createdAt: toEpoch(character.createdAt),
        updatedAt: toEpoch(character.updatedAt),
    })),
    groups: snapshot.characters.groups.map(group => ({
        id: group.id,
        key: group.key,
        colorHex: group.colorHex,
        memberIds: group.memberIds,
        createdAt: toEpoch(group.createdAt),
        updatedAt: toEpoch(group.updatedAt),
    })),
    genders: snapshot.characters.genderOptions.map(gender => ({
        id: gender.id,
        key: gender.key,
        label: gender.label,
        createdAt: toEpoch(gender.createdAt),
        updatedAt: toEpoch(gender.updatedAt),
    })),
    music: snapshot.music.items.map(item => ({
        id: item.id,
        sceneNumber: item.sceneNumber,
        indexInScene: item.indexInScene,
        mode: item.mode,
        title: item.title,
        kind: item.kind,
        startBlockId: item.startBlockId,
        endBlockId: item.endBlockId,
        createdAt: toEpoch(item.createdAt),
        updatedAt: toEpoch(item.updatedAt),
    })),
    locations: snapshot.scenes.locations.map(location => ({
        id: location.id,
        name: location.name,
        description: location.description,
        createdAt: toEpoch(location.createdAt),
        updatedAt: toEpoch(location.updatedAt),
    })),
    scenes: snapshot.scenes.scenes.map(scene => ({
        headingBlockId: scene.headingBlockId,
        colorHex: scene.colorHex,
        synopsis: scene.synopsis,
        locationIds: scene.locationIds,
    })),
    attachments: snapshot.attachments.map(attachment => ({
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        blob: new Blob([toBlobPart(assets.get(attachment.contentKey) ?? new Uint8Array())], {type: attachment.mimeType}),
        createdAt: toEpoch(attachment.createdAt),
        updatedAt: toEpoch(attachment.updatedAt),
    })),
    bindings: snapshot.attachmentBindings.map(binding => ({
        musicId: binding.target.id,
        attachmentId: binding.attachmentId,
        role: toMusicAttachmentRole(binding.role),
        sortOrder: binding.order,
        createdAt: toEpoch(binding.createdAt),
    })),
});
