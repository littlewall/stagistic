import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import * as fc from 'fast-check';

import {
    arbitraryEmphasis,
    arbitraryLowerWord,
    arbitraryPlainText,
    arbitraryTextRuns,
    arbitraryUpperText,
    capitalize,
    type EmphasisMark,
    type TextRun,
} from './textArbitraries';

/*
 * Valid ScriptDocument generator for schema version 4. Node shapes follow the document
 * schema (packages/script/src/document) and the editor's tiptap definitions:
 *
 * - block nodes: scene, act, stageDirection, character, aside, dialogue, lyrics, note
 *   (attrs: id, characterRefs on cues);
 * - inline nodes: text, musicStart (musicId, mode, title, kind), musicOut;
 * - marks: bold, italic, underline, characterTag (characterKey, characterId).
 *
 * Deliberately not generated:
 * - `hardBreak`, `commentAnchor` marks, music `draft`, document `attrs`
 *   (settings/importMeta): the `.stagistic` text format does not carry them;
 * - `dateFormat`/`logo` of the title page: not part of the file.
 * Constraints that keep a generated document inside what the text format can express are
 * commented where they apply and point at a counterexample test in
 * packages/script/src/serialization/stagisticRoundTrip.property.test.ts.
 *
 * Shape rules: the document starts with a heading; an act holds any number of scenes
 * (including none) after its own blocks; a speech is a character cue followed by
 * dialogue/lyrics/aside/stage-direction/soft-break lines.
 */

type Draft = {
    type: string,
    content: ScriptNode[],
    attrs?: Record<string, unknown>,
};

const emphasisMarks = (emphasis: readonly EmphasisMark[]) => emphasis.map(type => ({type}));

const runNodes = (runs: TextRun[]): ScriptNode[] => runs.map(run => ({
    type: 'text',
    text: run.text,
    ...run.emphasis.length > 0 ? {marks: emphasisMarks(run.emphasis)} : {},
}));

const arbitraryRichText = (words?: fc.Arbitrary<string>): fc.Arbitrary<ScriptNode[]> => arbitraryTextRuns(words).map(runNodes);

const draft = (type: string, content: fc.Arbitrary<ScriptNode[]>): fc.Arbitrary<Draft> => content.map(nodes => ({type, content: nodes}));

/* Cue names: uppercase, Capitalized, dotted or with a colon (both need quoting in text); one or two joined by `/`. */
const upperName = arbitraryUpperText.filter(text => text.length <= 12);
const capitalizedName = arbitraryLowerWord.filter(value => value.length >= 2).map(capitalize);
const dottedName = fc
    .tuple(capitalizedName, capitalizedName)
    .map(([title, name]) => `${title.slice(0, 3)}. ${name}`);
/* A name with a colon is quoted in text, so it is not cut into cue and dialogue. */
const colonName = fc
    .tuple(capitalizedName, fc.constantFrom(':', ': '), capitalizedName)
    .map(parts => parts.join(''));
const singleName = fc.oneof(
    {arbitrary: upperName, weight: 4},
    {arbitrary: capitalizedName, weight: 2},
    {arbitrary: dottedName, weight: 1},
    {arbitrary: colonName, weight: 1},
);

export const arbitraryCharacterCue = fc
    .array(singleName, {minLength: 1, maxLength: 2})
    .map(names => names.join('/'));

/* A cue the writer left empty is a real block too. */
const arbitraryCueOrEmpty = fc.oneof({arbitrary: arbitraryCharacterCue, weight: 9}, {arbitrary: fc.constant(''), weight: 1});

const arbitraryCharacter: fc.Arbitrary<Draft> = fc
    .tuple(arbitraryCueOrEmpty, fc.boolean())
    .map(([cue, withRefs]) => ({
        type: 'character',
        content: cue ? [{type: 'text', text: cue}] : [],
        ...withRefs && cue ? {attrs: {characterRefs: {[cue.split('/')[0].toUpperCase()]: 'character-ref'}}} : {},
    }));

/*
 * Lyrics in any case; an empty lyrics line is a block of its own. Block text never starts or ends
 * with whitespace: the editor forbids a leading space and the projection trims on save (Q23,
 * packages/db/src/blocks/extract.ts). Whitespace inside the text stays generated.
 */
const arbitraryLyrics: fc.Arbitrary<Draft> = fc
    .oneof(
        {arbitrary: arbitraryRichText(arbitraryUpperText), weight: 2},
        {arbitrary: arbitraryRichText(), weight: 2},
        {arbitrary: fc.constant<ScriptNode[]>([]), weight: 1},
    )
    .map(content => ({type: 'lyrics', content}));

type StagePartBody =
    | {kind: 'runs', runs: TextRun[]}
    | {
        kind: 'tag',
        name: string,
        characterId: string | null,
        emphasis: EmphasisMark[],
    }
    | {
        kind: 'music',
        title: string,
        musicKind: string | null,
        hit: boolean,
    }
    | {kind: 'out'};

type StagePart = StagePartBody & {gap: boolean};

const SEPARATOR: ScriptNode = {type: 'text', text: ' '};

const arbitraryMusicTitle = fc.string({unit: 'grapheme-ascii', maxLength: 16});

/*
 * Stage-direction content: text, character tags, music starts and music outs, in any order
 * (a block may be empty, start with an out, or hold only an out). `gap` puts a space before a part;
 * without it, parts touch (text directly before or after a marker, markers back to back).
 * `hit` music is only generated as the last inline of its block: a hit followed by more text reads
 * back as open music plus an out at the end of the block. Editor evidence for the omission:
 * the hit marker is an end point of the block in the music commands (MusicCommandsExtension).
 * Music exists in stage directions only: other block types turn music into text in the editor
 * (normalizeFormerStageDirectionContent).
 */
const arbitraryStageParts: fc.Arbitrary<StagePart[]> = fc.array(
    fc.tuple(
        fc.oneof(
            {arbitrary: arbitraryTextRuns().map((runs): StagePartBody => ({kind: 'runs', runs})), weight: 5},
            {
                arbitrary: fc.record({
                    kind: fc.constant<'tag'>('tag'),
                    name: fc.oneof(
                        arbitraryLowerWord.filter(value => value.length >= 2).map(capitalize),
                        dottedName,
                    ),
                    characterId: fc.constantFrom(null, 'character-1', 'character-2'),
                    emphasis: fc.oneof({arbitrary: fc.constant<EmphasisMark[]>([]), weight: 3}, {arbitrary: arbitraryEmphasis, weight: 1}),
                }),
                weight: 2,
            },
            {
                arbitrary: fc.record({
                    kind: fc.constant<'music'>('music'),
                    title: arbitraryMusicTitle,
                    musicKind: fc.constantFrom(null, null, 'song', 'instrumental'),
                    hit: fc.boolean(),
                }),
                weight: 2,
            },
            {arbitrary: fc.constant<StagePartBody>({kind: 'out'}), weight: 2},
        ),
        fc.boolean(),
    ).map(([part, gap]): StagePart => ({...part, gap})),
    {minLength: 0, maxLength: 4},
);

const stagePartNodes = (part: StagePart, isLast: boolean): ScriptNode[] => {
    if (part.kind === 'runs') {
        return runNodes(part.runs);
    }

    if (part.kind === 'tag') {
        return [
            {
                type: 'text',
                text: part.name,
                marks: [
                    ...emphasisMarks(part.emphasis),
                    {
                        type: 'characterTag',
                        attrs: {characterKey: part.name.toUpperCase(), characterId: part.characterId},
                    },
                ],
            },
        ];
    }

    if (part.kind === 'out') {
        return [{type: 'musicOut'}];
    }

    return [
        {
            type: 'musicStart',
            attrs: {
                musicId: 'music-id',
                mode: part.hit && isLast ? 'hit' : 'open',
                title: part.title,
                kind: part.musicKind,
            },
        },
    ];
};

const isAtom = (part: StagePart) => part.kind === 'music' || part.kind === 'out';

const arbitraryStageDirectionContent = arbitraryStageParts.map((parts): ScriptNode[] => {
    const content: ScriptNode[] = [];

    parts.forEach((part, index) => {
        const previous = parts[index - 1];
        const touchesText = previous && !isAtom(previous) && !isAtom(part);

        // Text parts always get a space between them, so adjacent runs never merge into one stretch.
        if (index > 0 && (part.gap || touchesText)) {
            content.push(SEPARATOR);
        }

        content.push(...stagePartNodes(part, index === parts.length - 1));
    });

    return content;
});

const arbitraryStageDirection: fc.Arbitrary<Draft> = draft('stageDirection', arbitraryStageDirectionContent);

const arbitrarySpeechLine: fc.Arbitrary<Draft[]> = fc
    .array(
        fc.oneof(
            {arbitrary: draft('dialogue', arbitraryRichText()), weight: 5},
            {arbitrary: draft('dialogue', arbitraryRichText(arbitraryUpperText)), weight: 1},
            {arbitrary: fc.constant<Draft>({type: 'dialogue', content: [{type: 'text', text: '~'}]}), weight: 1},
            {arbitrary: arbitraryLyrics, weight: 1},
            {arbitrary: draft('aside', arbitraryRichText()), weight: 1},
            {arbitrary: arbitraryStageDirection, weight: 2},
            {arbitrary: fc.constant<Draft>({type: 'dialogue', content: []}), weight: 1},
        ),
        {minLength: 0, maxLength: 5},
    );

const arbitrarySpeech = fc
    .tuple(arbitraryCharacter, arbitrarySpeechLine)
    .map(([cue, lines]) => [cue, ...lines]);

const arbitraryStandalone = fc.oneof(
    {arbitrary: arbitraryStageDirection.map(block => [block]), weight: 2},
    {arbitrary: draft('note', arbitraryRichText()).map(block => [block]), weight: 1},
);

const arbitraryHeadingText: fc.Arbitrary<ScriptNode[]> = fc.oneof(
    {arbitrary: arbitraryRichText(arbitraryPlainText), weight: 9},
    {arbitrary: fc.constant<ScriptNode[]>([]), weight: 1},
);

const arbitraryBody: fc.Arbitrary<Draft[]> = fc
    .array(
        fc.oneof(
            {arbitrary: arbitrarySpeech, weight: 3},
            {arbitrary: arbitraryStandalone, weight: 2},
        ),
        {minLength: 0, maxLength: 5},
    )
    .map(blocks => blocks.flat());

const arbitraryScene = fc
    .tuple(draft('scene', arbitraryHeadingText), arbitraryBody)
    .map(([heading, blocks]) => [heading, ...blocks]);

const arbitraryAct = fc
    .tuple(
        draft('act', arbitraryRichText(arbitraryPlainText)),
        fc.oneof({arbitrary: fc.constant<Draft[]>([]), weight: 2}, {arbitrary: arbitraryBody, weight: 1}),
        fc.array(arbitraryScene, {minLength: 0, maxLength: 3}),
    )
    .map(([
        heading,
        blocks,
        scenes,
    ]) => [
        heading,
        ...blocks,
        ...scenes.flat(),
    ]);

const arbitraryDraftBlocks: fc.Arbitrary<Draft[]> = fc.oneof(
    fc.array(arbitraryAct, {minLength: 1, maxLength: 3}).map(acts => acts.flat()),
    fc.array(arbitraryScene, {minLength: 1, maxLength: 4}).map(scenes => scenes.flat()),
);

export const arbitraryScriptDocument: fc.Arbitrary<ScriptDocument> = arbitraryDraftBlocks.map(drafts => {
    let musicCount = 0;

    return {
        type: 'doc',
        content: drafts.map((block, index) => ({
            type: block.type,
            attrs: {...block.attrs, id: `block-${index + 1}`},
            content: block.content.map(node => {
                if (node.type !== 'musicStart') {
                    return node;
                }

                musicCount += 1;

                return {...node, attrs: {...node.attrs, musicId: `music-${musicCount}`}};
            }),
        })),
    };
});

/* Non-empty, trimmed script title (an empty title is omitted from the file). */
export const arbitraryScriptTitle: fc.Arbitrary<string> = fc
    .string({
        unit: 'grapheme-ascii',
        minLength: 1,
        maxLength: 40,
    })
    .map(value => value.trim())
    .filter(value => value.length > 0);
