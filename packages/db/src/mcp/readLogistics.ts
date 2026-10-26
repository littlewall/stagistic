import {resolveScriptBlockNodeType} from '@stagistic/script';

import {resolveCharactersForBlock} from './characterResolution';
import type {McpSnapshot} from './readSnapshot';
import {resolveMcpScopes} from './semanticScopes';
import type {McpItem} from './types';

interface SceneCharacterPresence {
    character_id: string | null,
    character_key: string,
    first_block_id: string,
    last_block_id: string,
    speech_count: number,
}

interface SceneLogisticsItem {
    characters_present: SceneCharacterPresence[],
    heading_block_id: string | null,
    scene_id: string,
    scene_number: string | null,
    title: string,
}

interface QuickChangeItem {
    character_id: string | null,
    character_key: string,
    exit_block_id: string,
    from_scene_id: string,
    intervening_speech_count: number,
    reentry_block_id: string,
    risk: 'critical' | 'warning',
    to_scene_id: string,
}

export const readStageLogistics = (snapshot: McpSnapshot): McpItem[] => {
    const scopes = resolveMcpScopes(snapshot);
    const {
        scenes,
        blocks,
        refs,
        characters,
    } = snapshot;

    // Order scenes by their heading block appearance in the script
    const sceneOrder = scenes.map(scene => {
        const index = blocks.findIndex(b => b.id === scene.headingBlockId);

        return {scene, index: index >= 0 ? index : Number.MAX_SAFE_INTEGER};
    }).sort((a, b) => a.index - b.index).map(item => item.scene);

    const sceneLogistics: SceneLogisticsItem[] = [];
    const allSpeeches: Array<{
        character_id: string | null,
        character_key: string,
        cue_block_id: string,
        scene_id: string,
    }> = [];

    for (const scene of sceneOrder) {
        const sceneBlocks = blocks.filter(b => scopes.get(b.id)?.sceneId === scene.id);
        const headingBlock = scene.headingBlockId ? blocks.find(b => b.id === scene.headingBlockId) : null;
        const charPresenceMap = new Map<string, {
            character_id: string | null,
            character_key: string,
            first_block_id: string,
            last_block_id: string,
            speech_count: number,
        }>();

        let currentCueBlockId: string | null = null;
        let currentCharacters: Array<{id: string | null, key: string}> = [];

        for (const block of sceneBlocks) {
            const nodeType = resolveScriptBlockNodeType(block.blockType);

            if (nodeType === 'character') {
                currentCueBlockId = block.id;
                currentCharacters = resolveCharactersForBlock(block.id, block.textContent, refs, characters);

                for (const char of currentCharacters) {
                    allSpeeches.push({
                        scene_id: scene.id,
                        character_id: char.id,
                        character_key: char.key,
                        cue_block_id: block.id,
                    });

                    const existing = charPresenceMap.get(char.key);

                    if (existing) {
                        existing.speech_count += 1;
                        existing.last_block_id = block.id;
                    } else {
                        charPresenceMap.set(char.key, {
                            character_id: char.id,
                            character_key: char.key,
                            first_block_id: block.id,
                            last_block_id: block.id,
                            speech_count: 1,
                        });
                    }
                }
            } else if (currentCueBlockId && (nodeType === 'dialogue' || nodeType === 'lyrics')) {
                for (const char of currentCharacters) {
                    const existing = charPresenceMap.get(char.key);

                    if (existing) {
                        existing.last_block_id = block.id;
                    }
                }
            }
        }

        sceneLogistics.push({
            scene_id: scene.id,
            scene_number: scene.sceneNumber,
            heading_block_id: scene.headingBlockId,
            title: headingBlock?.textContent ?? `Scene ${scene.sceneNumber ?? ''}`.trim(),
            characters_present: Array.from(charPresenceMap.values()),
        });
    }

    // Detect quick changes between consecutive scenes
    const quickChanges: QuickChangeItem[] = [];

    for (let i = 0; i < sceneLogistics.length - 1; i += 1) {
        const currentScene = sceneLogistics[i];
        const nextScene = sceneLogistics[i + 1];

        for (const charInCurrent of currentScene.characters_present) {
            const charInNext = nextScene.characters_present.find(c => c.character_key === charInCurrent.character_key);

            if (!charInNext) {
                continue;
            }

            // Find last speech index of this character in allSpeeches for currentScene
            const lastSpeechIdx = allSpeeches.findLastIndex(
                s => s.scene_id === currentScene.scene_id && s.character_key === charInCurrent.character_key,
            );
            // Find first speech index of this character in allSpeeches for nextScene
            const firstNextSpeechIdx = allSpeeches.findIndex(
                s => s.scene_id === nextScene.scene_id && s.character_key === charInNext.character_key,
            );

            if (lastSpeechIdx >= 0 && firstNextSpeechIdx > lastSpeechIdx) {
                const intervening = firstNextSpeechIdx - lastSpeechIdx - 1;

                if (intervening <= 5) {
                    quickChanges.push({
                        character_id: charInCurrent.character_id,
                        character_key: charInCurrent.character_key,
                        from_scene_id: currentScene.scene_id,
                        to_scene_id: nextScene.scene_id,
                        exit_block_id: charInCurrent.last_block_id,
                        reentry_block_id: charInNext.first_block_id,
                        intervening_speech_count: intervening,
                        risk: intervening <= 2 ? 'critical' : 'warning',
                    });
                }
            }
        }
    }

    return [
        {
            kind: 'stage_logistics',
            scenes: sceneLogistics,
            quick_changes: quickChanges,
            ghost_characters: [],
        },
    ];
};
