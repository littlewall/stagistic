import type {ScriptNode} from '@stagistic/script';

import type {StepkgAttachmentSnapshot, StepkgExportIssue, StepkgSnapshot} from './contracts';
import {getStepkgAssetPath, isSafeStepkgAttachmentId, isSafeStepkgPath} from './paths';

type EntityType = NonNullable<StepkgExportIssue['entity']>['type'];

const issue = (code: StepkgExportIssue['code'], entityType: EntityType, id: string, path?: string): StepkgExportIssue => ({
    code,
    stage: 'validation',
    entity: {type: entityType, id},
    ...(path ? {path} : {}),
});

const collectBlockIds = (nodes: ScriptNode[]): Set<string> => {
    const ids = new Set<string>();

    const visit = (node: ScriptNode): void => {
        if (typeof node.attrs?.id === 'string' && node.attrs.id.length > 0) {
            ids.add(node.attrs.id);
        }
        node.content?.forEach(visit);
    };

    nodes.forEach(visit);
    return ids;
};

const addDuplicateAndEmptyIdIssues = (records: ReadonlyArray<{id: string}>, entityType: EntityType, issues: StepkgExportIssue[]): Set<string> => {
    const ids = new Set<string>();
    for (const record of records) {
        if (record.id.length === 0 || ids.has(record.id)) {
            issues.push(issue(record.id.length === 0 ? 'invalid_snapshot' : 'duplicate_id', entityType, record.id));
        }
        ids.add(record.id);
    }
    return ids;
};

const hasValidTimestamp = (value: string): boolean => Number.isFinite(Date.parse(value));

const validateAttachment = (attachment: StepkgAttachmentSnapshot, assetPaths: Set<string>, issues: StepkgExportIssue[]): void => {
    const assetPath = getStepkgAssetPath(attachment);
    if (!isSafeStepkgAttachmentId(attachment.id) || !isSafeStepkgPath(assetPath) || assetPaths.has(assetPath) || attachment.sizeBytes < 0) {
        issues.push(issue('invalid_snapshot', 'attachment', attachment.id, assetPath));
    }
    assetPaths.add(assetPath);
};

export const validateStepkgSnapshot = (snapshot: StepkgSnapshot): StepkgExportIssue[] => {
    const issues: StepkgExportIssue[] = [];
    const {script} = snapshot;
    if (script.id.length === 0 || script.title.length === 0 || !hasValidTimestamp(script.createdAt) || !hasValidTimestamp(script.updatedAt)) {
        issues.push(issue('invalid_snapshot', 'script', script.id));
    }

    const characterIds = addDuplicateAndEmptyIdIssues(snapshot.characters.characters, 'character', issues);
    const genderKeys = new Set(snapshot.characters.genderOptions.map(option => option.key));
    for (const character of snapshot.characters.characters) {
        if (character.genderKey !== null && !genderKeys.has(character.genderKey)) {
            issues.push(issue('broken_reference', 'character', character.id));
        }
    }
    for (const group of snapshot.characters.groups) {
        if (group.id.length === 0 || group.memberIds.some(memberId => !characterIds.has(memberId))) {
            issues.push(issue(group.id.length === 0 ? 'invalid_snapshot' : 'broken_reference', 'character', group.id));
        }
    }

    const blockIds = collectBlockIds(snapshot.document.content);
    const locationIds = new Set(snapshot.scenes.locations.map(location => location.id));
    addDuplicateAndEmptyIdIssues(snapshot.scenes.locations, 'scene', issues);
    addDuplicateAndEmptyIdIssues(snapshot.scenes.scenes, 'scene', issues);
    for (const scene of snapshot.scenes.scenes) {
        if ((scene.headingBlockId !== null && !blockIds.has(scene.headingBlockId)) || scene.locationIds.some(locationId => !locationIds.has(locationId))) {
            issues.push(issue('broken_reference', 'scene', scene.id));
        }
    }

    const musicIds = addDuplicateAndEmptyIdIssues(snapshot.music.items, 'music', issues);
    for (const music of snapshot.music.items) {
        if ((music.startBlockId !== null && !blockIds.has(music.startBlockId)) || (music.endBlockId !== null && !blockIds.has(music.endBlockId))) {
            issues.push(issue('broken_reference', 'music', music.id));
        }
    }

    const attachmentIds = addDuplicateAndEmptyIdIssues(snapshot.attachments, 'attachment', issues);
    const assetPaths = new Set<string>();
    snapshot.attachments.forEach(attachment => validateAttachment(attachment, assetPaths, issues));
    for (const binding of snapshot.attachmentBindings) {
        if (!musicIds.has(binding.target.id)) {
            issues.push(issue('broken_reference', 'music', binding.target.id));
        }
        if (!attachmentIds.has(binding.attachmentId)) {
            issues.push(issue('broken_reference', 'attachment', binding.attachmentId));
        }
    }

    return issues;
};
