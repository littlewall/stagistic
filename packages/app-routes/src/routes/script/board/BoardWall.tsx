import {buildSceneBoardModel} from '@stagistic/script';
import {
    BoardActSection,
    BoardEmpty,
    BoardLayout,
    BoardToolbar,
    Button,
    CharacterChipStack,
    SceneCard,
    type SceneCardActions,
} from '@stagistic/ui';
import {useMemo} from 'react';

import {useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {useScriptCharacters} from '../workspace/ScriptCharactersContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';
import {BOARD_LENSES} from './boardLenses';
import {useBoardPreferences} from './boardPreferences';
import {buildFilterCharacters} from './buildFilterCharacters';
import {buildWallView, type WallScene} from './buildWallView';
import {useOpenInEditor} from './useOpenInEditor';
import {useSceneBoardSource} from './useSceneBoardSource';

const SCENE_ACTION_IDS = {
    open: 'open-in-editor',
    delete: 'delete-scene',
} as const;

/* Deleting happens in the Editor, where the whole scene is visible; the Board only takes you there. */
const buildSceneActions = (
    scene: WallScene,
    isReadOnly: boolean,
    openInEditor: (blockId: string) => void,
): SceneCardActions => ({
    label: `Scene ${scene.number} actions`,
    items: [
        {id: SCENE_ACTION_IDS.open, label: 'Open in Editor'},
        ...isReadOnly ? [] : [
            {
                id: SCENE_ACTION_IDS.delete,
                label: 'Delete scene…',
                tone: 'danger' as const,
                dividerBefore: true,
            },
        ],
    ],
    onAction: () => openInEditor(scene.headingBlockId),
});

/** The Wall lens: acts as sections, scenes as cards with their derived cast. Read-only for now. */
interface BoardWallProps {
    activeLensId: string,
    onSelectLens: (lensId: string) => void,
}

export const BoardWall = ({activeLensId, onSelectLens}: BoardWallProps) => {
    const {currentScriptId} = useScriptWorkspace();
    const {isReadOnly} = useScriptReadOnlyState();
    const {
        confirmedCharacterRecords,
        confirmedGroupRecords,
    } = useScriptCharacters();
    const openInEditor = useOpenInEditor();
    const source = useSceneBoardSource();
    const [preferences, setPreferences] = useBoardPreferences(currentScriptId ?? 'new-script');

    const model = useMemo(() => buildSceneBoardModel(source.index, {
        characters: confirmedCharacterRecords,
        groups: confirmedGroupRecords,
    }), [
        confirmedCharacterRecords,
        confirmedGroupRecords,
        source.index,
    ]);

    // A character deleted since the filter was saved drops out silently.
    const selectedIds = useMemo(() => {
        const knownIds = new Set(confirmedCharacterRecords.map(character => character.id));

        return preferences.characterIds.filter(id => knownIds.has(id));
    }, [confirmedCharacterRecords, preferences.characterIds]);

    const acts = useMemo(() => buildWallView({
        model,
        characters: confirmedCharacterRecords,
        displayColorByKey: source.displayColorByKey,
        getStartPage: source.getStartPage,
        selectedIds: new Set(selectedIds),
        showOnStage: preferences.showOnStage,
        showMentioned: preferences.showMentioned,
    }), [
        confirmedCharacterRecords,
        model,
        preferences.showMentioned,
        preferences.showOnStage,
        selectedIds,
        source.displayColorByKey,
        source.getStartPage,
    ]);

    const filterCharacters = useMemo(
        () => buildFilterCharacters(model, confirmedCharacterRecords, source.displayColorByKey),
        [
            confirmedCharacterRecords,
            model,
            source.displayColorByKey,
        ],
    );

    if (!model.acts.some(act => act.scenes.length > 0)) {
        return (
            <BoardLayout>
                <BoardEmpty action={<Button variant="secondary" onPress={() => openInEditor()}>Open Editor</Button>}>
                    No scenes yet.
                </BoardEmpty>
            </BoardLayout>
        );
    }

    return (
        <BoardLayout
            toolbar={(
                <BoardToolbar
                    lenses={BOARD_LENSES}
                    activeLensId={activeLensId}
                    onSelectLens={onSelectLens}
                    filterCharacters={filterCharacters}
                    selectedCharacterIds={selectedIds}
                    onSelectedCharacterIdsChange={characterIds => setPreferences({...preferences, characterIds})}
                    showOnStage={preferences.showOnStage}
                    onShowOnStageChange={showOnStage => setPreferences({...preferences, showOnStage})}
                    showMentioned={preferences.showMentioned}
                    onShowMentionedChange={showMentioned => setPreferences({...preferences, showMentioned})}
                />
            )}
        >
            {acts.map(act => (
                <BoardActSection key={act.key} title={act.name}>
                    {act.scenes.map(scene => (
                        <SceneCard
                            key={scene.headingBlockId}
                            number={scene.number}
                            title={scene.title}
                            page={scene.page}
                            variant={scene.isCollapsed ? 'collapsed' : 'full'}
                            actions={buildSceneActions(scene, isReadOnly, openInEditor)}
                        >
                            <CharacterChipStack characters={scene.chips} />
                        </SceneCard>
                    ))}
                </BoardActSection>
            ))}
        </BoardLayout>
    );
};
