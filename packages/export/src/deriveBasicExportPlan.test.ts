import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    BASIC_DEFAULTS,
    type BasicExportConfig,
} from './config';
import {deriveBasicExportPlan} from './deriveBasicExportPlan';
import {
    block,
    sampleDoc,
} from './testUtils';

const script = {
    doc: sampleDoc(),
    characters: [],
    groups: [],
    initialCharacters: [
        {
            id: 'char-b',
            displayName: 'Bob',
            outline: 'Baritone',
            firstAppearanceOrder: 1,
        },
        {
            id: 'char-a',
            displayName: 'Anna',
            outline: 'Lead',
            firstAppearanceOrder: 8,
        },
        {
            id: 'char-z',
            displayName: 'Zora',
            outline: null,
            firstAppearanceOrder: null,
        },
    ],
    initialPlaces: [
        {
            id: 'place-stage',
            name: 'Stage',
            firstAppearanceOrder: 2,
        }, {
            id: 'place-home',
            name: 'Home',
            firstAppearanceOrder: 10,
        },
    ],
    initialVocalRanges: [],
    scriptTitle: 'Test',
    titlePage: null,
};

const withConfig = (patch: Partial<BasicExportConfig>): BasicExportConfig => ({
    showNotes: patch.showNotes ?? BASIC_DEFAULTS.showNotes,
    characterFilter: patch.characterFilter ?? BASIC_DEFAULTS.characterFilter,
    pageBreaks: patch.pageBreaks ?? BASIC_DEFAULTS.pageBreaks,
    initialPages: patch.initialPages ?? BASIC_DEFAULTS.initialPages,
    blankPages: patch.blankPages ?? BASIC_DEFAULTS.blankPages,
});

describe('deriveBasicExportPlan', () => {
    it('keeps notes in the printable document by default', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            doc: {
                type: 'doc',
                content: [block('scene', 'sceneA', 'Scene A'), block('note', 'noteA', 'Rewrite this')],
            },
        });

        expect(plan.doc.content.map(node => node.type)).toEqual(['scene', 'note']);
    });

    it('removes notes before deriving the printable document and pagination', () => {
        const plan = deriveBasicExportPlan(withConfig({showNotes: false}), {
            ...script,
            doc: {
                type: 'doc',
                content: [
                    block('scene', 'sceneA', 'Scene A'),
                    block('note', 'noteA', 'Rewrite this'),
                    block('scene', 'sceneB', 'Scene B'),
                ],
            },
        });

        expect(plan.doc.content.map(node => node.type)).toEqual(['scene', 'scene']);
        expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'sceneB', kind: 'new-page'}]);
    });

    it('adds page breaks to later scenes by default', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, script);

        expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'sceneB', kind: 'new-page'}]);
    });

    it('uses odd-page breaks for later scenes when requested', () => {
        const plan = deriveBasicExportPlan(withConfig({
            pageBreaks: {
                sceneOnNewPage: true,
                sceneOnOddPage: true,
            },
        }), script);

        expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'sceneB', kind: 'odd-page'}]);
    });

    it('starts later acts on new pages automatically', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            doc: {
                type: 'doc',
                content: [
                    block('act', 'actA', 'Act One'),
                    block('scene', 'sceneA', 'Scene A'),
                    block('act', 'actB', 'Act Two'),
                    block('scene', 'sceneB', 'Scene B'),
                ],
            },
        });

        expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'actB', kind: 'new-page'}]);
    });

    it('keeps the first scene of an actless script on the opening script page', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            doc: {
                type: 'doc',
                content: [block('scene', 'sceneA', 'Scene A'), block('scene', 'sceneB', 'Scene B')],
            },
        });

        expect(plan.pagination.forcedBreaks).toEqual([{blockId: 'sceneB', kind: 'new-page'}]);
    });

    it('carries the title page and script title through', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            scriptTitle: 'My Play',
            titlePage: {subtitle: 'A Comedy'},
        });

        expect(plan.scriptTitle).toBe('My Play');
        expect(plan.titlePage).toEqual({subtitle: 'A Comedy'});
    });

    it('derives the default characters and places page in name order', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, script);

        expect(plan.leadingPages.initialPages[0]).toEqual({
            kind: 'characters-and-places',
            characters: [
                {
                    id: 'char-a',
                    displayName: 'Anna',
                    outline: 'Lead',
                },
                {
                    id: 'char-b',
                    displayName: 'Bob',
                    outline: 'Baritone',
                },
                {
                    id: 'char-z',
                    displayName: 'Zora',
                    outline: null,
                },
            ],
            places: [{id: 'place-stage', name: 'Stage'}, {id: 'place-home', name: 'Home'}],
            showCharacterOutlines: false,
        });
        expect(plan.leadingPages.manualBlankCount).toBe(0);
        expect(plan.leadingPages.showRomanPageNumbers).toBe(true);
        expect(plan.leadingPages.startEachInitialPageOnOddPage).toBe(false);
    });

    it('orders characters by first appearance and hides places when requested', () => {
        const plan = deriveBasicExportPlan(withConfig({
            initialPages: {
                ...BASIC_DEFAULTS.initialPages,
                startEachInitialPageOnOddPage: false,
                showPageNumbers: false,
                charactersAndPlaces: {
                    enabled: true,
                    showPlaces: false,
                    showCharacterOutlines: true,
                    characterOrder: 'first-appearance',
                },
            },
        }), script);

        expect(plan.leadingPages.initialPages[0]).toEqual({
            kind: 'characters-and-places',
            characters: [
                {
                    id: 'char-b',
                    displayName: 'Bob',
                    outline: 'Baritone',
                },
                {
                    id: 'char-a',
                    displayName: 'Anna',
                    outline: 'Lead',
                },
                {
                    id: 'char-z',
                    displayName: 'Zora',
                    outline: null,
                },
            ],
            places: [],
            showCharacterOutlines: true,
        });
        expect(plan.leadingPages.showRomanPageNumbers).toBe(false);
        expect(plan.leadingPages.startEachInitialPageOnOddPage).toBe(false);
    });

    it('keeps a places-only initial page when characters are disabled', () => {
        const plan = deriveBasicExportPlan(withConfig({
            initialPages: {
                ...BASIC_DEFAULTS.initialPages,
                charactersAndPlaces: {
                    ...BASIC_DEFAULTS.initialPages.charactersAndPlaces,
                    enabled: false,
                    showPlaces: true,
                },
            },
        }), script);

        expect(plan.leadingPages.initialPages[0]).toEqual({
            kind: 'characters-and-places',
            characters: [],
            places: [{id: 'place-stage', name: 'Stage'}, {id: 'place-home', name: 'Home'}],
            showCharacters: false,
            showCharacterOutlines: false,
        });
    });

    it('omits the initial page when disabled and clamps enabled manual blanks', () => {
        const plan = deriveBasicExportPlan(withConfig({
            initialPages: {
                ...BASIC_DEFAULTS.initialPages,
                charactersAndPlaces: {
                    ...BASIC_DEFAULTS.initialPages.charactersAndPlaces,
                    enabled: false,
                    showPlaces: false,
                },
                contents: {
                    ...BASIC_DEFAULTS.initialPages.contents,
                    enabled: false,
                },
            },
            blankPages: {
                betweenInitialPagesAndScript: {
                    enabled: true,
                    count: 20,
                },
            },
        }), script);

        expect(plan.leadingPages.initialPages).toEqual([]);
        expect(plan.leadingPages.manualBlankCount).toBe(10);
    });

    it('appends a contents page after characters and places', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            doc: {
                type: 'doc',
                content: [block('act', 'a1', 'ACT ONE'), block('scene', 's1', 'The Diner')],
            },
        });

        expect(plan.leadingPages.initialPages.map(page => page.kind))
            .toEqual(['characters-and-places', 'contents']);
        expect(plan.leadingPages.initialPages[1]).toMatchObject({
            kind: 'contents',
            variant: 'scenes-and-musical-numbers',
            showScoreColumn: false,
        });
    });

    it('derives contents from the character-filtered document', () => {
        const plan = deriveBasicExportPlan({
            ...BASIC_DEFAULTS,
            characterFilter: {
                mode: 'only',
                characterIds: ['c-alice'],
                preserveFullScriptPagination: true,
            },
        }, {
            ...script,
            characters: [
                {
                    id: 'c-alice', key: 'ALICE', displayName: 'Alice',
                },
            ],
            doc: {
                type: 'doc',
                content: [
                    block('scene', 's1', 'Alice Scene'),
                    block('stageDirection', 'sd1', '@ALICE waits.'),
                    block('scene', 's2', 'Bob Scene'),
                    block('stageDirection', 'sd2', '@BOB waits.'),
                ],
            },
        });
        const contents = plan.leadingPages.initialPages
            .find(page => page.kind === 'contents');

        expect(contents?.kind).toBe('contents');
        expect(contents?.kind === 'contents'
            ? contents.acts[0].scenes.map(scene => scene.title)
            : []).toEqual(['Alice Scene']);
    });

    it('appends a vocal ranges page in name order when ranges are present', () => {
        const plan = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            initialVocalRanges: [
                {
                    id: 'char-b', displayName: 'Bob', voiceType: 'baritone', low: 'C3', high: 'A4', firstAppearanceOrder: 1,
                }, {
                    id: 'char-a', displayName: 'Anna', voiceType: null, low: 'A3', high: 'C6', firstAppearanceOrder: 8,
                },
            ],
        });

        expect(plan.leadingPages.initialPages.map(page => page.kind))
            .toEqual([
                'characters-and-places',
                'contents',
                'vocal-ranges',
            ]);
        expect(plan.leadingPages.initialPages[2]).toEqual({
            kind: 'vocal-ranges',
            entries: [
                {
                    id: 'char-a', displayName: 'Anna', voiceType: null, low: 'A3', high: 'C6',
                }, {
                    id: 'char-b', displayName: 'Bob', voiceType: 'baritone', low: 'C3', high: 'A4',
                },
            ],
        });
    });

    it('orders the vocal ranges page by first appearance when configured', () => {
        const plan = deriveBasicExportPlan(withConfig({
            initialPages: {
                ...BASIC_DEFAULTS.initialPages,
                charactersAndPlaces: {
                    ...BASIC_DEFAULTS.initialPages.charactersAndPlaces,
                    characterOrder: 'first-appearance',
                },
            },
        }), {
            ...script,
            initialVocalRanges: [
                {
                    id: 'char-b', displayName: 'Bob', voiceType: 'baritone', low: 'C3', high: 'A4', firstAppearanceOrder: 1,
                }, {
                    id: 'char-a', displayName: 'Anna', voiceType: null, low: 'A3', high: 'C6', firstAppearanceOrder: 8,
                },
            ],
        });
        const vocalRanges = plan.leadingPages.initialPages.find(page => page.kind === 'vocal-ranges');

        expect(vocalRanges?.kind === 'vocal-ranges' ? vocalRanges.entries.map(entry => entry.id) : [])
            .toEqual(['char-b', 'char-a']);
    });

    it('omits the vocal ranges page when disabled or when no character has a complete range', () => {
        const disabled = deriveBasicExportPlan(withConfig({
            initialPages: {
                ...BASIC_DEFAULTS.initialPages,
                vocalRanges: {enabled: false},
            },
        }), {
            ...script,
            initialVocalRanges: [
                {
                    id: 'char-a', displayName: 'Anna', voiceType: null, low: 'A3', high: 'C6', firstAppearanceOrder: 8,
                },
            ],
        });

        expect(disabled.leadingPages.initialPages.map(page => page.kind))
            .not.toContain('vocal-ranges');

        const empty = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...script,
            initialVocalRanges: [],
        });

        expect(empty.leadingPages.initialPages.map(page => page.kind))
            .not.toContain('vocal-ranges');
    });
});
