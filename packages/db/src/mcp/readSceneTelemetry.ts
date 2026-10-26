import {LocalMcpReadError} from '@stagistic/mcp-contract';
import {resolveScriptBlockNodeType} from '@stagistic/script';

import {resolveCharactersForBlock} from './characterResolution';
import type {McpSnapshot} from './readSnapshot';
import {resolveMcpScopes} from './semanticScopes';
import type {McpItem} from './types';

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

export const readSceneTelemetry = (snapshot: McpSnapshot, sceneId: string): McpItem[] => {
    const scene = snapshot.scenes.find(s => s.id === sceneId);

    if (!scene) {
        throw new LocalMcpReadError('NOT_FOUND');
    }

    const scopes = resolveMcpScopes(snapshot);
    const {
        blocks,
        refs,
        characters,
        music,
    } = snapshot;
    const sceneBlocks = blocks.filter(b => scopes.get(b.id)?.sceneId === sceneId);
    const headingBlock = scene.headingBlockId ? blocks.find(b => b.id === scene.headingBlockId) : null;

    let totalWords = 0;
    let totalSpeeches = 0;
    const charStatsMap = new Map<string, {
        character_id: string | null,
        character_key: string,
        speech_count: number,
        word_count: number,
    }>();

    let currentCharacters: Array<{id: string | null, key: string}> = [];
    const speechesSequence: Array<{
        block_id: string,
        character_keys: string[],
        text: string,
        words: number,
    }> = [];

    for (const block of sceneBlocks) {
        const nodeType = resolveScriptBlockNodeType(block.blockType);

        if (nodeType === 'character') {
            totalSpeeches += 1;
            currentCharacters = resolveCharactersForBlock(block.id, block.textContent, refs, characters);

            for (const char of currentCharacters) {
                const existing = charStatsMap.get(char.key);

                if (existing) {
                    existing.speech_count += 1;
                } else {
                    charStatsMap.set(char.key, {
                        character_id: char.id,
                        character_key: char.key,
                        speech_count: 1,
                        word_count: 0,
                    });
                }
            }

            speechesSequence.push({
                block_id: block.id,
                character_keys: currentCharacters.map(c => c.key),
                words: 0,
                text: '',
            });
        } else if (nodeType === 'dialogue' || nodeType === 'lyrics') {
            const words = countWords(block.textContent);

            totalWords += words;

            if (speechesSequence.length > 0) {
                const lastSpeech = speechesSequence[speechesSequence.length - 1];

                lastSpeech.words += words;
                lastSpeech.text = lastSpeech.text ? `${lastSpeech.text} ${block.textContent}` : block.textContent;
            }

            for (const char of currentCharacters) {
                const existing = charStatsMap.get(char.key);

                if (existing) {
                    existing.word_count += words;
                }
            }
        }
    }

    // Identify attached music cues and their lead-in speeches
    const sceneBlockIds = new Set(sceneBlocks.map(b => b.id));
    const sceneMusicCues = music.filter(m => m.startBlockId && sceneBlockIds.has(m.startBlockId)).map(m => {
        const musicBlockIndex = speechesSequence.findIndex(s => s.block_id === m.startBlockId);
        const precedingSpeeches = musicBlockIndex > 0
            ? speechesSequence.slice(Math.max(0, musicBlockIndex - 5), musicBlockIndex).map(s => s.block_id)
            : [];

        return {
            music_id: m.id,
            kind: m.kind,
            start_block_id: m.startBlockId,
            end_block_id: m.endBlockId,
            preceding_speech_block_ids: precedingSpeeches,
        };
    });

    const characterMetrics = Array.from(charStatsMap.values()).map(c => ({
        ...c,
        avg_words_per_speech: c.speech_count > 0 ? Number((c.word_count / c.speech_count).toFixed(1)) : 0,
    }));

    return [
        {
            kind: 'scene_telemetry',
            scene_id: scene.id,
            scene_number: scene.sceneNumber,
            title: headingBlock?.textContent ?? `Scene ${scene.sceneNumber ?? ''}`.trim(),
            heading_block_id: scene.headingBlockId,
            total_words: totalWords,
            total_speeches: totalSpeeches,
            characters: characterMetrics,
            music_cues: sceneMusicCues,
        },
    ];
};
