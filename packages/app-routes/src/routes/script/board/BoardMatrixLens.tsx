import {
    BoardEmpty,
    BoardLayout,
    BoardMatrix,
    BoardSceneComposer,
    Button,
} from '@stagistic/ui';
import {
    useMemo,
    useRef,
    useState,
} from 'react';

import {useScriptSettingsModal} from '../settings/ScriptSettingsModalContext';
import {useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';
import {resolveBoardInsertionTarget} from './boardInsertionTargets';
import {BoardLensToolbar} from './BoardLensToolbar';
import {getSceneNumberFormat} from './boardSceneNumberFormat';
import {buildMatrixView} from './buildMatrixView';
import {useBoardLensData} from './useBoardLensData';
import {useOpenInEditor} from './useOpenInEditor';

/** The Matrix lens: characters by scenes. */
interface BoardMatrixLensProps {
    activeLensId: string,
    onSelectLens: (lensId: string) => void,
}

export const BoardMatrixLens = ({activeLensId, onSelectLens}: BoardMatrixLensProps) => {
    const {documentSession} = useScriptWorkspace();
    const {isReadOnly} = useScriptReadOnlyState();
    const {effectiveScriptSettingsDraft} = useScriptSettingsModal();
    const openInEditor = useOpenInEditor();
    const {
        source,
        model,
        cardRecords,
        metadata,
        selectedIds,
        setSelectedIds,
        filterCharacters,
        hasScenes,
        confirmedCharacterRecords,
    } = useBoardLensData(isReadOnly);

    const composerReturnLabel = useRef<string | null>(null);
    const [composer, setComposer] = useState<boolean>(false);

    const cancelComposer = () => {
        setComposer(false);
        requestAnimationFrame(() => {
            [...document.querySelectorAll<HTMLElement>('button')].find(button => button.getAttribute('aria-label') === composerReturnLabel.current)?.focus();
        });
    };

    const view = useMemo(() => buildMatrixView({
        model,
        characters: confirmedCharacterRecords,
        displayColorByKey: source.displayColorByKey,
        getStartPage: source.getStartPage,
        records: cardRecords,
        filterCharacters,
        selectedIds: new Set(selectedIds),
    }), [
        confirmedCharacterRecords,
        filterCharacters,
        model,
        cardRecords,
        selectedIds,
        source.displayColorByKey,
        source.getStartPage,
    ]);

    return (
        <BoardLayout
            toolbar={(
                <BoardLensToolbar
                    activeLensId={activeLensId}
                    onSelectLens={onSelectLens}
                    filterCharacters={filterCharacters}
                    selectedCharacterIds={selectedIds}
                    onSelectedCharacterIdsChange={characterIds => setSelectedIds(characterIds)}
                />
            )}
        >
            {!hasScenes ?
                isReadOnly ? (
                    <BoardEmpty action={<Button variant="secondary" onPress={() => openInEditor()}>Open Editor</Button>}>
                        No scenes yet.
                    </BoardEmpty>
                ) : (
                    <BoardEmpty
                        action={(
                            <Button
                                variant="secondary"
                                onPress={() => {
                                    composerReturnLabel.current = 'Add scene';
                                    setComposer(true);
                                }}
                            >
                                Add scene
                            </Button>
                        )}
                    >
                        {composer ? (
                            <BoardSceneComposer
                                onCancel={cancelComposer}
                                onSubmit={title => {
                                    const target = resolveBoardInsertionTarget(source.index, null, null);

                                    if (!target) return false;

                                    documentSession.commands.insertScene(target.beforeBlockId, title);
                                    setComposer(false);

                                    return true;
                                }}
                            />
                        ) :
                            'No scenes yet.'}
                    </BoardEmpty>
                )
                : (
                    <BoardMatrix
                        acts={view.acts}
                        rows={view.rows}
                        characterActions={metadata?.characterActions}
                        onAdd={metadata ? (characterId, column) => metadata.addCharacter(column.headingBlockId, characterId) : undefined}
                        sceneNumberFormat={getSceneNumberFormat(effectiveScriptSettingsDraft)}
                    />
                )}
        </BoardLayout>
    );
};
