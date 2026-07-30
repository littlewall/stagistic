import {
    buildScriptBlockIndex,
    parseStagistic,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import source from './example-script.stagistic?raw';
import {prepareExampleScriptDocument} from './prepareExampleScriptDocument';

describe('prepareExampleScriptDocument', () => {
    it('prepares the example source as a two-act musical with linked-ready characters', () => {
        const parsed = parseStagistic(source);
        const {
            characterKeys,
            document,
            scoreMusicId,
        } = prepareExampleScriptDocument(parsed.document);
        const {snapshot} = buildScriptBlockIndex(document);

        expect(snapshot.blocks.filter(block => block.blockType === 'act')).toHaveLength(2);
        expect(snapshot.blocks.filter(block => block.blockType === 'scene')).toHaveLength(4);
        expect(characterKeys).toEqual(['ELI', 'MARA']);
        expect(snapshot.blocks.some(block => block.blockType === 'stageDirection'
            && block.characterRefs?.some(ref => ref.characterId === null))).toBe(true);
        expect(snapshot.blocks.filter(block => block.blockType === 'lyrics')).not.toHaveLength(0);
        expect(snapshot.music).toEqual([
            expect.objectContaining({
                kind: 'song',
                mode: 'open',
                musicId: scoreMusicId,
            }),
        ]);
        expect(document.content.some(node => node.type === 'stageDirection'
            && node.content?.every(child => child.type === 'musicStart'))).toBe(true);
        expect(snapshot.orphanMusicOutBlockIds).toEqual([]);
    });

    it('gets new block and music IDs every time it parses the source', () => {
        const first = prepareExampleScriptDocument(parseStagistic(source).document);
        const second = prepareExampleScriptDocument(parseStagistic(source).document);
        const firstBlocks = buildScriptBlockIndex(first.document).snapshot.blocks;
        const secondBlocks = buildScriptBlockIndex(second.document).snapshot.blocks;

        expect(first.scoreMusicId).not.toBe(second.scoreMusicId);
        expect(firstBlocks.map(block => block.blockId)).not.toEqual(
            secondBlocks.map(block => block.blockId),
        );
    });
});
