import {getScriptSnapshotLabel, useScriptRepository} from '@stagistic/app-core';
import {AppLayout, LoaderOverlay} from '@stagistic/ui';
import {useCallback, useMemo} from 'react';
import {
    Navigate,
    useNavigate,
    useParams,
} from 'react-router-dom';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import {useDocumentTitle} from '../../shared/useDocumentTitle';
import {DEFAULT_BOARD_LENS_ID, isBoardLensId} from './board/boardLenses';
import {BoardWall} from './board/BoardWall';
import {useScriptEditorHeaderActions} from './editor/useScriptEditorHeaderActions';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalContext';
import {useScriptStateControls} from './states/useScriptStateControls';
import {getScriptBasePath, useScriptAccess} from './workspace/ScriptAccessContext';
import {useScriptCharacters} from './workspace/ScriptCharactersContext';
import {useScriptWorkspace} from './workspace/ScriptWorkspaceContext';

const ScriptBoardPage = ({lensId}: {lensId: string}) => {
    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {
        currentScript,
        currentScriptId,
        handleManualSave,
    } = useScriptWorkspace();
    const {getEditorValue} = useScriptCharacters();
    const {
        isReadOnly,
        snapshot,
        liveScriptTitle,
        basePath,
    } = useScriptAccess();
    const {
        openSettingsModal,
        openAttributeManagerModal,
        scriptTitleDraft,
        updateScriptTitle,
        titlePageDraft,
    } = useScriptSettingsModal();
    const shownTitle = isReadOnly ? liveScriptTitle ?? scriptTitleDraft : scriptTitleDraft;
    // Downloads of a saved draft or version carry its label, as in Export.
    const fileTitle = snapshot ? `${shownTitle} – ${getScriptSnapshotLabel(snapshot)}` : shownTitle;
    const scriptStateControls = useScriptStateControls({scriptId: currentScript?.id ?? null, view: 'board'});

    useDocumentTitle(currentScript ? `Board · ${fileTitle}` : 'Board');

    const boardPath = `${basePath ?? getScriptBasePath(currentScriptId ?? '')}/board`;
    const openLens = useCallback((nextLensId: string) => void navigate(`${boardPath}/${nextLensId}`), [boardPath, navigate]);
    const flushScript = useCallback(async () => {
        const editorValue = getEditorValue();

        if (!editorValue || !await handleManualSave(editorValue)) {
            throw new Error('Could not flush script before export.');
        }
    }, [getEditorValue, handleManualSave]);
    const downloadableScript = useMemo(() => currentScript ? {...currentScript, name: fileTitle} : null, [currentScript, fileTitle]);
    const {handleMenuAction, isPreparingPackage} = useScriptEditorHeaderActions({
        navigate,
        currentScript: downloadableScript,
        openSettingsModal,
        openAttributeManagerModal,
        getEditorValue,
        titlePage: titlePageDraft,
        scriptRepository,
        flushScript,
    });

    return (
        <AppLayout
            footer={null}
            header={
                currentScript ? (
                    <ScriptEditorAppHeader
                        currentScript={{...currentScript, name: shownTitle}}
                        onMenuAction={handleMenuAction}
                        onRenameScript={isReadOnly ? undefined : updateScriptTitle}
                        activeView="board"
                        scriptState={scriptStateControls.stateMenu}
                    />
                ) : null
            }
        >
            {isPreparingPackage ? <LoaderOverlay variant="scrim" label="Preparing package" messages={[]} /> : null}
            {currentScriptId ? <BoardWall activeLensId={lensId} onSelectLens={openLens} /> : null}
            {scriptStateControls.modals}
        </AppLayout>
    );
};

/** `/board/:lens`: an unknown lens falls back to the default one. */
export const ScriptBoardRoute = () => {
    const {lens} = useParams();
    const {currentScriptId} = useScriptWorkspace();
    const {basePath} = useScriptAccess();

    if (!isBoardLensId(lens)) {
        return <Navigate to={`${basePath ?? getScriptBasePath(currentScriptId ?? '')}/board/${DEFAULT_BOARD_LENS_ID}`} replace />;
    }

    return <ScriptBoardPage lensId={lens} />;
};
