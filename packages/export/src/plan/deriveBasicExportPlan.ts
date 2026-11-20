import {
    getScriptBlockId,
    getScriptBlockNodeType,
} from '@stagistic/script';

import {deriveContentsPlan} from '../initialPages/contents/deriveContentsPlan';
import type {BasicExportConfig} from '../model/config';
import type {
    CharactersAndPlacesInitialPagePlan,
    ExportPlan,
    ForcedBreak,
    VocalRangesInitialPagePlan,
} from '../model/plan';
import type {ScriptData} from '../model/scriptData';
import {filterScriptByCharacter} from './filterByCharacter';
import {groupScenes} from './scenes';

interface OrderableInitialEntry {
    displayName: string,
    firstAppearanceOrder: number | null,
}

const compareCharactersByName = (
    left: OrderableInitialEntry,
    right: OrderableInitialEntry,
) => left.displayName.localeCompare(right.displayName);

const compareCharactersByAppearance = (
    left: OrderableInitialEntry,
    right: OrderableInitialEntry,
) => {
    if (left.firstAppearanceOrder === null && right.firstAppearanceOrder === null) {
        return compareCharactersByName(left, right);
    }

    if (left.firstAppearanceOrder === null) {
        return 1;
    }

    if (right.firstAppearanceOrder === null) {
        return -1;
    }

    return left.firstAppearanceOrder - right.firstAppearanceOrder
        || compareCharactersByName(left, right);
};

const buildCharactersAndPlacesPlan = (
    config: BasicExportConfig,
    script: ScriptData,
): CharactersAndPlacesInitialPagePlan | null => {
    const value = config.initialPages.charactersAndPlaces;

    if (!value.enabled && !value.showPlaces) {
        return null;
    }

    const compareCharacters = value.characterOrder === 'first-appearance'
        ? compareCharactersByAppearance
        : compareCharactersByName;

    return {
        kind: 'characters-and-places',
        ...value.enabled ? {} : {showCharacters: false},
        characters: value.enabled
            ? [...script.initialCharacters]
                .toSorted(compareCharacters)
                .map(character => ({
                    id: character.id,
                    displayName: character.displayName,
                    outline: character.outline,
                }))
            : [],
        places: value.showPlaces
            ? script.initialPlaces.map(place => ({
                id: place.id,
                name: place.name,
            }))
            : [],
        showCharacterOutlines: value.showCharacterOutlines,
    };
};

const buildVocalRangesPlan = (
    config: BasicExportConfig,
    script: ScriptData,
): VocalRangesInitialPagePlan | null => {
    if (!config.initialPages.vocalRanges.enabled || script.initialVocalRanges.length === 0) {
        return null;
    }

    const compareCharacters = config.initialPages.charactersAndPlaces.characterOrder === 'first-appearance'
        ? compareCharactersByAppearance
        : compareCharactersByName;

    return {
        kind: 'vocal-ranges',
        entries: [...script.initialVocalRanges]
            .toSorted(compareCharacters)
            .map(entry => ({
                id: entry.id,
                displayName: entry.displayName,
                voiceType: entry.voiceType,
                low: entry.low,
                high: entry.high,
            })),
    };
};

export const deriveScriptExportPlan = (
    config: BasicExportConfig,
    script: ScriptData,
): ExportPlan => {
    const inputDoc = config.showNotes
        ? script.doc
        : {
            ...script.doc,
            content: script.doc.content.filter(node => getScriptBlockNodeType(node) !== 'note'),
        };
    const filteredDoc = filterScriptByCharacter(
        inputDoc,
        config.characterFilter,
        script.characters,
        script.groups,
    );
    const preservePagination = config.characterFilter.mode === 'only'
        && config.characterFilter.preserveFullScriptPagination !== false;
    const doc = preservePagination ? inputDoc : filteredDoc;
    const forcedBreaks: ForcedBreak[] = [];
    const charactersAndPlaces = buildCharactersAndPlacesPlan(config, script);
    const contents = deriveContentsPlan(
        config.initialPages.contents,
        filteredDoc,
        script.characters,
        script.groups,
        doc,
    );
    const vocalRanges = buildVocalRangesPlan(config, script);
    const blankSpec = config.blankPages.betweenInitialPagesAndScript;
    let currentActHeading: string | null = null;
    let currentActHasScene = false;
    const firstBlockId = getScriptBlockId(doc.content[0] ?? {});
    const addBreak = (blockId: string, kind: ForcedBreak['kind']) => {
        if (blockId === firstBlockId) return;

        const previous = forcedBreaks.find(item => item.blockId === blockId);

        if (previous) {
            if (kind === 'odd-page') previous.kind = kind;

            return;
        }

        forcedBreaks.push({blockId, kind});
    };

    groupScenes(doc).forEach(group => {
        const blockId = getScriptBlockId(group.blocks[0] ?? {});

        if (!blockId) return;

        if (group.sceneBlockId === null && group.actBlockId !== null) {
            currentActHeading = blockId;
            currentActHasScene = false;

            if (config.pageBreaks.actOnNewPage !== false) addBreak(blockId, 'new-page');

            return;
        }

        if (group.sceneBlockId === null) return;

        const target = !currentActHasScene && currentActHeading ? currentActHeading : blockId;

        currentActHasScene = true;

        if (config.pageBreaks.sceneOnNewPage || config.pageBreaks.sceneOnOddPage) {
            addBreak(target, config.pageBreaks.sceneOnOddPage ? 'odd-page' : 'new-page');
        }
    });

    return {
        doc,
        titlePage: script.titlePage,
        scriptTitle: script.scriptTitle,
        leadingPages: {
            initialPages: [
                ...charactersAndPlaces ? [charactersAndPlaces] : [],
                ...contents ? [contents] : [],
                ...vocalRanges ? [vocalRanges] : [],
            ],
            manualBlankCount: blankSpec.enabled
                ? Math.max(1, Math.min(10, Math.floor(blankSpec.count)))
                : 0,
            showRomanPageNumbers: config.initialPages.showPageNumbers,
            startEachInitialPageOnOddPage: config.initialPages.startEachInitialPageOnOddPage,
        },
        pagination: {
            forcedBreaks,
            repeatCharacterOnBreak: config.pageBreaks.repeatCharacterOnBreak,
            continuationMark: config.pageBreaks.continuationMark,
        },
        postSteps: [],
        visibleBlockIds: preservePagination
            ? filteredDoc.content.map(node => getScriptBlockId(node)).filter((id): id is string => id !== null)
            : undefined,
    };
};

/** Basic exports always list scenes, even when passed an older music-contents selection. */
export const deriveBasicExportPlan = (config: BasicExportConfig, script: ScriptData): ExportPlan => deriveScriptExportPlan({
    ...config,
    initialPages: {...config.initialPages, contents: {...config.initialPages.contents, variant: 'scenes'}},
}, script);
