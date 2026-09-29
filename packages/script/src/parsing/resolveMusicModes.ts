import {type ScriptNode} from '../document';
import {MUSIC_MODE_ATTR} from '../music';
import {type ParsedStageBlock} from './inline';
import {StagisticParseError} from './types';

export type ParsedBlock = ParsedStageBlock & {line: number};
const getSingleMusicMarker = (block: ParsedBlock) => {
    return block.music?.length === 1 ? block.music[0] : null;
};

const isPureMusicBlock = (block: ParsedBlock, role: 'start' | 'out') => {
    return getSingleMusicMarker(block)?.role === role && block.node.content?.length === 1;
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

        const marker = getSingleMusicMarker(block);
        const next = blocks[index + 1];
        const nextMarker = next ? getSingleMusicMarker(next) : null;
        const isHit =
            marker?.role === 'start' && isPureMusicBlock(block, 'start') && next && isPureMusicBlock(next, 'out') && nextMarker?.number === marker.number;

        if (isHit) {
            const musicNode = block.node.content?.at(-1);

            if (musicNode?.attrs) {
                musicNode.attrs[MUSIC_MODE_ATTR] = 'hit';
            }

            result.push(block.node);
            index += 1;
            continue;
        }

        for (const current of markers) {
            if (current.role === 'start') {
                const musicNumber = current.number;

                if (musicNumber === null || !Number.isSafeInteger(musicNumber) || musicNumber < 1) {
                    throw new StagisticParseError('Music numbers must be positive integers.', current.line);
                }

                if (seenMusicNumbers.has(musicNumber)) {
                    throw new StagisticParseError(`Music ${musicNumber} is declared more than once.`, current.line);
                }

                seenMusicNumbers.add(musicNumber);
                openMusicNumber = musicNumber;
                continue;
            }

            if (current.number !== null && openMusicNumber !== current.number) {
                throw new StagisticParseError(`@@out ${current.number} does not match the currently open music.`, current.line);
            }

            openMusicNumber = null;
        }

        if (isPureMusicBlock(block, 'out') && result.length > 0) {
            const previous = result.at(-1);

            if (previous) {
                previous.content = [...(previous.content ?? []), ...(block.node.content ?? [])];
                continue;
            }
        }

        result.push(block.node);
    }

    return result;
};
