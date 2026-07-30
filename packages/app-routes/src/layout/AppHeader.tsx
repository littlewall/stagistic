import {
    AppHeader as UIAppHeader,
    type AppHeaderProps as UIAppHeaderProps,
    ScriptEditorAppHeader as UIScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps as UIScriptEditorAppHeaderProps,
    type ScriptView,
} from '@stagistic/ui';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../global-modals/GlobalModalsProvider';

type AppHeaderProps = Pick<UIAppHeaderProps, 'contentInset' | 'isFullWidth'> & {
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
    'onHome' | 'onSelectScript' | 'onSelectView'
>;

export const ScriptEditorAppHeader = (props: ScriptEditorAppHeaderProps) => {
    const navigate = useNavigate();

    return (
        <UIScriptEditorAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onSelectScript={script => void navigate(`/script/${script.id}/editor`)}
            onSelectView={(view: ScriptView) => void navigate(`/script/${props.currentScript.id}/${view}`)}
        />
    );
};
