import {
    createNodeId,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_SCENE_HEADING,
    type FountainElementType,
    resolveScriptBlockNodeType,
    type ScriptDocument,
    type ScriptDocumentNodeMode,
} from '@stagistic/script-core';

type HotPathFixtureSize = 300 | 1000;

export interface CreateHotPathFixtureArgs {
    blockCount: number,
    nodeMode?: ScriptDocumentNodeMode,
}

const CHARACTER_NAMES = [
    'ANNA',
    'BOB',
    'CARLA',
    'DANIEL',
    'EMMA',
    'FILIP',
] as const;

const resolveBlockNodeType = (
    blockType: FountainElementType,
    nodeMode: ScriptDocumentNodeMode,
) => {
    if (nodeMode === 'legacy') {
        return 'fountainBlock';
    }

    return resolveScriptBlockNodeType(blockType) ?? 'fountainBlock';
};

const createTextBlock = (
    blockType: FountainElementType,
    text: string,
    nodeMode: ScriptDocumentNodeMode,
) => {
    return {
        type: resolveBlockNodeType(blockType, nodeMode),
        attrs: {
            id: createNodeId(),
            blockType,
        },
        content: text.length > 0
            ? [
                {
                    type: 'text',
                    text,
                },
            ]
            : [],
    };
};

const createFixtureBlock = (
    index: number,
    nodeMode: ScriptDocumentNodeMode,
) => {
    const patternIndex = index % 4;
    const sceneNumber = Math.floor(index / 4) + 1;
    const characterName = CHARACTER_NAMES[index % CHARACTER_NAMES.length];

    if (patternIndex === 0) {
        return createTextBlock(
            ELEMENT_SCENE_HEADING,
            `INT. LOCATION ${sceneNumber} - DAY`,
            nodeMode,
        );
    }

    if (patternIndex === 1) {
        return createTextBlock(
            ELEMENT_ACTION,
            `Action beat ${index + 1}. This line exists to stress Enter, merge, and delete flows.`,
            nodeMode,
        );
    }

    if (patternIndex === 2) {
        return createTextBlock(
            ELEMENT_CHARACTER,
            characterName,
            nodeMode,
        );
    }

    return createTextBlock(
        ELEMENT_DIALOGUE,
        `Dialogue line ${index + 1}. ${characterName} keeps speaking so character scans have stable data.`,
        nodeMode,
    );
};

export const HOT_PATH_FIXTURE_SIZES: readonly HotPathFixtureSize[] = [300, 1000] as const;

export const createHotPathFixture = ({
    blockCount,
    nodeMode = 'default',
}: CreateHotPathFixtureArgs): ScriptDocument => {
    return {
        type: 'doc',
        content: Array.from({length: blockCount}, (_, index) => {
            return createFixtureBlock(index, nodeMode);
        }),
    };
};
