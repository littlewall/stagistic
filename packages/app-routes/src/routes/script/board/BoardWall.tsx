import {DragDropProvider} from '@dnd-kit/react';
import {buildSceneBoardModel} from '@stagistic/script';
import {
    BoardActSection,
    BoardAddActButton,
    BoardEmpty,
    BoardInlineHeading,
    BoardInsertSceneStrip,
    BoardLayout,
    BoardSceneComposer,
    BoardToolbar,
    Button,
    MoreActionsMenu,
} from '@stagistic/ui';
import {
    type CSSProperties,
    Fragment,
    useMemo,
    useRef,
    useState,
} from 'react';

import {configuredKeyboardSensor, configuredPointerSensor} from '../editor/structure/structureDndConfig';
import {useScriptSettingsModal} from '../settings/ScriptSettingsModalContext';
import {useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {useScriptCharacters} from '../workspace/ScriptCharactersContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';
import {resolveBoardInsertionTarget} from './boardInsertionTargets';
import {BOARD_LENSES} from './boardLenses';
import {useBoardPreferences} from './boardPreferences';
import {buildSceneActions} from './boardSceneActions';
import {BoardSceneBody} from './BoardSceneBody';
import {getSceneTextTransform} from './boardSceneCasing';
import {BoardSceneEndTarget, BoardSceneItem} from './BoardSceneItem';
import {buildFilterCharacters} from './buildFilterCharacters';
import {
    buildWallView,
    DEFAULT_ACT_KEY,
} from './buildWallView';
import {useBoardDeleteAct} from './useBoardDeleteAct';
import {useBoardHistoryShortcuts} from './useBoardHistoryShortcuts';
import {useBoardSceneDnd} from './useBoardSceneDnd';
import {useOpenInEditor} from './useOpenInEditor';
import {useSceneBoardSource} from './useSceneBoardSource';
import {useWallMetadata} from './useWallMetadata';

/** The Wall lens: acts as sections, scenes as cards with their derived cast. */
interface BoardWallProps {
    activeLensId: string,
    onSelectLens: (lensId: string) => void,
}

export const BoardWall = ({activeLensId, onSelectLens}: BoardWallProps) => {
    const {currentScriptId, documentSession} = useScriptWorkspace();
    const {isReadOnly} = useScriptReadOnlyState();
    const {effectiveScriptSettingsDraft} = useScriptSettingsModal();
    const {
        confirmedCharacterRecords,
        confirmedGroupRecords,
    } = useScriptCharacters();
    const openInEditor = useOpenInEditor();
    const source = useSceneBoardSource();
    const {
        records,
        synopsisByScene,
        castOptions,
        metadata,
    } = useWallMetadata(source.displayColorByKey);
    const [forcedSceneId, setForcedSceneId] = useState<string | null>(null);
    const [editingActId, setEditingActId] = useState<string | null>(null);
    // A label, not an element: the control that opened the form may re-render while it is open.
    const composerReturnLabel = useRef<string | null>(null);
    const [composer, setComposer] = useState<{actBlockId: string | null, beforeSceneId: string | null} | null>(null);

    useBoardHistoryShortcuts(documentSession, isReadOnly);

    const openComposer = (actBlockId: string | null, beforeSceneId: string | null, label: string) => {
        composerReturnLabel.current = label;
        setComposer({actBlockId, beforeSceneId});
    };
    const cancelComposer = () => {
        setComposer(null);
        requestAnimationFrame(() => {
            [...document.querySelectorAll<HTMLElement>('button')].find(button => button.getAttribute('aria-label') === composerReturnLabel.current)?.focus();
        });
    };
    const insertAct = (beforeBlockId: string | null) => setEditingActId(documentSession.commands.insertAct(beforeBlockId));
    const [preferences, setPreferences] = useBoardPreferences(currentScriptId ?? 'new-script');

    const model = useMemo(() => buildSceneBoardModel(source.index, {
        characters: confirmedCharacterRecords,
        groups: confirmedGroupRecords,
    }), [
        confirmedCharacterRecords,
        confirmedGroupRecords,
        source.index,
    ]);
    const {requestDeleteAct, modal: deleteActModal} = useBoardDeleteAct(model.acts, documentSession.commands.deleteAct);

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
        records,
        synopsisByScene,
        selectedIds: new Set(selectedIds),
        showOnStage: preferences.showOnStage,
    }), [
        confirmedCharacterRecords,
        model,
        preferences.showOnStage,
        records,
        selectedIds,
        source.displayColorByKey,
        source.getStartPage,
        synopsisByScene,
    ]);

    const {
        acts: draggedActs,
        isDragging,
        onDragStart,
        onDragOver,
        onDragEnd,
    } = useBoardSceneDnd({
        acts,
        index: source.index,
        moveScene: documentSession.commands.moveScene,
    });

    const filterCharacters = useMemo(
        () => buildFilterCharacters(model, confirmedCharacterRecords, source.displayColorByKey, records),
        [
            confirmedCharacterRecords,
            model,
            records,
            source.displayColorByKey,
        ],
    );

    const hasScenes = model.acts.some(act => act.scenes.length > 0);
    const hasActs = model.acts.some(act => act.actBlockId !== null);
    const shownActs = draggedActs.length ? draggedActs : [
        {
            key: DEFAULT_ACT_KEY,
            name: 'ACT 1',
            scenes: [],
        },
    ];

    if (!hasScenes && isReadOnly) {
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
            style={{'--board-scene-casing': getSceneTextTransform(effectiveScriptSettingsDraft)} as CSSProperties}
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
                    showOutline={preferences.showOutline}
                    onShowOutlineChange={showOutline => setPreferences({...preferences, showOutline})}
                />
            )}
        >
            {!hasScenes ? <BoardEmpty>No scenes yet.</BoardEmpty> : null}
            <DragDropProvider
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                sensors={() => [configuredPointerSensor, configuredKeyboardSensor] as never}
            >
                {shownActs.map(act => {
                    const actBlockId = act.key === DEFAULT_ACT_KEY ? null : act.key;
                    const endLabel = `Add scene at end of ${act.name}`;
                    const newComposer = (beforeSceneId: string | null) => {
                        if (composer?.actBlockId !== actBlockId || composer.beforeSceneId !== beforeSceneId) return null;

                        return (
                            <BoardSceneComposer
                                onCancel={cancelComposer}
                                onSubmit={title => {
                                    const target = resolveBoardInsertionTarget(source.index, actBlockId, beforeSceneId);

                                    if (!target) return false;

                                    const id = documentSession.commands.insertScene(target.beforeBlockId, title);

                                    if (!id) return false;

                                    setForcedSceneId(id);
                                    setComposer(null);
                                    requestAnimationFrame(() => {
                                        const card = [...document.querySelectorAll<HTMLElement>('[data-board-card-id]')].find(item => item.dataset.boardCardId === id);

                                        card?.querySelector<HTMLElement>('[aria-label^="Rename scene"]')?.focus();
                                    });

                                    return true;
                                }}
                            />
                        );
                    };

                    return (
                        <BoardActSection
                            key={act.key}
                            title={act.name}
                            // Scenes before the first act have no act heading; adding one names them.
                            heading={!isReadOnly && !actBlockId ? <BoardAddActButton label="Add act at the start" onPress={() => insertAct(source.index.blocks[0]?.blockId ?? null)} /> : undefined}
                            actions={!isReadOnly && actBlockId ? (
                                <MoreActionsMenu
                                    aria-label={`Act ${act.name} actions`}
                                    items={[
                                        {
                                            id: 'delete-act',
                                            label: 'Delete act',
                                            tone: 'danger',
                                        },
                                    ]}
                                    onAction={() => requestDeleteAct(actBlockId, act.name)}
                                />
                            ) : undefined}
                            titleContent={!isReadOnly && actBlockId ? <BoardInlineHeading kind="act" startEditing={editingActId === actBlockId} value={act.name} label={`Rename ${act.name}`} onCommit={title => documentSession.commands.renameAct(actBlockId, title)} /> : undefined}
                        >
                            {act.scenes.map((scene, index) => {
                                const composerBefore = newComposer(scene.headingBlockId);

                                return (
                                    <Fragment key={scene.headingBlockId}>
                                        {composerBefore ? <li>{composerBefore}</li> : null}
                                        <BoardSceneItem
                                            scene={scene.headingBlockId === forcedSceneId ? {...scene, isCollapsed: false} : scene}
                                            onBlur={event => {
                                                if (!event.currentTarget.contains(event.relatedTarget)) setForcedSceneId(null);
                                            }}
                                            index={index}
                                            group={act.key}
                                            isReadOnly={isReadOnly}
                                            titleContent={!isReadOnly ? <BoardInlineHeading kind="scene" value={scene.title} label={`Rename scene ${scene.number}`} onCommit={title => documentSession.commands.renameScene(scene.headingBlockId, title)} /> : undefined}
                                            // While a scene is dragged, only real drop places are marked.
                                            before={!isReadOnly && !isDragging ? (
                                                <BoardInsertSceneStrip
                                                    label={`Add scene before scene ${scene.number}`}
                                                    onPress={() => openComposer(actBlockId, scene.headingBlockId, `Add scene before scene ${scene.number}`)}
                                                />
                                            ) : undefined}
                                            actions={buildSceneActions(scene, openInEditor)}
                                            body={(
                                                <BoardSceneBody
                                                    scene={scene}
                                                    showOutline={preferences.showOutline}
                                                    showCharacters={preferences.showOnStage}
                                                    castOptions={castOptions}
                                                    metadata={metadata}
                                                />
                                            )}
                                        />
                                    </Fragment>
                                );
                            })}
                            {!isReadOnly ? (
                                <BoardSceneEndTarget
                                    group={act.key}
                                    label={endLabel}
                                    onAdd={() => openComposer(actBlockId, null, endLabel)}
                                >
                                    {newComposer(null)}
                                </BoardSceneEndTarget>
                            ) : null}
                        </BoardActSection>
                    );
                })}
            </DragDropProvider>
            {deleteActModal}
            {!isReadOnly && (hasActs || hasScenes) ? <BoardAddActButton label="Add act at the end" onPress={() => insertAct(null)} /> : null}
        </BoardLayout>
    );
};
