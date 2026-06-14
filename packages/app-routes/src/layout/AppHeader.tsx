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
    const {openNewScript} = useGlobalModals();

    /*
     * Script import is disabled (phase 2). The menu entry is omitted by not
     * passing onImportScript; the modal itself remains wired but unreachable.
     */
    return (
        <UIAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onNewScript={openNewScript}
        />
    );
};

type ScriptEditorAppHeaderProps = Omit<
    UIScriptEditorAppHeaderProps,
    'onHome' | 'onNewScript' | 'onImportScript' | 'onSelectScript'
>;

export const ScriptEditorAppHeader = (props: ScriptEditorAppHeaderProps) => {
    const navigate = useNavigate();
    const {openNewScript} = useGlobalModals();

    // Script import is disabled (phase 2) — onImportScript is intentionally omitted.
    return (
        <UIScriptEditorAppHeader
            {...props}
            onHome={() => void navigate('/')}
            onNewScript={openNewScript}
            onSelectScript={script => void navigate(`/script/${script.id}/editor`)}
        />
    );
};
