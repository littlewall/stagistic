import {type ScriptNode} from '../document';
import {MUSIC_MODE_ATTR, MUSIC_START_NODE_NAME} from '../music';
import {type ParsedStageBlock} from './inline';
import {StagisticParseError} from './types';

export type ParsedBlock = ParsedStageBlock & {line: number};

const getSingleMusicMarker = (block: ParsedBlock) => {
    return block.music?.length === 1 ? block.music[0] : null;
};

const isPureMusicBlock = (block: ParsedBlock, role: 'start' | 'out') => {
    return getSingleMusicMarker(block)?.role === role && block.node.content?.length === 1;
};

// A hit marker closes its block: `@@music N "…"` may follow text or other markers, as serializeStagistic writes it.
const isMusicHit = (block: ParsedBlock, next: ParsedBlock | undefined) => {
    const marker = block.music?.at(-1);

    return marker?.role === 'start' && block.node.content?.at(-1)?.type === MUSIC_START_NODE_NAME && next !== undefined
        && isPureMusicBlock(next, 'out') && getSingleMusicMarker(next)?.number === marker.number;
};

const validateMusicNumber = (musicNumber: number | null, line: number) => {
    if (musicNumber === null || !Number.isSafeInteger(musicNumber) || musicNumber < 1) {
        throw new StagisticParseError('Music numbers must be positive integers.', line);
    }

    return musicNumber;
};

const validateOutMarker = (
    marker: NonNullable<ParsedBlock['music']>[number],
    openMusicNumber: number | null,
) => {
    if (marker.number !== null && openMusicNumber !== marker.number) {
        throw new StagisticParseError(`@@out ${marker.number} does not match the currently open music.`, marker.line);
    }
};

export const resolveMusicModes = (blocks: ParsedBlock[]): ScriptNode[] => {
    const result: ScriptNode[] = [];
    const seenMusicNumbers = new Set<number>();
    let openMusicNumber: number | null = null;

    for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];

        if (block.node.type === 'scene') {
            openMusicNumber = null;
        }

        const markers = block.music ?? [];

        if (markers.length === 0) {
            result.push(block.node);
            continue;
        }

        const isHit = isMusicHit(block, blocks[index + 1]);

        for (const current of isHit ? markers.slice(0, -1) : markers) {
            if (current.role === 'start') {
                const musicNumber = validateMusicNumber(current.number, current.line);

                if (seenMusicNumbers.has(musicNumber)) {
                    throw new StagisticParseError(`Music ${musicNumber} is declared more than once.`, current.line);
                }

                seenMusicNumbers.add(musicNumber);
                openMusicNumber = musicNumber;
                continue;
            }

            validateOutMarker(current, openMusicNumber);
            openMusicNumber = null;
        }

        if (isHit) {
            const musicNode = block.node.content?.at(-1);

            if (musicNode?.attrs) {
                musicNode.attrs[MUSIC_MODE_ATTR] = 'hit';
            }

            result.push(block.node);
            index += 1;
            continue;
        }

        if (isPureMusicBlock(block, 'out') && result.length > 0) {
            const previous = result.at(-1);

            if (previous) {
                previous.content = [...previous.content ?? [], ...block.node.content ?? []];
                continue;
            }
        }

        result.push(block.node);
    }

    return result;
};
