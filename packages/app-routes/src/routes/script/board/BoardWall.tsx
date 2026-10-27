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
import {useBoardPreferences} from './boardPreferences';
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
export const BoardWall = () => {
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
        showMentioned: preferences.showMentioned,
    }), [
        confirmedCharacterRecords,
        model,
        preferences.showMentioned,
        selectedIds,
        source.displayColorByKey,
        source.getStartPage,
    ]);

    const characterOptions = useMemo(
        () => confirmedCharacterRecords
            .map(character => ({id: character.id, label: character.key}))
            .toSorted((left, right) => left.label.localeCompare(right.label)),
        [confirmedCharacterRecords],
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
                    characterOptions={characterOptions}
                    selectedCharacterIds={selectedIds}
                    onSelectedCharacterIdsChange={characterIds => setPreferences({...preferences, characterIds})}
                    density={preferences.density}
                    onDensityChange={density => setPreferences({...preferences, density})}
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
                            {preferences.density === 'characters' ? <CharacterChipStack characters={scene.chips} /> : null}
                        </SceneCard>
                    ))}
                </BoardActSection>
            ))}
        </BoardLayout>
    );
};
