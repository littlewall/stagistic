import {getScriptBlockId, type ScriptDocument, type ScriptNode} from '@stagistic/script';

import type {StepkgAttachmentSnapshot, StepkgManifest, StepkgSnapshot} from './contracts';
import type {StepkgImportIssue} from './importContracts';
import {readStepkgContainer} from './readContainer';
import {sha256Hex} from './sha256';

export interface StepkgPackage {
    manifest: StepkgManifest;
    snapshot: StepkgSnapshot;
    assets: Map<string, Uint8Array>;
}

export type StepkgReadResult = {ok: true; package: StepkgPackage} | {ok: false; issues: StepkgImportIssue[]};

interface StepkgAttachmentsFile {
    items: {id: string; filename: string; mimeType: string; sizeBytes: number; assetPath: string; createdAt: string; updatedAt: string}[];
    bindings: StepkgSnapshot['attachmentBindings'];
}

const REQUIRED_PATHS = [
    'document.json',
    'data/script.json',
    'data/title-page.json',
    'data/settings.json',
    'data/characters.json',
    'data/music.json',
    'data/scenes.json',
    'data/attachments.json',
] as const;

const decode = (bytes: Uint8Array): unknown => JSON.parse(new TextDecoder().decode(bytes));

const collectTopLevelBlockIds = (document: ScriptDocument): Set<string> => {
    const ids = new Set<string>();
    (document.content ?? []).forEach((node: ScriptNode) => {
        const id = getScriptBlockId(node);
        if (id) ids.add(id);
    });
    return ids;
};

export const readStepkg = async (bytes: Uint8Array): Promise<StepkgReadResult> => {
    const container = await readStepkgContainer(bytes);
    if (!container.ok) return container;

    const {manifest, files} = container;
    const issues: StepkgImportIssue[] = [];

    for (const file of manifest.files) {
        const content = files.get(file.path);
        if (!content) {
            issues.push({code: 'file_missing', stage: 'checksum', path: file.path});
            continue;
        }
        if (content.byteLength !== file.byteLength) {
            issues.push({code: 'checksum_mismatch', stage: 'checksum', path: file.path, details: {expected: file.byteLength, found: content.byteLength}});
            continue;
        }
        const digest = await sha256Hex(content);
        if (digest !== file.sha256) {
            issues.push({code: 'checksum_mismatch', stage: 'checksum', path: file.path});
        }
    }
    if (issues.length > 0) return {ok: false, issues};

    for (const path of REQUIRED_PATHS) {
        if (!files.has(path)) issues.push({code: 'schema_invalid', stage: 'schema', path});
    }
    if (issues.length > 0) return {ok: false, issues};

    let document: ScriptDocument;
    let script: StepkgSnapshot['script'];
    let characters: StepkgSnapshot['characters'];
    let music: StepkgSnapshot['music'];
    let scenes: StepkgSnapshot['scenes'];
    let titlePage: StepkgSnapshot['titlePage'];
    let settings: StepkgSnapshot['settings'];
    let attachmentsFile: StepkgAttachmentsFile;
    let comments: StepkgSnapshot['comments'] = {threads: [], messages: []};
    try {
        document = decode(files.get('document.json')!) as ScriptDocument;
        script = decode(files.get('data/script.json')!) as StepkgSnapshot['script'];
        titlePage = decode(files.get('data/title-page.json')!) as StepkgSnapshot['titlePage'];
        settings = decode(files.get('data/settings.json')!) as StepkgSnapshot['settings'];
        characters = decode(files.get('data/characters.json')!) as StepkgSnapshot['characters'];
        music = decode(files.get('data/music.json')!) as StepkgSnapshot['music'];
        scenes = decode(files.get('data/scenes.json')!) as StepkgSnapshot['scenes'];
        attachmentsFile = decode(files.get('data/attachments.json')!) as StepkgAttachmentsFile;
        // Optional: packages written before comments existed have no comments file.
        const commentsBytes = files.get('data/comments.json');
        if (commentsBytes) comments = decode(commentsBytes) as StepkgSnapshot['comments'];
    } catch {
        return {ok: false, issues: [{code: 'schema_invalid', stage: 'schema'}]};
    }

    if (manifest.script.id !== script.id) {
        return {ok: false, issues: [{code: 'broken_reference', stage: 'validation', details: {manifestId: manifest.script.id, dataId: script.id}}]};
    }

    const characterIds = new Set(characters.characters.map(character => character.id));
    const musicIds = new Set(music.items.map(item => item.id));
    const locationIds = new Set(scenes.locations.map(location => location.id));
    const attachmentIds = new Set(attachmentsFile.items.map(item => item.id));
    const blockIds = collectTopLevelBlockIds(document);

    characters.groups.forEach(group => {
        group.memberIds.forEach(memberId => {
            if (!characterIds.has(memberId)) {
                issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'character', id: memberId}, details: {via: `group ${group.id}`}});
            }
        });
    });
    scenes.scenes.forEach(scene => {
        if (scene.headingBlockId && !blockIds.has(scene.headingBlockId)) {
            issues.push({
                code: 'broken_reference',
                stage: 'validation',
                entity: {type: 'scene', id: scene.id},
                details: {headingBlockId: scene.headingBlockId},
            });
        }
        scene.locationIds.forEach(locationId => {
            if (!locationIds.has(locationId)) {
                issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'scene', id: scene.id}, details: {locationId}});
            }
        });
    });
    music.items.forEach(item => {
        if (item.startBlockId && !blockIds.has(item.startBlockId)) {
            issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'music', id: item.id}, details: {startBlockId: item.startBlockId}});
        }
        if (item.endBlockId && !blockIds.has(item.endBlockId)) {
            issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'music', id: item.id}, details: {endBlockId: item.endBlockId}});
        }
    });
    attachmentsFile.bindings.forEach(binding => {
        if (!musicIds.has(binding.target.id)) issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'music', id: binding.target.id}});
        if (!attachmentIds.has(binding.attachmentId))
            issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'attachment', id: binding.attachmentId}});
    });

    const commentThreadIds = new Set(comments.threads.map(thread => thread.id));
    comments.messages.forEach(message => {
        if (!commentThreadIds.has(message.threadId)) {
            issues.push({code: 'broken_reference', stage: 'validation', entity: {type: 'comment', id: message.id}, details: {threadId: message.threadId}});
        }
    });

    const assets = new Map<string, Uint8Array>();
    attachmentsFile.items.forEach(item => {
        const content = files.get(item.assetPath);
        if (!content) {
            issues.push({code: 'asset_missing', stage: 'assets', path: item.assetPath, entity: {type: 'attachment', id: item.id}});
            return;
        }
        assets.set(item.assetPath, content);
    });

    if (issues.length > 0) return {ok: false, issues};

    const attachments: StepkgAttachmentSnapshot[] = attachmentsFile.items.map(item => ({
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        contentKey: item.assetPath,
    }));

    const snapshot: StepkgSnapshot = {
        script,
        document,
        titlePage,
        settings,
        characters,
        music,
        scenes,
        attachments,
        attachmentBindings: attachmentsFile.bindings,
        comments,
    };

    return {ok: true, package: {manifest, snapshot, assets}};
};
