import {
    buildScriptBlockIndex,
    type DerivedMusic,
    formatMusicNumber,
    getDefaultActName,
    type IndexedScriptBlock,
    normalizeActName,
    type ScriptDocument,
} from '@stagistic/script';

import type {ContentsValue} from '../../config';
import type {
    ContentsActGroup,
    ContentsInitialPagePlan,
    ContentsMusicEntry,
    ContentsSceneEntry,
} from '../../plan';
import type {
    ExportCharacter,
    ExportCharacterGroup,
} from '../../scriptData';
import {collectMusicSingers} from './collectMusicSingers';

const UNTITLED_SCENE = 'Untitled scene';
const UNTITLED_MUSIC = 'Untitled music';

const groupOpenMusicByStartBlock = (music: DerivedMusic[]) => {
    const byBlockId = new Map<string, DerivedMusic[]>();

    music
        .filter(item => item.mode === 'open')
        .forEach(item => {
            const existing = byBlockId.get(item.startBlockId) ?? [];

            existing.push(item);
            byBlockId.set(item.startBlockId, existing);
        });

    return byBlockId;
};

const toMusicEntry = (
    music: DerivedMusic,
    blocks: IndexedScriptBlock[],
    characters: ExportCharacter[],
    groups: ExportCharacterGroup[],
): ContentsMusicEntry => {
    const singers = collectMusicSingers(music, {
        blocks, characters, groups,
    });
    const isInstrumental = music.kind === 'instrumental' || singers.length === 0;

    return {
        musicId: music.musicId,
        number: formatMusicNumber(music),
        title: music.title || UNTITLED_MUSIC,
        singers: isInstrumental ? [] : singers,
        isInstrumental,
        startBlockId: music.startBlockId,
    };
};

export const deriveContentsPlan = (
    value: ContentsValue,
    doc: ScriptDocument,
    characters: ExportCharacter[],
    groups: ExportCharacterGroup[],
): ContentsInitialPagePlan | null => {
    if (!value.enabled) {
        return null;
    }

    const {snapshot} = buildScriptBlockIndex(doc);
    const {blocks} = snapshot;
    const openMusicByStartBlock = groupOpenMusicByStartBlock(snapshot.music);
    const acts: ContentsActGroup[] = [];
    let currentAct: ContentsActGroup | null = null;
    let currentScene: ContentsSceneEntry | null = null;
    let actCounter = 0;
    let sceneNumber = 0;

    const ensureAct = (): ContentsActGroup => {
        if (!currentAct) {
            currentAct = {
                name: null, preSceneMusic: [], scenes: [],
            };
            acts.push(currentAct);
        }

        return currentAct;
    };

    blocks.forEach(block => {
        if (block.blockType === 'act') {
            actCounter += 1;
            currentAct = {
                name: normalizeActName(block.textContent) || getDefaultActName(actCounter),
                preSceneMusic: [],
                scenes: [],
            };
            acts.push(currentAct);
            currentScene = null;
        } else if (block.blockType === 'scene') {
            sceneNumber += 1;
            currentScene = {
                sceneNumber,
                title: block.textContent || UNTITLED_SCENE,
                startBlockId: block.blockId,
                music: [],
            };
            ensureAct().scenes.push(currentScene);
        }

        (openMusicByStartBlock.get(block.blockId) ?? []).forEach(music => {
            const entry = toMusicEntry(music, blocks, characters, groups);

            if (currentScene) {
                currentScene.music.push(entry);

                return;
            }

            ensureAct().preSceneMusic.push(entry);
        });
    });

    const populated = acts.filter(act => act.scenes.length > 0 || act.preSceneMusic.length > 0);
    const hasScenes = populated.some(act => act.scenes.length > 0);
    const hasMusic = populated.some(act => act.preSceneMusic.length > 0
        || act.scenes.some(scene => scene.music.length > 0));
    const hasContent = value.variant === 'scenes'
        ? hasScenes
        : value.variant === 'musical-numbers' ? hasMusic : hasScenes || hasMusic;

    if (!hasContent) {
        return null;
    }

    return {
        kind: 'contents',
        variant: value.variant,
        acts: populated,
        showScoreColumn: false,
    };
};
