import {
    AppHeader as UIAppHeader,
    type AppHeaderProps as UIAppHeaderProps,
    ScriptEditorAppHeader as UIScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps as UIScriptEditorAppHeaderProps,
    type ScriptView,
} from '@stagistic/ui';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../global-modals/GlobalModalsProvider';
import {getScriptBasePath, useScriptReadOnlyState} from '../routes/script/workspace/ScriptAccessContext';

type AppHeaderProps = Pick<UIAppHeaderProps, 'contentInset' | 'isFullWidth' | 'scriptControls'> & {
    showScriptActions?: boolean,
};

export const AppHeader = ({
    showScriptActions = true,
    ...props
}: AppHeaderProps) => {
    const navigate = useNavigate();
    const {openNewScript, openImportScript} = useGlobalModals();

    return (
        <UIAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onNewScript={showScriptActions ? openNewScript : undefined}
            onImportScript={showScriptActions ? openImportScript : undefined}
        />
    );
};

type ScriptEditorAppHeaderProps = Omit<
    UIScriptEditorAppHeaderProps,
    'onHome' | 'onSelectView'
>;

export const ScriptEditorAppHeader = (props: ScriptEditorAppHeaderProps) => {
    const navigate = useNavigate();
    const {basePath} = useScriptReadOnlyState();

    return (
        <UIScriptEditorAppHeader
            {...props}
            onHome={() => void navigate('/')}
            // A saved draft or version keeps its own path when switching between Editor and Export.
            onSelectView={(view: ScriptView) => void navigate(`${basePath ?? getScriptBasePath(props.currentScript.id)}/${view}`)}
        />
    );
};
