import {
    BoardArcs,
    BoardEmpty,
    BoardLayout,
    Button,
} from '@stagistic/ui';
import {useMemo} from 'react';

import {useScriptSettingsModal} from '../settings/ScriptSettingsModalContext';
import {useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {BoardLensToolbar} from './BoardLensToolbar';
import {getSceneNumberFormat} from './boardSceneNumberFormat';
import {buildArcsView} from './buildArcsView';
import {useBoardLensData} from './useBoardLensData';
import {useOpenInEditor} from './useOpenInEditor';

/** The Arcs lens: one arc per character over the scenes; editable unless the script is read-only. */
interface BoardArcsLensProps {
    activeLensId: string,
    onSelectLens: (lensId: string) => void,
}

export const BoardArcsLens = ({activeLensId, onSelectLens}: BoardArcsLensProps) => {
    const {isReadOnly} = useScriptReadOnlyState();
    const {effectiveScriptSettingsDraft} = useScriptSettingsModal();
    const openInEditor = useOpenInEditor();
    const {
        source,
        model,
        records,
        metadata,
        selectedIds,
        setSelectedIds,
        filterCharacters,
        hasScenes,
        confirmedCharacterRecords,
    } = useBoardLensData(isReadOnly);

    const view = useMemo(() => buildArcsView({
        model,
        characters: confirmedCharacterRecords,
        displayColorByKey: source.displayColorByKey,
        records,
        filterCharacters,
        selectedIds: new Set(selectedIds),
        sceneNumberFormat: getSceneNumberFormat(effectiveScriptSettingsDraft),
    }), [
        confirmedCharacterRecords,
        effectiveScriptSettingsDraft,
        filterCharacters,
        model,
        records,
        selectedIds,
        source.displayColorByKey,
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
                    <BoardEmpty>No scenes yet.</BoardEmpty>
                )
                : (
                    <BoardArcs
                        acts={view.acts}
                        arcs={view.arcs}
                        onSetPoint={metadata?.setArcPoint}
                        onRemovePoint={metadata?.removeArcPoint}
                        characterActions={metadata?.characterActions}
                    />
                )}
        </BoardLayout>
    );
};
