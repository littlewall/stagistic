import {
    createNodeId,
    splitTrailingParentheticalSuffix,
} from '@stagistic/shared';

import {CUE_MODE_ATTR} from '../cues';
import {
    createScriptBlockNode,
    type ScriptDocument,
    type ScriptNode,
} from '../document';
import {
    isForcedCharacterCueLine,
    isQuotedCharacterCueLine,
    isUppercaseSyntaxLine,
} from '../syntax';
import {parseStagisticFrontmatter} from './frontmatter';
import {
    parseInlineText,
    type ParsedStageBlock,
    parseStageDirectionLine,
} from './inline';
import {
    decodeNameLiteral,
    splitOutsideQuotes,
} from './literals';
import {
    type ParseStagisticResult,
    StagisticParseError,
} from './types';

type ParsedBlock = ParsedStageBlock & {line: number};
type SpeechBlockType = 'dialogue' | 'lyrics';

const createBlock = (type: string, content: ScriptNode[] = []): ScriptNode => {
    const block = createScriptBlockNode(type, createNodeId());

    return {...block, content};
};

const isCharacterCueLine = (value: string) => {
    const {base} = splitTrailingParentheticalSuffix(value);
    const candidate = base || value.trim();

    if (candidate.startsWith('@')) {
        return isForcedCharacterCueLine(value);
    }

    return isQuotedCharacterCueLine(value)
        || isUppercaseSyntaxLine(candidate);
};

const parseCharacterCue = (source: string, line: number) => {
    const withoutForcePrefix = source.trim().replace(/^@/u, '');
    const {base, suffix} = splitTrailingParentheticalSuffix(withoutForcePrefix);
    const names = splitOutsideQuotes(base, '/')
        .map(name => decodeNameLiteral(name, line))
        .map(name => name.trim())
        .filter(Boolean);

    if (names.length === 0) {
        throw new StagisticParseError('Character cue has no name.', line);
    }

    const blocks = [createBlock('character', [{type: 'text', text: names.join('/')}])];

    if (suffix) {
        blocks.push(createBlock('aside', parseInlineText(suffix, line)));
    }

    return blocks;
};

const splitInlineDialogue = (source: string) => {
    let inQuotes = false;
    let escaped = false;

    for (let index = 0; index < source.length; index += 1) {
        const character = source[index];

        if (escaped) {
            escaped = false;
            continue;
        }
        if (character === '\\' && inQuotes) {
            escaped = true;
            continue;
        }
        if (character === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (character !== ':') {
            continue;
        }

        const cue = source.slice(0, index).trim();

        if (!isCharacterCueLine(cue)) {
            return null;
        }

        return {cue, dialogue: source.slice(index + 1).trimStart()};
    }

    return null;
};

const isParenthetical = (value: string) => {
    const trimmed = value.trim();

    return trimmed.startsWith('(') && trimmed.endsWith(')');
};

const isPureCueBlock = (block: ParsedBlock, role: 'start' | 'out') => {
    return block.cue?.role === role && block.node.content?.length === 1;
};

const resolveCueModes = (blocks: ParsedBlock[]): ScriptNode[] => {
    const result: ScriptNode[] = [];
    const seenCueNumbers = new Set<number>();
    let openCueNumber: number | null = null;

    for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];

        if (block.node.type === 'scene') {
            openCueNumber = null;
        }

        if (!block.cue) {
            result.push(block.node);
            continue;
        }

        if (!Number.isSafeInteger(block.cue.number) || block.cue.number < 1) {
            throw new StagisticParseError('Cue numbers must be positive integers.', block.cue.line);
        }

        if (block.cue.role === 'start') {
            if (seenCueNumbers.has(block.cue.number)) {
                throw new StagisticParseError(`Cue ${block.cue.number} is declared more than once.`, block.cue.line);
            }
            seenCueNumbers.add(block.cue.number);

            const next = blocks[index + 1];
            const isHit = next
                && isPureCueBlock(next, 'out')
                && next.cue?.number === block.cue.number;

            if (isHit) {
                const cueContent = block.node.content ?? [];
                const cueNode = cueContent[cueContent.length - 1];

                if (cueNode?.attrs) {
                    cueNode.attrs[CUE_MODE_ATTR] = 'hit';
                }
                result.push(block.node);
                index += 1;
                continue;
            }

            openCueNumber = block.cue.number;
            result.push(block.node);
            continue;
        }

        if (openCueNumber !== block.cue.number) {
            throw new StagisticParseError(
                `@@out ${block.cue.number} does not match the currently open cue.`,
                block.cue.line,
            );
        }

        openCueNumber = null;
        result.push(block.node);
    }

    return result;
};

export const parseStagistic = (source: string): ParseStagisticResult => {
    const {
        body,
        bodyStartLine,
        title,
        titlePage,
    } = parseStagisticFrontmatter(source);
    const lines = body.split('\n');
    const hasActs = lines.some(line => /^##\s+/u.test(line));
    const blocks: ParsedBlock[] = [];
    let inSpeech = false;
    let lastSpeechType: SpeechBlockType = 'dialogue';
    let lastWasSoftBreak = false;

    lines.forEach((rawLine, index) => {
        const lineNumber = bodyStartLine + index;
        const trimmed = rawLine.trim();

        if (!trimmed) {
            inSpeech = false;
            lastWasSoftBreak = false;
            return;
        }

        if (inSpeech) {
            if (trimmed === '~') {
                if (!lastWasSoftBreak) {
                    blocks.push({line: lineNumber, node: createBlock(lastSpeechType)});
                    lastWasSoftBreak = true;
                }
                return;
            }

            lastWasSoftBreak = false;

            if (rawLine.startsWith('!')) {
                parseStageDirectionLine(rawLine.slice(1), lineNumber)
                    .forEach(block => blocks.push({...block, line: lineNumber}));
                return;
            }

            if (isParenthetical(rawLine)) {
                blocks.push({line: lineNumber, node: createBlock('aside', parseInlineText(trimmed, lineNumber))});
                return;
            }

            lastSpeechType = isUppercaseSyntaxLine(rawLine) ? 'lyrics' : 'dialogue';
            blocks.push({
                line: lineNumber,
                node: createBlock(lastSpeechType, parseInlineText(rawLine, lineNumber)),
            });
            return;
        }

        if (rawLine.startsWith('!')) {
            parseStageDirectionLine(rawLine.slice(1), lineNumber)
                .forEach(block => blocks.push({...block, line: lineNumber}));
            return;
        }

        const headingMatch = /^(#{1,2})\s+(.*)$/u.exec(rawLine);

        if (headingMatch) {
            const type = headingMatch[1] === '##' || !hasActs ? 'scene' : 'act';

            blocks.push({
                line: lineNumber,
                node: createBlock(type, parseInlineText(headingMatch[2], lineNumber)),
            });
            return;
        }

        if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
            const note = trimmed.slice(2, -2).trim();

            blocks.push({line: lineNumber, node: createBlock('note', parseInlineText(note, lineNumber))});
            return;
        }

        if (isParenthetical(rawLine)) {
            blocks.push({
                line: lineNumber,
                node: createBlock('stageDirection', parseInlineText(trimmed, lineNumber)),
            });
            return;
        }

        const inlineDialogue = splitInlineDialogue(rawLine);

        if (inlineDialogue) {
            parseCharacterCue(inlineDialogue.cue, lineNumber)
                .forEach(node => blocks.push({line: lineNumber, node}));
            blocks.push({
                line: lineNumber,
                node: createBlock('dialogue', parseInlineText(inlineDialogue.dialogue, lineNumber)),
            });
            inSpeech = true;
            lastSpeechType = 'dialogue';
            return;
        }

        if (isCharacterCueLine(rawLine)) {
            parseCharacterCue(rawLine, lineNumber)
                .forEach(node => blocks.push({line: lineNumber, node}));
            inSpeech = true;
            lastSpeechType = 'dialogue';
            return;
        }

        parseStageDirectionLine(rawLine, lineNumber)
            .forEach(block => blocks.push({...block, line: lineNumber}));
    });

    if (blocks.length === 0) {
        throw new StagisticParseError('The file does not contain any script blocks.');
    }

    const document: ScriptDocument = {
        type: 'doc',
        content: resolveCueModes(blocks),
    };

    return {
        document,
        title,
        titlePage,
    };
};
