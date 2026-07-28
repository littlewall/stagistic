import {
    getScriptBlockId,
} from '@stagistic/script';

import type {BasicExportConfig} from './config';
import {filterScriptByCharacter} from './filterByCharacter';
import type {
    CharactersAndPlacesInitialPagePlan,
    ExportPlan,
    ForcedBreak,
} from './plan';
import {groupScenes} from './scenes';
import type {ScriptData} from './scriptData';

const compareCharactersByName = (
    left: ScriptData['initialCharacters'][number],
    right: ScriptData['initialCharacters'][number],
) => left.displayName.localeCompare(right.displayName);

const compareCharactersByAppearance = (
    left: ScriptData['initialCharacters'][number],
    right: ScriptData['initialCharacters'][number],
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

    if (!value.enabled) {
        return null;
    }

    const compareCharacters = value.characterOrder === 'first-appearance'
        ? compareCharactersByAppearance
        : compareCharactersByName;

    return {
        kind: 'characters-and-places',
        characters: [...script.initialCharacters]
            .sort(compareCharacters)
            .map(character => ({
                id: character.id,
                displayName: character.displayName,
                outline: character.outline,
            })),
        places: value.showPlaces
            ? script.initialPlaces.map(place => ({
                id: place.id,
                name: place.name,
            }))
            : [],
        showCharacterOutlines: value.showCharacterOutlines,
    };
};

export const deriveBasicExportPlan = (
    config: BasicExportConfig,
    script: ScriptData,
): ExportPlan => {
    const filteredDoc = filterScriptByCharacter(script.doc, config.characterFilter, script.characters);
    const preservePagination = config.characterFilter.mode === 'only'
        && config.characterFilter.preserveFullScriptPagination !== false;
    const doc = preservePagination ? script.doc : filteredDoc;
    const forcedBreaks: ForcedBreak[] = [];
    const charactersAndPlaces = buildCharactersAndPlacesPlan(config, script);
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
            initialPages: charactersAndPlaces ? [charactersAndPlaces] : [],
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
