import {
    BoardEmpty,
    BoardLayout,
    BoardRundown,
    Button,
} from '@stagistic/ui';
import {useMemo} from 'react';

import {useScriptSettingsModal} from '../settings/ScriptSettingsModalContext';
import {useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {useScriptCharacters} from '../workspace/ScriptCharactersContext';
import {BoardLensToolbar} from './BoardLensToolbar';
import {getSceneNumberFormat} from './boardSceneNumberFormat';
import {buildRundownView} from './buildRundownView';
import {useBlockPages} from './useBlockPages';
import {useBoardLensData} from './useBoardLensData';
import {useOpenInEditor} from './useOpenInEditor';

/** The Rundown lens: acts, scenes and songs top to bottom; read-only, a row opens the Editor. */
interface BoardRundownLensProps {
    activeLensId: string,
    onSelectLens: (lensId: string) => void,
}

export const BoardRundownLens = ({activeLensId, onSelectLens}: BoardRundownLensProps) => {
    const {isReadOnly} = useScriptReadOnlyState();
    const {effectiveScriptSettingsDraft} = useScriptSettingsModal();
    const {confirmedGroupRecords} = useScriptCharacters();
    const openInEditor = useOpenInEditor();
    const getBlockPages = useBlockPages();
    const {
        source,
        model,
        cardRecords,
        selectedIds,
        setSelectedIds,
        filterCharacters,
        hasScenes,
        confirmedCharacterRecords,
    } = useBoardLensData(isReadOnly);

    const view = useMemo(() => buildRundownView({
        model,
        index: source.index,
        catalog: {characters: confirmedCharacterRecords, groups: confirmedGroupRecords},
        characters: confirmedCharacterRecords,
        displayColorByKey: source.displayColorByKey,
        records: cardRecords,
        selectedIds: new Set(selectedIds),
        getBlockPages: getBlockPages,
    }), [
        cardRecords,
        confirmedCharacterRecords,
        confirmedGroupRecords,
        model,
        selectedIds,
        source.displayColorByKey,
        getBlockPages,
        source.index,
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
                <BoardEmpty action={isReadOnly ? <Button variant="secondary" onPress={() => openInEditor()}>Open Editor</Button> : undefined}>No scenes yet.</BoardEmpty>
                : view.acts.length === 0 && view.preSceneSongs.length === 0 ?
                    <BoardEmpty>No scenes for the selected characters.</BoardEmpty>
                    : (
                        <BoardRundown
                            acts={view.acts}
                            preSceneSongs={view.preSceneSongs}
                            onOpen={openInEditor}
                            sceneNumberFormat={getSceneNumberFormat(effectiveScriptSettingsDraft)}
                        />
                    )}
        </BoardLayout>
    );
};
