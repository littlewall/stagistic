import type {FountainJSONContent} from '../document';
import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
} from '../fountain';
import type {ScriptStructure} from './model';
import {collectStructureBlocks, normalizeScriptStructure} from './normalize';
import {getDefaultActName, normalizeActName} from './structureUtils';

export type StructureOutlineSceneItem = {
    kind: 'scene',
    blockId: string,
    title: string,
};

export type StructureOutlineMusicItem = {
    kind: 'music-start' | 'music-end',
    segmentId: string,
    musicType: 'song' | 'reprise' | 'underscore',
    name: string,
    blockId?: string,
    source?: 'explicit' | 'auto-open-next' | 'auto-scene-boundary' | 'auto-eof',
    anchor: 'block' | 'eof',
};

export type StructureOutlineItem = StructureOutlineSceneItem | StructureOutlineMusicItem;

export type StructureOutlineActGroup = {
    actId: string,
    actName: string,
    anchorBlockId: string,
    primary: boolean,
    items: StructureOutlineItem[],
};

export type ScriptStructureOutline = {
    acts: StructureOutlineActGroup[],
};

const createActGroup = (
    actId: string,
    actName: string,
    anchorBlockId: string,
    primary: boolean,
): StructureOutlineActGroup => ({
    actId,
    actName,
    anchorBlockId,
    primary,
    items: [],
});

export const buildScriptStructureOutline = (
    structure: ScriptStructure | null | undefined,
    content: FountainJSONContent[] | undefined,
): ScriptStructureOutline => {
    const blocks = collectStructureBlocks(content);
    const normalizedStructure = normalizeScriptStructure(structure, {content});

    if (blocks.length === 0) {
        return {
            acts: [],
        };
    }

    const startsByAnchor = new Map<string, StructureOutlineMusicItem[]>();
    const endsByAnchor = new Map<string, StructureOutlineMusicItem[]>();
    const eofEnds: StructureOutlineMusicItem[] = [];

    normalizedStructure.musicSegments.forEach(segment => {
        const startItem: StructureOutlineMusicItem = {
            kind: 'music-start',
            segmentId: segment.id,
            musicType: segment.musicType,
            name: segment.name,
            blockId: segment.startBlockId,
            anchor: 'block',
        };
        const startItems = startsByAnchor.get(segment.startBlockId) ?? [];

        startItems.push(startItem);
        startsByAnchor.set(segment.startBlockId, startItems);

        if (segment.end.anchor === 'eof') {
            eofEnds.push({
                kind: 'music-end',
                segmentId: segment.id,
                musicType: segment.musicType,
                name: segment.name,
                anchor: 'eof',
                source: segment.end.source,
            });

            return;
        }

        if (!segment.end.blockId) {
            return;
        }

        const endItems = endsByAnchor.get(segment.end.blockId) ?? [];

        endItems.push({
            kind: 'music-end',
            segmentId: segment.id,
            musicType: segment.musicType,
            name: segment.name,
            blockId: segment.end.blockId,
            anchor: 'block',
            source: segment.end.source,
        });
        endsByAnchor.set(segment.end.blockId, endItems);
    });

    const firstActBlock = blocks.find(block => block.blockType === ELEMENT_ACT && block.id);
    const fallbackAnchorBlockId = firstActBlock?.id ?? blocks[0].id;
    const fallbackActName = firstActBlock?.text
        ? normalizeActName(firstActBlock.text)
        : getDefaultActName(1);
    const outlineActs: StructureOutlineActGroup[] = [
        createActGroup(
            fallbackAnchorBlockId || 'structure-act-1',
            fallbackActName,
            fallbackAnchorBlockId || 'structure-act-1',
            true,
        ),
    ];
    let currentGroup = outlineActs[0];
    let actCounter = 0;

    blocks.forEach(block => {
        if (!block.id) {
            return;
        }

        if (block.blockType === ELEMENT_ACT) {
            actCounter += 1;

            const actName = normalizeActName(block.text) || getDefaultActName(actCounter);

            if (actCounter === 1 && currentGroup.items.length === 0) {
                currentGroup = {
                    ...currentGroup,
                    actId: block.id,
                    anchorBlockId: block.id,
                    actName,
                };
                outlineActs[0] = currentGroup;

                return;
            }

            currentGroup = createActGroup(block.id, actName, block.id, false);
            outlineActs.push(currentGroup);
        }

        const starts = startsByAnchor.get(block.id) ?? [];

        starts.forEach(item => {
            currentGroup.items.push(item);
        });

        if (block.blockType === ELEMENT_SCENE_HEADING) {
            currentGroup.items.push({
                kind: 'scene',
                blockId: block.id,
                title: block.text || 'Untitled scene',
            });
        }

        const ends = endsByAnchor.get(block.id) ?? [];

        ends.forEach(item => {
            currentGroup.items.push(item);
        });
    });

    if (eofEnds.length > 0) {
        eofEnds.forEach(item => {
            currentGroup.items.push(item);
        });
    }

    return {
        acts: outlineActs,
    };
};
