import {createNodeId, splitTrailingParentheticalSuffix} from '@stagistic/shared';

import {
    createScriptBlockNode, type ScriptDocument, type ScriptNode,
} from '../document';
import {
    isForcedCharacterCueLine, isQuotedCharacterCueLine, isUppercaseSyntaxLine,
} from '../syntax';
import {parseStagisticFrontmatter} from './frontmatter';
import {parseInlineText, parseStageDirectionLine} from './inline';
import {decodeNameLiteral, splitOutsideQuotes} from './literals';
import {type ParsedBlock, resolveMusicModes} from './resolveMusicModes';
import {type ParseStagisticResult, StagisticParseError} from './types';

type SpeechBlockType = 'dialogue' | 'lyrics';

const createBlock = (type: string, content: ScriptNode[] = []): ScriptNode => {
    const block = createScriptBlockNode(type, createNodeId());

    return {...block, content};
};

const parseAsideContent = (source: string, line: number) => {
    const trimmed = source.trim();
    const inner = trimmed.slice(1, -1).trim();

    return parseInlineText(inner, line);
};

const isCharacterCueLine = (value: string) => {
    const {base} = splitTrailingParentheticalSuffix(value);
    const candidate = base || value.trim();

    if (candidate.startsWith('@')) {
        return isForcedCharacterCueLine(value);
    }

    return isQuotedCharacterCueLine(value) || isUppercaseSyntaxLine(candidate);
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
        blocks.push(createBlock('aside', parseAsideContent(suffix, line)));
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

export const parseStagistic = (source: string): ParseStagisticResult => {
    const {
        body, bodyStartLine, title, titlePage,
    } = parseStagisticFrontmatter(source);
    const lines = body.split('\n');
    const hasActs = lines.some(line => (/^##\s+/u).test(line));
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
                parseStageDirectionLine(rawLine.slice(1), lineNumber).forEach(block => blocks.push({...block, line: lineNumber}));

                return;
            }

            if (isParenthetical(rawLine)) {
                blocks.push({
                    line: lineNumber,
                    node: createBlock('aside', parseAsideContent(trimmed, lineNumber)),
                });

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
            parseStageDirectionLine(rawLine.slice(1), lineNumber).forEach(block => blocks.push({...block, line: lineNumber}));

            return;
        }

        const headingMatch = (/^(#{1,2})\s+(.*)$/u).exec(rawLine);

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
            parseCharacterCue(inlineDialogue.cue, lineNumber).forEach(node => blocks.push({line: lineNumber, node}));
            blocks.push({
                line: lineNumber,
                node: createBlock('dialogue', parseInlineText(inlineDialogue.dialogue, lineNumber)),
            });
            inSpeech = true;
            lastSpeechType = 'dialogue';

            return;
        }

        if (isCharacterCueLine(rawLine)) {
            parseCharacterCue(rawLine, lineNumber).forEach(node => blocks.push({line: lineNumber, node}));
            inSpeech = true;
            lastSpeechType = 'dialogue';

            return;
        }

        parseStageDirectionLine(rawLine, lineNumber).forEach(block => blocks.push({...block, line: lineNumber}));
    });

    if (blocks.length === 0) {
        throw new StagisticParseError('The file does not contain any script blocks.');
    }

    const document: ScriptDocument = {
        type: 'doc',
        content: resolveMusicModes(blocks),
    };

    return {
        document,
        title,
        titlePage,
    };
};
