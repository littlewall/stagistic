import {buildScriptBlockIndex, collectCommentAnchorThreadIds, parseStagistic} from '@stagistic/script';
import {describe, expect, it} from 'vite-plus/test';

import source from './example-script.stagistic?raw';
import {anchorExampleComment, prepareExampleScriptDocument} from './prepareExampleScriptDocument';

describe('prepareExampleScriptDocument', () => {
    it('prepares the example source as a two-act musical with linked-ready characters', () => {
        const parsed = parseStagistic(source);
        const {characterKeys, document, groupKeys, sceneBlockIdsByTitle, scoreMusicId} = prepareExampleScriptDocument(parsed.document);
        const {snapshot} = buildScriptBlockIndex(document);

        expect(snapshot.blocks.filter(block => block.blockType === 'act')).toHaveLength(2);
        expect(snapshot.blocks.filter(block => block.blockType === 'scene')).toHaveLength(4);
        expect(sceneBlockIdsByTitle.size).toBe(4);
        expect(characterKeys).toEqual(['ELI', 'MARA', 'ROOK', 'TAM']);
        expect(groupKeys).toEqual(['CREW']);
        expect(snapshot.blocks.some(block => block.blockType === 'stageDirection' && block.characterRefs?.some(ref => ref.characterId === null))).toBe(true);
        expect(snapshot.blocks.filter(block => block.blockType === 'lyrics')).not.toHaveLength(0);
        expect(snapshot.blocks.filter(block => block.blockType === 'note')).toHaveLength(2);
        expect(snapshot.music.map(music => [music.title, music.kind, music.mode])).toEqual([
            ['One Small Light', 'song', 'open'],
            ['Thunderclap', 'instrumental', 'hit'],
            ['Storm Underscore', 'instrumental', 'open'],
            ['One Small Light (Reprise)', 'song', 'open'],
        ]);
        expect(snapshot.music[0]?.musicId).toBe(scoreMusicId);
        expect(snapshot.orphanMusicOutBlockIds).toEqual([]);
        expect(parsed.titlePage.credits).toHaveLength(2);
        expect(parsed.titlePage.draftDateMode).toBe('manual');
        expect([parsed.titlePage.source, parsed.titlePage.contact, parsed.titlePage.copyright].every(Boolean)).toBe(true);
    });

    it('anchors range comments with a mark and block comments by block id', () => {
        const {document} = prepareExampleScriptDocument(parseStagistic(source).document);
        const range = anchorExampleComment(document, {
            id: 'thread-range',
            blockText: 'Then we pull together.',
            quote: 'pull together',
        });
        const block = anchorExampleComment(document, {id: 'thread-block', blockText: 'SHINE, SHINE,'});
        const anchoredBlock = range.document.content.find(node => node.attrs?.id === range.blockId);

        expect(collectCommentAnchorThreadIds(range.document)).toEqual(new Set(['thread-range']));
        expect(anchoredBlock?.content?.map(child => [child.text, child.marks?.map(mark => mark.type) ?? []])).toEqual([
            ['Then we ', []],
            ['pull ', ['commentAnchor']],
            ['together', ['underline', 'commentAnchor']],
            ['.', []],
        ]);
        expect(block.document).toBe(document);
        expect(document.content.find(node => node.attrs?.id === block.blockId)?.type).toBe('lyrics');
    });

    it('gets new block and music IDs every time it parses the source', () => {
        const first = prepareExampleScriptDocument(parseStagistic(source).document);
        const second = prepareExampleScriptDocument(parseStagistic(source).document);
        const firstBlocks = buildScriptBlockIndex(first.document).snapshot.blocks;
        const secondBlocks = buildScriptBlockIndex(second.document).snapshot.blocks;

        expect(first.scoreMusicId).not.toBe(second.scoreMusicId);
        expect(firstBlocks.map(block => block.blockId)).not.toEqual(secondBlocks.map(block => block.blockId));
    });
});
