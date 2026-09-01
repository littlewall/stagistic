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

        expect(plan.leadingPages).toEqual({
            initialPages: [
                {
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
                },
            ],
            manualBlankCount: 0,
            showRomanPageNumbers: true,
            startEachInitialPageOnOddPage: true,
        });
    });

    it('orders characters by first appearance and hides places when requested', () => {
        const plan = deriveBasicExportPlan(withConfig({
            initialPages: {
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
});
