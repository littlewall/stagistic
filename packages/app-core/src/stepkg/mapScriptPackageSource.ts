import type {ScriptPackageSource} from '@stagistic/db';
import type {StepkgSnapshot} from '@stagistic/stepkg';

const toIso = (timestamp: number): string => new Date(timestamp).toISOString();

export const mapScriptPackageSourceToStepkg = (source: ScriptPackageSource): StepkgSnapshot => {
    const memberIdsByGroup = new Map<string, string[]>();
    source.characterGroupMembers.forEach(member => {
        const memberIds = memberIdsByGroup.get(member.groupId) ?? [];
        memberIds.push(member.characterId);
        memberIdsByGroup.set(member.groupId, memberIds);
    });
    const locationIdsByScene = new Map<string, string[]>();
    source.sceneLocations.forEach(assignment => {
        const locationIds = locationIdsByScene.get(assignment.sceneId) ?? [];
        locationIds.push(assignment.locationId);
        locationIdsByScene.set(assignment.sceneId, locationIds);
    });
    const musicById = new Map(source.music.map(music => [music.id, music]));

    return {
        script: {
            id: source.script.id,
            title: source.script.title,
            subtitle: source.script.subtitle,
            createdAt: toIso(source.script.createdAt),
            updatedAt: toIso(source.script.updatedAt),
        },
        document: source.document,
        titlePage: source.titlePage,
        settings: source.settings,
        characters: {
            characters: source.characters
                .filter(character => character.kind === 'character')
                .map(character => ({
                    id: character.id,
                    key: character.characterKey,
                    colorHex: character.colorHex,
                    genderKey: character.genderKey,
                    notes: character.notes,
                    backstory: character.backstory,
                    outline: character.outline,
                    voiceType: character.voiceType,
                    vocalRangeLow: character.vocalRangeLow,
                    vocalRangeHigh: character.vocalRangeHigh,
                    createdAt: toIso(character.createdAt),
                    updatedAt: toIso(character.updatedAt),
                })),
            groups: source.characters
                .filter(character => character.kind === 'group')
                .map(group => ({
                    id: group.id,
                    key: group.characterKey,
                    colorHex: group.colorHex,
                    memberIds: memberIdsByGroup.get(group.id) ?? [],
                    createdAt: toIso(group.createdAt),
                    updatedAt: toIso(group.updatedAt),
                })),
            genderOptions: source.characterGenders.map(gender => ({
                id: gender.id,
                key: gender.genderKey,
                label: gender.genderLabel,
                createdAt: toIso(gender.createdAt),
                updatedAt: toIso(gender.updatedAt),
            })),
        },
        music: {
            items: source.music.map(music => ({
                id: music.id,
                sceneNumber: music.sceneNumber,
                indexInScene: music.indexInScene,
                mode: music.mode,
                title: music.title,
                kind: music.kind,
                startBlockId: music.startBlockId,
                endBlockId: music.endBlockId,
                createdAt: toIso(music.createdAt),
                updatedAt: toIso(music.updatedAt),
            })),
        },
        scenes: {
            scenes: source.scenes.map(scene => ({
                id: scene.id,
                headingBlockId: scene.headingBlockId,
                sceneNumber: scene.sceneNumber,
                colorHex: scene.colorHex,
                synopsis: scene.synopsis,
                locationIds: locationIdsByScene.get(scene.id) ?? (scene.locationId === null ? [] : [scene.locationId]),
                createdAt: toIso(scene.createdAt),
                updatedAt: toIso(scene.updatedAt),
            })),
            locations: source.locations.map(location => ({
                id: location.id,
                name: location.name,
                description: location.description,
                createdAt: toIso(location.createdAt),
                updatedAt: toIso(location.updatedAt),
            })),
        },
        attachments: source.attachments.map(attachment => ({
            id: attachment.id,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            contentKey: attachment.storageKey,
            createdAt: toIso(attachment.createdAt),
            updatedAt: toIso(attachment.updatedAt),
        })),
        attachmentBindings: source.musicAttachmentBindings.map((binding, order) => ({
            target: {type: 'music' as const, id: binding.musicId},
            attachmentId: binding.attachmentId,
            role: binding.role,
            order,
            createdAt: toIso(musicById.get(binding.musicId)?.createdAt ?? source.script.updatedAt),
        })),
    };
};
