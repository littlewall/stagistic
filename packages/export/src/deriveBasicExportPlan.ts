import {
    getScriptBlockId,
    getScriptBlockNodeType,
} from '@stagistic/script';

import type {BasicExportConfig} from './config';
import {filterScriptByCharacter} from './filterByCharacter';
import {deriveContentsPlan} from './initialPages/contents/deriveContentsPlan';
import type {
    CharactersAndPlacesInitialPagePlan,
    ExportPlan,
    ForcedBreak,
    VocalRangesInitialPagePlan,
} from './plan';
import {groupScenes} from './scenes';
import type {ScriptData} from './scriptData';

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
                .sort(compareCharacters)
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
            .sort(compareCharacters)
            .map(entry => ({
                id: entry.id,
                displayName: entry.displayName,
                voiceType: entry.voiceType,
                low: entry.low,
                high: entry.high,
            })),
    };
};

export const deriveBasicExportPlan = (
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
    );
    const vocalRanges = buildVocalRangesPlan(config, script);
    const blankSpec = config.blankPages.betweenInitialPagesAndScript;
    let hasPreviousGroup = false;
    let currentActHasScene = false;

    groupScenes(doc).forEach(group => {
        const heading = group.blocks[0];
        const blockId = heading ? getScriptBlockId(heading) : null;

        if (!blockId) {
            return;
        }

        if (group.sceneBlockId === null && group.actBlockId !== null) {
            currentActHasScene = false;

            if (hasPreviousGroup) {
                forcedBreaks.push({blockId, kind: 'new-page'});
            }

            hasPreviousGroup = true;

            return;
        }

        const isFirstSceneInAct = group.sceneBlockId !== null
            && !currentActHasScene;

        if (group.sceneBlockId !== null) {
            currentActHasScene = true;
        }

        if (group.sceneBlockId !== null
            && !isFirstSceneInAct
            && (config.pageBreaks.sceneOnNewPage || config.pageBreaks.sceneOnOddPage)) {
            forcedBreaks.push({
                blockId,
                kind: config.pageBreaks.sceneOnOddPage ? 'odd-page' : 'new-page',
            });

            hasPreviousGroup = true;

            return;
        }

        hasPreviousGroup = true;
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
        },
        postSteps: [],
        visibleBlockIds: preservePagination
            ? filteredDoc.content.map(node => getScriptBlockId(node)).filter((id): id is string => id !== null)
            : undefined,
    };
};
