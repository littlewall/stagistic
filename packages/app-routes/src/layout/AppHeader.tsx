import {
    AppHeader as UIAppHeader,
    type AppHeaderProps as UIAppHeaderProps,
    ScriptEditorAppHeader as UIScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps as UIScriptEditorAppHeaderProps,
} from '@stagistic/ui';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../global-modals/GlobalModalsProvider';

type AppHeaderProps = Pick<UIAppHeaderProps, 'onMenuAction' | 'isFullWidth'>;

export const AppHeader = (props: AppHeaderProps) => {
    const navigate = useNavigate();
    const {openNewScript, openImportScript} = useGlobalModals();

    return (
        <UIAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onNewScript={openNewScript}
            onImportScript={openImportScript}
        />
    );
};

type ScriptEditorAppHeaderProps = Omit<
    UIScriptEditorAppHeaderProps,
    'onHome' | 'onNewScript' | 'onImportScript' | 'onSelectScript'
>;

export const ScriptEditorAppHeader = (props: ScriptEditorAppHeaderProps) => {
    const navigate = useNavigate();
    const {openNewScript, openImportScript} = useGlobalModals();

    return (
        <UIScriptEditorAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onNewScript={openNewScript}
            onImportScript={openImportScript}
            onSelectScript={script => void navigate(`/script/${script.id}/editor`)}
        />
    );
};
